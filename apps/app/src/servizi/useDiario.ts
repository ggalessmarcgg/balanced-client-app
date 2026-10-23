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
import { condividiOggi } from '@/servizi/condivisione';
import { bozzePrecedentiInAttesa, leggiDiarioOggi, precaricaAutori, type EsitoScrittura } from '@/servizi/diario';
import { giornateInAttesa, riprovaLetture, salvaBozzaInAttesa, salvaGiornateInAttesa } from '@/servizi/giornate';
import { aggiornaMemoria, memoriaDiario, persistiMemoria, useMemoriaDiario } from '@/servizi/memoriaDiario';
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

// Notifica breve da mostrare in Oggi arrivando da un'altra schermata (riepilogo di Racconta: condivisione o errore di
// salvataggio). Oggi resta montata sotto: se c'è, la riceve subito; altrimenti la trova alla prossima apertura.
let notificaInSospeso: NotificaDiario | null = null;
const ascoltatoriNotifica = new Set<(n: NotificaDiario) => void>();

export function mostraNotificaInOggi(n: NotificaDiario): void {
  if (ascoltatoriNotifica.size === 0) {
    notificaInSospeso = n;
    return;
  }
  for (const a of ascoltatoriNotifica) a(n);
}

function prendiNotificaInSospeso(): NotificaDiario | null {
  const n = notificaInSospeso;
  notificaInSospeso = null;
  return n;
}

/** Notifica breve dopo un salvataggio o una condivisione (null se non serve: salvataggio riuscito). */
export function notificaScrittura(esito: EsitoScrittura, condivisione: boolean): NotificaDiario | null {
  return notificaDi(esito, condivisione);
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
  const [notifica, setNotifica] = useState<NotificaDiario | null>(prendiNotificaInSospeso);
  const nutrizionistaRef = useRef(nutrizionista);
  useEffect(() => {
    nutrizionistaRef.current = nutrizionista;
  }, [nutrizionista]);
  const montato = useRef(true);

  const mostraNotifica = useCallback((n: NotificaDiario) => {
    if (montato.current) setNotifica(n);
  }, []);

  useEffect(() => {
    ascoltatoriNotifica.add(setNotifica);
    return () => {
      ascoltatoriNotifica.delete(setNotifica);
    };
  }, []);

  /** Salvataggio della bozza di oggi (serializzato: una scrittura alla volta, servizi/giornate). */
  const salva = useCallback(
    async (mostraErrore: boolean): Promise<void> => {
      const esito = await salvaBozzaInAttesa();
      const n = esito ? notificaDi(esito, false) : null;
      if (n && mostraErrore) mostraNotifica(n);
    },
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
      // Le bozze in attesa di giorni passati (giorno cambiato, o app chiusa prima del salvataggio: copie nella
      // cartella documenti) si provano a salvare prima di passare a oggi.
      const oggi = dataOggiRoma(new Date());
      const inMemoria = memoriaDiario().locale;
      const precedenti = inMemoria ? (inMemoria.inAttesa && inMemoria.data !== oggi ? [inMemoria] : []) : await bozzePrecedentiInAttesa(clientId, oggi);
      for (const bozza of precedenti) {
        if (!attivo || !montato.current) return;
        aggiornaMemoria({ locale: bozza });
        await salva(false);
      }
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
            void riprovaLetture();
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
    if (!memoriaDiario().locale || inviando) return;
    setInviando(true);
    condividiOggi()
      .then((esito) => {
        if (!montato.current) return;
        setInviando(false);
        const n = esito ? notificaDi(esito, true) : null;
        if (n) setNotifica(n);
        if (esito && esito.tipo !== 'errore') setBlocco(null);
      })
      .catch(() => {
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
