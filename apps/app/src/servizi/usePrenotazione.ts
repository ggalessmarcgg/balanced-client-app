// Hook degli stati C e D (step 12): pannello di scelta dell'orario, lettura degli orari, conferma e traduzione
// degli esiti in navigazione e schermate (decisioni 3–7 dello step 12). Nessuna scrittura diretta: scrive solo la
// funzione del database chiamata da servizi/prenotazione.ts. Le transizioni del pannello sono pure in
// core/prenotazione/pannello.ts: la scelta dell'orario è sempre in due passaggi ("Conferma orario" aggiorna solo la
// card; prenota soltanto "Conferma la consulenza").
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { TESTI_CONFERMA, type MotivoPannello } from '@/core/prenotazione/conferma';
import type { OrarioDisponibile, StatoOrari } from '@/core/prenotazione/orari';
import { apriPannello, chiudiPannello, confermaOrario, dopoEsitoConferma, esitoRiapreIlPannello, orarioDaConfermare, orariLetti, scegliOrario, slotMostrato, STATO_PANNELLO_INIZIALE, varianteSchermata, type SlotMostrato } from '@/core/prenotazione/pannello';
import type { StatoCliente } from '@/core/stato/stato';
import { confermaConsulenza, inviaEmailConferma, leggiOrari } from '@/servizi/prenotazione';
import { impostaStatoConfermato } from '@/servizi/statoCliente';

export type StatoPrenotazione = Extract<StatoCliente, { codice: 'C' | 'D' }>;

export type Pannello = { aperto: boolean; motivo: MotivoPannello };

export type Prenotazione = {
  /** "daConfermare": card con l'orario (del lead o scelto nel pannello), "Conferma la consulenza" + "Modifica"; "orarioPassato": card barrata. */
  variante: 'daConfermare' | 'orarioPassato';
  /** Orario mostrato nella card: quello scelto nel pannello (solo in memoria) o quello del lead. */
  slot: SlotMostrato;
  pannello: Pannello;
  orari: StatoOrari;
  scheda: number;
  scelta: OrarioDisponibile | null;
  confermando: boolean;
  avviso: { chiave: number; testo: string } | null;
  onConferma: () => void;
  onModifica: () => void;
  onScegliNuovo: () => void;
  onChiudiPannello: () => void;
  onScheda: (scheda: number) => void;
  onOrario: (orario: OrarioDisponibile) => void;
  onConfermaOrario: () => void;
  onRiprovaOrari: () => void;
  nascondiAvviso: () => void;
};

export function usePrenotazione(statoCliente: StatoPrenotazione): Prenotazione {
  const router = useRouter();
  const clientId = statoCliente.profilo.clientId;
  const nutritionistId = statoCliente.profilo.nutrizionista?.id ?? null;
  const [stato, setStato] = useState(STATO_PANNELLO_INIZIALE);
  const [orari, setOrari] = useState<StatoOrari>({ tipo: 'caricamento' });
  const [scheda, setScheda] = useState(0);
  const [confermando, setConfermando] = useState(false);
  const [avviso, setAvviso] = useState<{ chiave: number; testo: string } | null>(null);
  const [letturaOrari, setLetturaOrari] = useState(0);
  const montato = useRef(true);
  useEffect(() => {
    montato.current = true;
    return () => {
      montato.current = false;
    };
  }, []);

  // Una lettura a ogni apertura del pannello (e su "Riprova" / dopo un esito che lo riapre, che incrementano il contatore); mai al cambio di scheda.
  const aperto = stato.pannello.aperto;
  useEffect(() => {
    if (!aperto) return;
    let attivo = true;
    // Lo stato "caricamento" lo imposta chi fa partire la lettura (apertura, Riprova, esito della conferma).
    // Senza nutrizionista assegnata non ci sono orari da leggere: variante "Nessun orario" con il supporto.
    const lettura = nutritionistId ? leggiOrari(nutritionistId) : Promise.resolve({ tipo: 'ok' as const, orari: [] });
    lettura.then((esito) => {
      if (!attivo) return;
      if (esito.tipo === 'ok') {
        setOrari({ tipo: 'pronto', orari: esito.orari });
        setStato((s) => orariLetti(s, esito.orari));
      } else setOrari({ tipo: 'errore' });
    });
    return () => {
      attivo = false;
    };
  }, [aperto, nutritionistId, letturaOrari]);

  const rileggiOrari = useCallback(() => {
    setOrari({ tipo: 'caricamento' });
    setLetturaOrari((n) => n + 1);
  }, []);
  const apri = useCallback(
    (motivo: MotivoPannello) => {
      setScheda(0);
      rileggiOrari();
      setStato((s) => apriPannello(s, motivo));
    },
    [rileggiOrari],
  );
  const onModifica = useCallback(() => apri('modifica'), [apri]);
  const onScegliNuovo = useCallback(() => apri('orarioPassato'), [apri]);
  const onChiudiPannello = useCallback(() => setStato(chiudiPannello), []);
  const onOrario = useCallback((orario: OrarioDisponibile) => setStato((s) => scegliOrario(s, orario)), []);
  /** "Conferma orario": l'orario passa nella card e il pannello si chiude; nessuna chiamata, in ogni motivo. */
  const onConfermaOrario = useCallback(() => setStato(confermaOrario), []);
  const onRiprovaOrari = rileggiOrari;
  const nascondiAvviso = useCallback(() => setAvviso(null), []);

  /** "Conferma la consulenza": l'orario in memoria (scelto nel pannello) oppure quello del lead. */
  const onConferma = useCallback(async () => {
    if (confermando) return;
    setConfermando(true);
    const esito = await confermaConsulenza(clientId, orarioDaConfermare(stato));
    if (!montato.current) return;
    setConfermando(false);
    switch (esito.tipo) {
      case 'confermata':
        // Schermata G, poi le due email della web app in sottofondo (una sola volta per appuntamento).
        impostaStatoConfermato(esito.appuntamento);
        inviaEmailConferma(esito.appuntamento.id);
        router.replace('/stato/prenotato');
        return;
      case 'giaConfermata':
      case 'statoNonValido':
        // Lo stato sul server è cambiato: si rilegge all'avvio e si va alla home dello stato nuovo.
        router.replace('/');
        return;
      case 'errore':
        if (__DEV__) console.warn('[prenotazione] conferma non riuscita', esito.codice);
        setAvviso({ chiave: Date.now(), testo: TESTI_CONFERMA.errore });
        return;
      default:
        // Orario non più disponibile, passato o assente: il pannello si riapre con l'avviso e gli orari si rileggono.
        setStato((s) => dopoEsitoConferma(s, esito));
        if (esitoRiapreIlPannello(esito)) {
          setScheda(0);
          rileggiOrari();
        }
        return;
    }
  }, [clientId, confermando, router, rileggiOrari, stato]);

  const slotLead = statoCliente.slot ? { data: statoCliente.slot.data, ora: statoCliente.slot.ora } : null;
  return {
    variante: varianteSchermata(statoCliente.codice, stato),
    slot: slotMostrato(slotLead, stato),
    pannello: stato.pannello,
    orari,
    scheda,
    scelta: stato.scelta,
    confermando,
    avviso,
    onConferma: () => void onConferma(),
    onModifica,
    onScegliNuovo,
    onChiudiPannello,
    onScheda: setScheda,
    onOrario,
    onConfermaOrario,
    onRiprovaOrari,
    nascondiAvviso,
  };
}
