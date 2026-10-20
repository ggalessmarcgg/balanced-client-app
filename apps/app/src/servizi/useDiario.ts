// Stato della pagina Oggi: lettura all'apertura e al ritorno in primo piano, modifiche locali, salvataggio della
// bozza alla chiusura/cambio di blocco, all'uscita e quando l'app va in secondo piano (mai a ogni tasto),
// condivisione una volta sola, nuovo tentativo dopo un errore. Nessuna rilettura dopo una scrittura: si aggiorna la
// memoria di sessione (memoriaDiario), condivisa con lo storico e con il pannello della giornata (usePannelloGiornata).
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { aggiornaDiario, type DiarioLocale } from '@/core/diario/bozza';
import { applicaLettureInAttesa } from '@/core/diario/commento';
import { dataOggiRoma } from '@/core/diario/data';
import type { RigaSettimana } from '@/core/diario/letture';
import { BLOCCHI, bloccoSuccessivo, type Blocco, type Diario } from '@/core/diario/modello';
import { condividiDiario, leggiDiarioOggi, precaricaAutori, salvaBozza, type EsitoScrittura } from '@/servizi/diario';
import { giornateInAttesa, riprovaLetture, salvaGiornateInAttesa } from '@/servizi/giornate';
import { accodaScrittura, aggiornaMemoria, memoriaDiario, persistiMemoria, useMemoriaDiario } from '@/servizi/memoriaDiario';
import { notificaModifica, type NotificaDiario, type NutrizionistaCliente } from '@/servizi/usePannelloGiornata';

export type { NotificaDiario, NutrizionistaCliente } from '@/servizi/usePannelloGiornata';

export type FaseDiario = { tipo: 'caricamento' } | { tipo: 'rete' } | { tipo: 'errore'; messaggio: string } | { tipo: 'pronto' };

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
  /** Tacchetta dell'indicatore o scorrimento orizzontale: va a un blocco qualsiasi (avanti o indietro) e salva. */
  vaiA: (blocco: Blocco) => void;
  indietro: () => void;
  aggiorna: (diario: Diario) => void;
  condividi: () => void;
  riprova: () => void;
  nascondiNotifica: () => void;
  /** Notifica breve da mostrare (anche dal pannello della giornata). */
  mostraNotifica: (notifica: NotificaDiario) => void;
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

function impostaLocale(nuovo: DiarioLocale): void {
  aggiornaMemoria({ locale: nuovo });
  persistiMemoria();
}

