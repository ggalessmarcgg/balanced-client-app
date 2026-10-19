// Stato della pagina Oggi: lettura all'apertura e al ritorno in primo piano, modifiche locali, salvataggio della
// bozza alla chiusura/cambio di blocco, all'uscita e quando l'app va in secondo piano (mai a ogni tasto),
// condivisione una volta sola, nuovo tentativo dopo un errore. Nessuna rilettura dopo una scrittura: si aggiorna la cache.
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { aggiornaDiario, type DiarioLocale } from '@/core/diario/bozza';
import { dataOggiRoma } from '@/core/diario/data';
import type { RigaSettimana } from '@/core/diario/letture';
import { bloccoSuccessivo, type Blocco, type Diario } from '@/core/diario/modello';
import { condividiDiario, leggiDiarioOggi, salvaBozza, salvaCache, type EsitoScrittura } from '@/servizi/diario';

export type FaseDiario = { tipo: 'caricamento' } | { tipo: 'rete' } | { tipo: 'errore'; messaggio: string } | { tipo: 'pronto' };
export type NotificaDiario = { tipo: 'conferma'; testo: string } | { tipo: 'errore'; testo: string; riprova: boolean };

export type StatoPaginaOggi = {
  fase: FaseDiario;
  locale: DiarioLocale | null;
  settimana: RigaSettimana[];
  /** Blocco aperto del diario; null = card chiusa (da iniziare, in bozza o condivisa). */
  blocco: Blocco | null;
  inviando: boolean;
  notifica: NotificaDiario | null;
};

export type AzioniPaginaOggi = {
  carica: () => void;
  scrivi: () => void;
  chiudi: () => void;
  avanti: () => void;
  aggiorna: (diario: Diario) => void;
  condividi: () => void;
  riprova: () => void;
  nascondiNotifica: () => void;
};

const TESTI = {
  condiviso: 'Giornata condivisa con la tua nutrizionista.',
  giaCondiviso: 'La giornata era già stata condivisa.',
  erroreRete: 'Sei offline: le modifiche sono salvate sul telefono.',
  erroreAltro: 'Non siamo riusciti a salvare il diario.',
} as const;

function notificaDi(esito: EsitoScrittura, condivisione: boolean): NotificaDiario | null {
  if (esito.tipo === 'ok') return condivisione ? { tipo: 'conferma', testo: TESTI.condiviso } : null;
  if (esito.tipo === 'giaCondiviso') return { tipo: 'conferma', testo: TESTI.giaCondiviso };
  return { tipo: 'errore', testo: esito.errore === 'rete' ? TESTI.erroreRete : TESTI.erroreAltro, riprova: true };
}

