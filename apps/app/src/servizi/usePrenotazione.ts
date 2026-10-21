// Hook degli stati C e D (step 12): pannello di scelta dell'orario, lettura degli orari, conferma e traduzione
// degli esiti in navigazione e schermate (decisioni 3–7 dello step 12). Nessuna scrittura diretta: scrive solo la
// funzione del database chiamata da servizi/prenotazione.ts.
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { TESTI_CONFERMA, type MotivoPannello } from '@/core/prenotazione/conferma';
import { alternaScelta, sceltaAncoraValida, type OrarioDisponibile, type StatoOrari } from '@/core/prenotazione/orari';
import type { StatoCliente } from '@/core/stato/stato';
import { confermaConsulenza, inviaEmailConferma, leggiOrari } from '@/servizi/prenotazione';
import { impostaStatoConfermato } from '@/servizi/statoCliente';

export type StatoPrenotazione = Extract<StatoCliente, { codice: 'C' | 'D' }>;

export type Pannello = { aperto: boolean; motivo: MotivoPannello };

export type Prenotazione = {
  /** Orario mostrato nella card: quello scelto con "Modifica" (solo in memoria) o quello del lead. */
  slot: { data: string; ora: string } | null;
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

export function usePrenotazione(stato: StatoPrenotazione): Prenotazione {
  const router = useRouter();
  const clientId = stato.profilo.clientId;
  const nutritionistId = stato.profilo.nutrizionista?.id ?? null;
  const [pannello, setPannello] = useState<Pannello>({ aperto: false, motivo: 'modifica' });
  const [orari, setOrari] = useState<StatoOrari>({ tipo: 'caricamento' });
  const [scheda, setScheda] = useState(0);
  const [scelta, setScelta] = useState<OrarioDisponibile | null>(null);
  // Orario scelto con "Modifica" e confermato nel pannello: resta nell'app finché il cliente non conferma la consulenza.
  const [sceltaLocale, setSceltaLocale] = useState<OrarioDisponibile | null>(null);
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

  // Una lettura a ogni apertura del pannello (e su "Riprova" / dopo slot_taken, che incrementano il contatore); mai al cambio di scheda.
  useEffect(() => {
    if (!pannello.aperto) return;
    let attivo = true;
    // Lo stato "caricamento" lo imposta chi fa partire la lettura (apertura, Riprova, esito della conferma).
    // Senza nutrizionista assegnata non ci sono orari da leggere: variante "Nessun orario" con il supporto.
    const lettura = nutritionistId ? leggiOrari(nutritionistId) : Promise.resolve({ tipo: 'ok' as const, orari: [] });
    lettura.then((esito) => {
      if (!attivo) return;
      if (esito.tipo === 'ok') {
        setOrari({ tipo: 'pronto', orari: esito.orari });
        setScelta((attuale) => sceltaAncoraValida(attuale, esito.orari));
      } else setOrari({ tipo: 'errore' });
    });
    return () => {
      attivo = false;
    };
  }, [pannello.aperto, nutritionistId, letturaOrari]);

  const rileggiOrari = useCallback(() => {
    setOrari({ tipo: 'caricamento' });
    setLetturaOrari((n) => n + 1);
  }, []);
  const apri = useCallback(
    (motivo: MotivoPannello) => {
      setScheda(0);
      rileggiOrari();
      setPannello({ aperto: true, motivo });
    },
    [rileggiOrari],
  );
  const onModifica = useCallback(() => apri('modifica'), [apri]);
  const onScegliNuovo = useCallback(() => apri('orarioPassato'), [apri]);
  const onChiudiPannello = useCallback(() => {
    setPannello((p) => ({ ...p, aperto: false }));
    setScelta(null);
  }, []);
  const onOrario = useCallback((orario: OrarioDisponibile) => setScelta((attuale) => alternaScelta(attuale, orario)), []);
  const onRiprovaOrari = rileggiOrari;
  const nascondiAvviso = useCallback(() => setAvviso(null), []);

  const conferma = useCallback(
    async (orario: OrarioDisponibile | null) => {
      if (confermando) return;
      setConfermando(true);
      const esito = await confermaConsulenza(clientId, orario);
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
        case 'nonDisponibile':
          setScelta(null);
          setSceltaLocale(null);
          setPannello({ aperto: true, motivo: 'nonDisponibile' });
          rileggiOrari();
          return;
        case 'orarioPassato':
        case 'senzaOrario':
          setScelta(null);
          setSceltaLocale(null);
          setPannello({ aperto: true, motivo: 'orarioPassato' });
          rileggiOrari();
          return;
        case 'errore':
          if (__DEV__) console.warn('[prenotazione] conferma non riuscita', esito.codice);
          setAvviso({ chiave: Date.now(), testo: TESTI_CONFERMA.errore });
          return;
      }
    },
    [clientId, confermando, router, rileggiOrari],
  );

  /** "Conferma la consulenza" (C): l'orario del lead, oppure quello scelto con "Modifica". */
  const onConferma = useCallback(() => void conferma(sceltaLocale), [conferma, sceltaLocale]);

  /**
   * "Conferma orario" nel pannello: con "Modifica" la scelta resta solo nell'app e la card si aggiorna (decisione 5);
   * negli altri motivi (orario passato, non disponibile) la conferma parte subito con l'orario scelto, come nella web app.
   */
  const onConfermaOrario = useCallback(() => {
    if (!scelta) return;
    if (pannello.motivo === 'modifica') {
      setSceltaLocale(scelta);
      setPannello((p) => ({ ...p, aperto: false }));
      setScelta(null);
      return;
    }
    void conferma(scelta);
  }, [scelta, pannello.motivo, conferma]);

  const slot = sceltaLocale ? { data: sceltaLocale.date, ora: sceltaLocale.time } : stato.codice === 'C' ? { data: stato.slot.data, ora: stato.slot.ora } : stato.slot ? { data: stato.slot.data, ora: stato.slot.ora } : null;

  return { slot, pannello, orari, scheda, scelta, confermando, avviso, onConferma, onModifica, onScegliNuovo, onChiudiPannello, onScheda: setScheda, onOrario, onConfermaOrario, onRiprovaOrari, nascondiAvviso };
}
