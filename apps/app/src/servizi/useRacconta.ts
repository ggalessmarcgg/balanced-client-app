// Schermata "Racconta": possiede il registratore (expo-audio) e lo collega al flusso condiviso (servizi/racconta.ts).
// Registrazione mono AAC a 24 kHz / 48 kbit/s nella cartella documenti (mai in cache), limite di 3 minuti con arresto
// automatico, lettura del tempo e del livello ogni 100 ms (INTERVALLO_LETTURA_MS), pausa quando l'app va in secondo piano e ripresa al rientro
// (le interruzioni di sistema, es. una chiamata, mettono in pausa il registratore da sole e la lettura le mostra).
// La trascrizione parte solo dal pulsante "Da inviare" (decisione del 23/10/2026); uscire con una registrazione in
// corso o terminata e non inviata chiede conferma con l'avviso di sistema (usePreventRemove di expo-router: freccia,
// gesto e tasto indietro di Android passano tutti da lì). All'uscita dalla schermata il registratore si ferma sempre
// e il flusso non resta mai in una registrazione senza registratore.
import { AudioModule, AudioQuality, IOSOutputFormat, setAudioModeAsync, useAudioRecorder, useAudioRecorderState, type RecordingOptions, type RecordingStatus } from 'expo-audio';
import { usePreventRemove } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, Linking, type AppStateStatus } from 'react-native';

import { dataOggiRoma } from '@/core/diario/data';
import { nomeFileRegistrazione } from '@/core/racconta/attesa';
import { INTERVALLO_LETTURA_MS, LIMITE_REGISTRAZIONE_MS, QUALITA_VOCE } from '@/core/racconta/audio';
import { uscitaBloccata, uscitaDaConfermare, type PermessoMicrofono, type StatoRacconta } from '@/core/racconta/flusso';
import { avviaRacconta, cancellaAudio, collegaRegistratore, interrompiRacconta, invia, registraConsenso, segnaTutorialVisto, statoRacconta, useMemoriaRacconta, type PuntoTutorial } from '@/servizi/racconta';

/** Ogni quanto si riprova la trascrizione mentre si è senza rete (oltre che al ritorno in primo piano). */
const INTERVALLO_RIPROVA_OFFLINE_MS = 15_000;

/** Avviso di sistema prima di uscire con una registrazione da scartare (Alert nativo di iOS e Android, decisione del 23/10/2026). */
export const AVVISO_USCITA = {
  titolo: 'Vuoi interrompere la registrazione?',
  testo: 'La registrazione andrà persa.',
  annulla: 'Annulla',
  interrompi: 'Interrompi',
} as const;

function opzioniRegistrazione(data: string): RecordingOptions {
  return {
    directory: 'document',
    fileName: nomeFileRegistrazione(data),
    isMeteringEnabled: true,
    extension: QUALITA_VOCE.estensione,
    sampleRate: QUALITA_VOCE.campionamentoHz,
    numberOfChannels: QUALITA_VOCE.canali,
    bitRate: QUALITA_VOCE.bitrateBitAlSecondo,
    android: { outputFormat: 'mpeg4', audioEncoder: 'aac' },
    ios: { outputFormat: IOSOutputFormat.MPEG4AAC, audioQuality: AudioQuality.MEDIUM },
    web: { mimeType: 'audio/webm', bitsPerSecond: QUALITA_VOCE.bitrateBitAlSecondo },
  };
}

async function permessoMicrofono(): Promise<PermessoMicrofono> {
  try {
    const p = await AudioModule.getRecordingPermissionsAsync();
    if (p.granted) return 'concesso';
    return p.canAskAgain ? 'daChiedere' : 'negato';
  } catch {
    return 'daChiedere';
  }
}

export type AzioniRacconta = {
  consenti: () => void;
  apriImpostazioni: () => void;
  avvia: () => void;
  ferma: () => void;
  /** "Da inviare" (Registrazione terminata): avvia la trascrizione. */
  invia: () => void;
  riprova: () => void;
  ricomincia: () => void;
  modificaTesto: (testo: string) => void;
  /** "Crea il mio diario": il racconto va al server con la bozza di oggi (lotto 2). */
  creaDiario: () => void;
  /** "Ho capito" del suggerimento del tutorial. */
  hoCapito: () => void;
};