export function useDiario(clientId: string): StatoPaginaOggi & AzioniPaginaOggi {
  const [fase, setFase] = useState<FaseDiario>({ tipo: 'caricamento' });
  const [locale, setLocale] = useState<DiarioLocale | null>(null);
  const [settimana, setSettimana] = useState<RigaSettimana[]>([]);
  const [blocco, setBlocco] = useState<Blocco | null>(null);
  const [inviando, setInviando] = useState(false);
  const [notifica, setNotifica] = useState<NotificaDiario | null>(null);

  // Ultima copia locale, leggibile dai gestori di AppState e di smontaggio senza richiudere lo stato.
  const localeRef = useRef<DiarioLocale | null>(null);
  const settimanaRef = useRef<RigaSettimana[]>([]);
  const scritturaInCorso = useRef<Promise<unknown>>(Promise.resolve());
  const montato = useRef(true);

  const impostaLocale = useCallback((nuovo: DiarioLocale) => {
    localeRef.current = nuovo;
    if (montato.current) setLocale(nuovo);
    salvaCache({ locale: nuovo, settimana: settimanaRef.current });
  }, []);

  /** Salvataggio della bozza (serializzato: una scrittura alla volta). */
  const salva = useCallback(
    (mostraErrore: boolean): Promise<void> => {
      const esecuzione = scritturaInCorso.current.then(async () => {
        const attuale = localeRef.current;
        if (!attuale || !attuale.inAttesa) return;
        const { locale: dopo, esito } = await salvaBozza(attuale);
        // Se nel frattempo il contenuto locale è cambiato, si tengono le modifiche più recenti con la riga aggiornata.
        const corrente = localeRef.current;
        impostaLocale(corrente && corrente !== attuale ? aggiornaDiario({ ...corrente, riga: dopo.riga, errore: dopo.errore }, corrente.diario) : dopo);
        const n = notificaDi(esito, false);
        if (n && mostraErrore && montato.current) setNotifica(n);
      });
      scritturaInCorso.current = esecuzione.catch(() => {});
      return esecuzione;
    },
    [impostaLocale],
  );

  const carica = useCallback(() => {
    let attivo = true;
    (async () => {
      // Una bozza in attesa di ieri (giorno cambiato) si prova a salvare prima di passare a oggi.
      const precedente = localeRef.current;
      if (precedente?.inAttesa && precedente.data !== dataOggiRoma(new Date())) await salva(false);
      const esito = await leggiDiarioOggi(clientId);
      if (!attivo || !montato.current) return;
      switch (esito.tipo) {
        case 'ok':
          localeRef.current = esito.dati.locale;
          settimanaRef.current = esito.dati.settimana;
          setLocale(esito.dati.locale);
          setSettimana(esito.dati.settimana);
          setFase({ tipo: 'pronto' });
          if (esito.dati.locale.riga.tipo === 'condiviso') setBlocco(null);
          // Una copia locale in attesa (errore precedente o offline) riparte appena c'è rete.
          if (esito.dati.locale.inAttesa && !esito.daCache) void salva(true);
          break;
        case 'nonAutenticato':
        case 'errore':
          if (localeRef.current) break; // dati già a schermo: non si sostituiscono con un errore
          setFase({ tipo: 'errore', messaggio: esito.tipo === 'errore' ? esito.messaggio : 'Sessione non valida' });
          break;
        case 'rete':
          if (localeRef.current) break;
          setFase({ tipo: 'rete' });
          break;
      }
    })();
    return () => {
      attivo = false;
    };
  }, [clientId, salva]);

  // Prima lettura, riletture al ritorno in primo piano, salvataggio quando l'app va in secondo piano e all'uscita.
  useEffect(() => {
    montato.current = true;
    const annulla = carica();
    const sub = AppState.addEventListener('change', (stato: AppStateStatus) => {
      if (stato === 'active') carica();
      else if (stato === 'background' || stato === 'inactive') void salva(false);
    });
    return () => {
      montato.current = false;
      annulla();
      sub.remove();
      void salva(false);
    };
  }, [carica, salva]);

  const scrivi = useCallback(() => {
    if (localeRef.current?.riga.tipo === 'condiviso') return;
    setBlocco('pasti');
  }, []);

  const chiudi = useCallback(() => {
    setBlocco(null);
    void salva(true);
  }, [salva]);

  const avanti = useCallback(() => {
    setBlocco((b) => (b ? bloccoSuccessivo(b) : null));
    void salva(true);
  }, [salva]);

  const aggiorna = useCallback(
    (diario: Diario) => {
      const attuale = localeRef.current;
      if (!attuale) return;
      impostaLocale(aggiornaDiario(attuale, diario));
    },
    [impostaLocale],
  );

  const condividi = useCallback(() => {
    const attuale = localeRef.current;
    if (!attuale || inviando) return;
    setInviando(true);
    const esecuzione = scritturaInCorso.current.then(async () => {
      const { locale: dopo, esito } = await condividiDiario(localeRef.current ?? attuale);
      impostaLocale(dopo);
      if (!montato.current) return;
      setInviando(false);
      setNotifica(notificaDi(esito, true));
      if (esito.tipo !== 'errore') setBlocco(null);
    });
    scritturaInCorso.current = esecuzione.catch(() => {
      if (montato.current) setInviando(false);
    });
  }, [impostaLocale, inviando]);

  const riprova = useCallback(() => {
    setNotifica(null);
    void salva(true);
  }, [salva]);

  const nascondiNotifica = useCallback(() => setNotifica(null), []);

  return { fase, locale, settimana, blocco, inviando, notifica, carica, scrivi, chiudi, avanti, aggiorna, condividi, riprova, nascondiNotifica };
}
