// Schermata "Racconta": possiede il registratore (expo-audio) e lo collega al flusso condiviso (servizi/racconta.ts).
// Registrazione mono AAC a 24 kHz / 48 kbit/s nella cartella documenti (mai in cache), limite di 3 minuti con arresto
// automatico, lettura del tempo e del livello ogni 250 ms, pausa quando l'app va in secondo piano e ripresa al rientro
// (le interruzioni di sistema, es. una chiamata, mettono in pausa il registratore da sole e la lettura le mostra).
import { AudioModule, AudioQuality, IOSOutputFormat, setAudioModeAsync, useAudioRecorder, useAudioRecorderState, type RecordingOptions, type RecordingStatus } from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, type AppStateStatus } from 'react-native';

import { dataOggiRoma } from '@/core/diario/data';
import { nomeFileRegistrazione } from '@/core/racconta/attesa';
import { INTERVALLO_LETTURA_MS, LIMITE_REGISTRAZIONE_MS, QUALITA_VOCE } from '@/core/racconta/audio';
import { type EventoRacconta, type PermessoMicrofono, type StatoRacconta } from '@/core/racconta/flusso';
import { avviaRacconta, azzeraRacconta, cancellaAudio, collegaRegistratore, invia, registraConsenso, statoRacconta, useStatoRacconta } from '@/servizi/racconta';

/** Ogni quanto si riprova la trascrizione mentre si è senza rete (oltre che al ritorno in primo piano). */
const INTERVALLO_RIPROVA_OFFLINE_MS = 15_000;

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
  riprova: () => void;
  ricomincia: () => void;
  modificaTesto: (testo: string) => void;
};

/**
 * Stato e azioni della schermata. `clientId` è quello dello stato letto all'avvio; il giorno del diario è quello
 * italiano al momento dell'apertura.
 */
export function useRacconta(clientId: string): { stato: StatoRacconta; azioni: AzioniRacconta } {
  const stato = useStatoRacconta();
  const [data] = useState(() => dataOggiRoma(new Date()));
  const ultimaDurata = useRef(0);
  const inRegistrazione = useRef(false);
  const inPausaPerSfondo = useRef(false);

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

  // Avvio e, all'uscita dalla schermata, pulizia: una registrazione in corso si ferma e si scarta.
  useEffect(() => {
    void avviaRacconta(clientId, permessoMicrofono);
    return () => {
      if (inRegistrazione.current) {
        inRegistrazione.current = false;
        const uri = recorder.uri;
        void recorder
          .stop()
          .catch(() => {})
          .then(() => (uri ? cancellaAudio(uri) : undefined));
        void setAudioModeAsync({ allowsRecording: false }).catch(() => {});
        azzeraRacconta();
      }
    };
  }, [clientId, recorder]);

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

  const azioni: AzioniRacconta = {
    consenti: useCallback(() => invia({ tipo: 'consenti' }), []),
    apriImpostazioni: useCallback(() => {
      void Linking.openSettings();
    }, []),
    avvia: useCallback(() => invia({ tipo: 'avvia' }), []),
    ferma: useCallback(() => invia({ tipo: 'ferma' }), []),
    riprova: useCallback(() => invia({ tipo: 'riprova' }), []),
    ricomincia: useCallback(() => invia({ tipo: 'ricomincia' }), []),
    modificaTesto: useCallback((testo: string) => invia({ tipo: 'modificaTesto', testo } satisfies EventoRacconta), []),
  };

  return { stato, azioni };
}