/** Il suggerimento del tutorial da mostrare in questa schermata (una volta per account), o null. */
export function tutorialDaMostrare(stato: StatoRacconta, visti: Record<PuntoTutorial, boolean>): PuntoTutorial | null {
  if (stato.tipo === 'pronto' && stato.avviso === 'nessuno' && !visti.pronto) return 'pronto';
  if (stato.tipo === 'terminata' && !visti.terminata) return 'terminata';
  if (stato.tipo === 'racconto' && !visti.racconto) return 'racconto';
  return null;
}

/**
 * Stato e azioni della schermata. `clientId` è quello dello stato letto all'avvio; il giorno del diario è quello
 * italiano al momento dell'apertura.
 */
export function useRacconta(clientId: string): { stato: StatoRacconta; tutorial: PuntoTutorial | null; azioni: AzioniRacconta } {
  const { stato, tutorialVisti } = useMemoriaRacconta();
  const [data] = useState(() => dataOggiRoma(new Date()));
  const ultimaDurata = useRef(0);
  const inRegistrazione = useRef(false);
  const inPausaPerSfondo = useRef(false);
  /** Vero dopo lo smontaggio: un avvio ancora in preparazione non deve più partire. */
  const smontata = useRef(false);

  const onStatus = useCallback(
    (s: RecordingStatus) => {
      if (s.hasError) {
        invia({ tipo: 'registrazioneNonRiuscita' });
        return;
      }
      // Fine della registrazione (stop del cliente, limite nativo o di sistema): il file è pronto.
      if (s.isFinished && s.url && inRegistrazione.current) {
        inRegistrazione.current = false;
        invia({ tipo: 'registrata', audio: { uri: s.url, durataMs: ultimaDurata.current, data } });
      }
    },
    [data],
  );
  const recorder = useAudioRecorder(opzioniRegistrazione(data), onStatus);
  const lettura = useAudioRecorderState(recorder, INTERVALLO_LETTURA_MS);

  /**
   * Ferma e scarta una registrazione in corso (uscita confermata, smontaggio). Lo stop parte in modo sincrono, mentre
   * il registratore è ancora vivo (expo-audio lo rilascia subito dopo le pulizie degli effetti).
   */
  const scartaRegistrazione = useCallback(async () => {
    if (!inRegistrazione.current) return;
    inRegistrazione.current = false;
    let uri: string | null = null;
    let arresto: Promise<unknown> = Promise.resolve();
    try {
      uri = recorder.uri;
      arresto = recorder.stop();
    } catch {
      // registratore già rilasciato
    }
    await arresto.catch(() => {});
    if (uri) await cancellaAudio(uri);
    await setAudioModeAsync({ allowsRecording: false }).catch(() => {});
  }, [recorder]);

  // Il registratore si collega al flusso: gli effetti della macchina a stati lo comandano da qui.
  useEffect(
    () =>
      collegaRegistratore({
        chiediPermesso: async () => {
          await registraConsenso();
          const p = await AudioModule.requestRecordingPermissionsAsync();
          return p.granted;
        },
        avvia: async () => {
          await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true, interruptionMode: 'doNotMix' });
          await recorder.prepareToRecordAsync();
          if (smontata.current) throw new Error('schermata chiusa');
          ultimaDurata.current = 0;
          inRegistrazione.current = true;
          inPausaPerSfondo.current = false;
          recorder.record({ forDuration: LIMITE_REGISTRAZIONE_MS / 1000 });
        },
        ferma: async () => {
          await recorder.stop();
          const uri = recorder.uri;
          if (uri && inRegistrazione.current) {
            inRegistrazione.current = false;
            invia({ tipo: 'registrata', audio: { uri, durataMs: ultimaDurata.current, data } });
          }
          await setAudioModeAsync({ allowsRecording: false }).catch(() => {});
        },
        pausa: () => recorder.pause(),
        riprendi: () => recorder.record(),
      }),
    [recorder, data],
  );

  // Lettura periodica: tempo, se sta registrando (una chiamata lo mette in pausa da sola) e livello in dB.
  useEffect(() => {
    if (!inRegistrazione.current) return;
    ultimaDurata.current = Math.max(ultimaDurata.current, lettura.durationMillis);
    invia({ tipo: 'avanzamento', durataMs: lettura.durationMillis, registrando: lettura.isRecording, livelloDb: lettura.metering });
  }, [lettura.durationMillis, lettura.isRecording, lettura.metering]);

  // Avvio; allo smontaggio (per qualunque motivo) una registrazione ancora in corso si ferma, si scarta e il flusso
  // riparte dall'avvio: al rientro non resta mai una registrazione "bloccata" senza registratore.
  useEffect(() => {
    smontata.current = false;
    void avviaRacconta(clientId, permessoMicrofono);
    return () => {
      smontata.current = true;
      void scartaRegistrazione();
      invia({ tipo: 'uscita' });
    };
  }, [clientId, scartaRegistrazione]);

  // Uscita (freccia indietro, gesto, tasto indietro di Android) con una registrazione da scartare: expo-router blocca
  // la rimozione della schermata e qui compare l'avviso di sistema; solo "Interrompi" scarta l'audio e lascia la
  // schermata. (expo-router 58 non emette più `beforeRemove`: il blocco passa solo da usePreventRemove.)
  // Durante "Preparando il tuo diario" (senza freccia indietro) l'uscita è bloccata in silenzio finché il server non
  // risponde (al più TEMPO_MASSIMO_COMPILAZIONE_MS): il diario compilato va nella bozza di oggi.
  usePreventRemove(uscitaDaConfermare(stato) || uscitaBloccata(stato), ({ repeat }) => {
    if (uscitaBloccata(statoRacconta())) return;
    Alert.alert(AVVISO_USCITA.titolo, AVVISO_USCITA.testo, [
      { text: AVVISO_USCITA.annulla, style: 'cancel' },
      {
        text: AVVISO_USCITA.interrompi,
        style: 'destructive',
        onPress: () => {
          void scartaRegistrazione();
          void interrompiRacconta();
          repeat();
        },
      },
    ]);
  });

  // Secondo piano / schermo bloccato: pausa e ripresa al rientro. Al rientro si ricontrolla anche il permesso
  // (ritorno dalle impostazioni) e, senza rete, si riprova la trascrizione.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s: AppStateStatus) => {
      const attuale = statoRacconta();
      if (s === 'background' || s === 'inactive') {
        if (attuale.tipo === 'registrazione' && !attuale.inPausa) {
          inPausaPerSfondo.current = true;
          invia({ tipo: 'pausa' });
        }
        return;
      }
      if (s !== 'active') return;
      if (attuale.tipo === 'registrazione' && inPausaPerSfondo.current) {
        inPausaPerSfondo.current = false;
        invia({ tipo: 'riprendi' });
      } else if (attuale.tipo === 'microfonoDisattivato' || (attuale.tipo === 'permesso' && !attuale.inRichiesta)) {
        void permessoMicrofono().then((p) => {
          if (p === 'concesso') invia({ tipo: 'permessoRisposto', concesso: true });
        });
      } else if (attuale.tipo === 'senzaConnessione') {
        invia({ tipo: 'riprova', silenzioso: true });
      }
    });
    return () => sub.remove();
  }, []);

  // Senza rete: nuovo tentativo silenzioso a intervalli finché il server non risponde.
  useEffect(() => {
    if (stato.tipo !== 'senzaConnessione') return;
    const timer = setInterval(() => invia({ tipo: 'riprova', silenzioso: true }), INTERVALLO_RIPROVA_OFFLINE_MS);
    return () => clearInterval(timer);
  }, [stato.tipo]);

  const tutorial = tutorialDaMostrare(stato, tutorialVisti);
  const azioni: AzioniRacconta = {
    consenti: useCallback(() => invia({ tipo: 'consenti' }), []),
    apriImpostazioni: useCallback(() => {
      void Linking.openSettings();
    }, []),
    avvia: useCallback(() => invia({ tipo: 'avvia' }), []),
    ferma: useCallback(() => invia({ tipo: 'ferma' }), []),
    invia: useCallback(() => invia({ tipo: 'invia' }), []),
    riprova: useCallback(() => invia({ tipo: 'riprova' }), []),
    ricomincia: useCallback(() => invia({ tipo: 'ricomincia' }), []),
    modificaTesto: useCallback((testo: string) => invia({ tipo: 'modificaTesto', testo }), []),
    creaDiario: useCallback(() => invia({ tipo: 'creaDiario' }), []),
    hoCapito: useCallback(() => {
      const punto = tutorialDaMostrare(statoRacconta(), tutorialVisti);
      if (punto) segnaTutorialVisto(punto);
    }, [tutorialVisti]),
  };

  return { stato, tutorial, azioni };
}