export function useDiario(clientId: string, nutrizionista: NutrizionistaCliente = null): StatoPaginaOggi & AzioniPaginaOggi {
  const memoria = useMemoriaDiario();
  const [fase, setFase] = useState<FaseDiario>(memoria.locale ? { tipo: 'pronto' } : { tipo: 'caricamento' });
  const [blocco, setBlocco] = useState<Blocco | null>(null);
  const [inviando, setInviando] = useState(false);
  const [notifica, setNotifica] = useState<NotificaDiario | null>(null);
  const nutrizionistaRef = useRef(nutrizionista);
  useEffect(() => {
    nutrizionistaRef.current = nutrizionista;
  }, [nutrizionista]);
  const montato = useRef(true);

  const mostraNotifica = useCallback((n: NotificaDiario) => {
    if (montato.current) setNotifica(n);
  }, []);

  /** Salvataggio della bozza di oggi (serializzato: una scrittura alla volta). */
  const salva = useCallback(
    (mostraErrore: boolean): Promise<void> =>
      accodaScrittura(async () => {
        const attuale = memoriaDiario().locale;
        if (!attuale || !attuale.inAttesa) return;
        const { locale: dopo, esito } = await salvaBozza(attuale);
        // Se nel frattempo il contenuto locale è cambiato, si tengono le modifiche più recenti con la riga aggiornata.
        const corrente = memoriaDiario().locale;
        impostaLocale(corrente && corrente !== attuale ? aggiornaDiario({ ...corrente, riga: dopo.riga, errore: dopo.errore }, corrente.diario) : dopo);
        const n = notificaDi(esito, false);
        if (n && mostraErrore) mostraNotifica(n);
      }),
    [mostraNotifica],
  );

  const salvaGiornate = useCallback(
    (mostraErrore: boolean) => {
      void salvaGiornateInAttesa().then((esito) => {
        const n = notificaModifica(esito);
        if (n && mostraErrore) mostraNotifica(n);
      });
    },
    [mostraNotifica],
  );

  const carica = useCallback(() => {
    let attivo = true;
    (async () => {
      // Una bozza in attesa di ieri (giorno cambiato) si prova a salvare prima di passare a oggi.
      const precedente = memoriaDiario().locale;
      if (precedente?.inAttesa && precedente.data !== dataOggiRoma(new Date())) await salva(false);
      const esito = await leggiDiarioOggi(clientId);
      if (!attivo || !montato.current) return;
      switch (esito.tipo) {
        case 'ok': {
          const m = memoriaDiario();
          // Giornate e letture in attesa: quelle in memoria sono le più recenti; la cache le integra al primo avvio.
          const lettureInAttesa = [...new Set([...esito.dati.lettureInAttesa, ...m.lettureInAttesa])];
          const settimana = applicaLettureInAttesa(esito.dati.settimana, lettureInAttesa);
          aggiornaMemoria({
            locale: esito.dati.locale,
            settimana,
            giornate: { ...esito.dati.giornate, ...m.giornate },
            lettureInAttesa,
            primoDiario: m.primoDiario ?? esito.dati.primoDiario,
          });
          // Autori dei commenti e foto pronti prima che si apra un pannello (nessuna attesa all'apertura).
          void precaricaAutori(
            settimana.filter((r) => r.nutritionist_comment && r.comment_author_id).map((r) => r.comment_author_id as string),
            [nutrizionistaRef.current?.foto],
          );
          setFase({ tipo: 'pronto' });
          if (esito.dati.locale.riga.tipo === 'condiviso') setBlocco(null);
          // Copie locali in attesa (errore precedente o offline) ripartono appena c'è rete.
          if (!esito.daCache) {
            if (esito.dati.locale.inAttesa) void salva(true);
            if (giornateInAttesa()) salvaGiornate(true);
            riprovaLetture();
          }
          break;
        }
        case 'nonAutenticato':
        case 'errore':
          if (memoriaDiario().locale) break; // dati già a schermo: non si sostituiscono con un errore
          setFase({ tipo: 'errore', messaggio: esito.tipo === 'errore' ? esito.messaggio : 'Sessione non valida' });
          break;
        case 'rete':
          if (memoriaDiario().locale) break;
          setFase({ tipo: 'rete' });
          break;
      }
    })();
    return () => {
      attivo = false;
    };
  }, [clientId, salva, salvaGiornate]);

  // Prima lettura, riletture al ritorno in primo piano (così compaiono i nuovi commenti), salvataggio quando l'app
  // va in secondo piano e all'uscita.
  useEffect(() => {
    montato.current = true;
    const annulla = carica();
    const sub = AppState.addEventListener('change', (stato: AppStateStatus) => {
      if (stato === 'active') carica();
      else if (stato === 'background' || stato === 'inactive') {
        void salva(false);
        salvaGiornate(false);
      }
    });
    return () => {
      montato.current = false;
      annulla();
      sub.remove();
      void salva(false);
      salvaGiornate(false);
    };
  }, [carica, salva, salvaGiornate]);

  const scrivi = useCallback(() => {
    if (memoriaDiario().locale?.riga.tipo === 'condiviso') return;
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

  const vaiA = useCallback(
    (nuovo: Blocco) => {
      setBlocco((b) => (b === nuovo ? b : nuovo));
      void salva(true);
    },
    [salva],
  );

  const indietro = useCallback(() => {
    setBlocco((b) => {
      if (!b) return b;
      const i = BLOCCHI.indexOf(b);
      return BLOCCHI[i - 1] ?? b;
    });
    void salva(true);
  }, [salva]);

  const aggiorna = useCallback((diario: Diario) => {
    const attuale = memoriaDiario().locale;
    if (!attuale) return;
    impostaLocale(aggiornaDiario(attuale, diario));
  }, []);

  const condividi = useCallback(() => {
    const attuale = memoriaDiario().locale;
    if (!attuale || inviando) return;
    setInviando(true);
    accodaScrittura(async () => {
      const { locale: dopo, esito } = await condividiDiario(memoriaDiario().locale ?? attuale);
      impostaLocale(dopo);
      if (dopo.riga.tipo === 'condiviso') {
        // Oggi diventa un giorno condiviso della settimana (apribile nel pannello); la giornata completa si rilegge al tocco.
        const m = memoriaDiario();
        const precedente = m.settimana.find((r) => r.submission_date === dopo.data);
        const rigaOggi: RigaSettimana = {
          id: dopo.riga.id,
          submission_date: dopo.data,
          status: 'submitted',
          updated_at: null,
          energy_level: dopo.diario.energy_level,
          satiety_level: dopo.diario.satiety_level,
          hydration_level: dopo.diario.hydration_level,
          sport_type: dopo.diario.sport_type,
          sport_duration: dopo.diario.sport_duration,
          nutritionist_comment: precedente?.nutritionist_comment ?? null,
          comment_author_id: precedente?.comment_author_id ?? null,
          comment_acknowledged: precedente?.comment_acknowledged ?? null,
          review_status: precedente?.review_status ?? null,
        };
        const { [dopo.data]: _vecchia, ...giornate } = m.giornate;
        aggiornaMemoria({
          settimana: [...m.settimana.filter((r) => r.submission_date !== dopo.data), rigaOggi].sort((a, b) => (a.submission_date < b.submission_date ? -1 : 1)),
          giornate,
          primoDiario: m.primoDiario ?? dopo.data,
        });
        persistiMemoria();
      }
      if (!montato.current) return;
      setInviando(false);
      const n = notificaDi(esito, true);
      if (n) setNotifica(n);
      if (esito.tipo !== 'errore') setBlocco(null);
    }).catch(() => {
      if (montato.current) setInviando(false);
    });
  }, [inviando]);

  const riprova = useCallback(() => {
    setNotifica(null);
    void salva(true);
    salvaGiornate(true);
  }, [salva, salvaGiornate]);

  const nascondiNotifica = useCallback(() => setNotifica(null), []);

  return {
    fase,
    locale: memoria.locale,
    settimana: memoria.settimana,
    blocco,
    inviando,
    notifica,
    carica,
    scrivi,
    chiudi,
    avanti,
    vaiA,
    indietro,
    aggiorna,
    condividi,
    riprova,
    nascondiNotifica,
    mostraNotifica,
  };
}
