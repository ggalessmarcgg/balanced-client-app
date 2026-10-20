// Stato della pagina Oggi: lettura all'apertura e al ritorno in primo piano, modifiche locali, salvataggio della
// bozza alla chiusura/cambio di blocco, all'uscita e quando l'app va in secondo piano (mai a ogni tasto),
// condivisione una volta sola, nuovo tentativo dopo un errore. Nessuna rilettura dopo una scrittura: si aggiorna la cache.
// Lotto 2: pannello della giornata (giorno condiviso della settimana o data dalla rotta), commento segnato letto
// all'apertura, modifica della giornata con le stesse regole di salvataggio della bozza.
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { aggiornaDiario, type DiarioLocale } from '@/core/diario/bozza';
import { applicaLettureInAttesa, autoreCommento, pianificaLetto, segnaLettoInCache, statoCommento, type AutoreCommento } from '@/core/diario/commento';
import { dataOggiRoma, dataValida, giorniDellaSettimana } from '@/core/diario/data';
import { aggiornaGiornata, giornataDaRiga, giornataDaRileggere, type GiornataLocale } from '@/core/diario/giornata';
import { statoRiga, type RigaSettimana } from '@/core/diario/letture';
import { BLOCCHI, bloccoSuccessivo, type Blocco, type Diario } from '@/core/diario/modello';
import {
  condividiDiario,
  leggiAutore,
  leggiDiarioOggi,
  leggiGiornata,
  leggiGiornataPerData,
  salvaBozza,
  salvaCache,
  salvaGiornata,
  scriviCommentoLetto,
  type EsitoScrittura,
} from '@/servizi/diario';

export type FaseDiario = { tipo: 'caricamento' } | { tipo: 'rete' } | { tipo: 'errore'; messaggio: string } | { tipo: 'pronto' };
export type NotificaDiario = { tipo: 'conferma'; testo: string } | { tipo: 'errore'; testo: string; riprova: boolean };

export type CommentoPannello = { testo: string; /** Era da leggere all'apertura: etichetta "Nuovo" nella Card commento. */ nuovo: boolean; autore: AutoreCommento | null };
export type FasePannello = { tipo: 'caricamento' } | { tipo: 'rete' } | { tipo: 'errore' } | { tipo: 'pronto'; giornata: GiornataLocale; commento: CommentoPannello | null };
export type StatoPannello = {
  data: string;
  fase: FasePannello;
  /** Blocco aperto in modifica; null = riassunto "La tua giornata". */
  modifica: Blocco | null;
};

export type StatoPaginaOggi = {
  fase: FaseDiario;
  locale: DiarioLocale | null;
  settimana: RigaSettimana[];
  /** Blocco aperto del diario; null = card chiusa (da iniziare, in bozza o condivisa). */
  blocco: Blocco | null;
  inviando: boolean;
  notifica: NotificaDiario | null;
  pannello: StatoPannello | null;
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
  /** Apre il pannello di una giornata condivisa (giorno della Card settimana o data dalla rotta). */
  apriGiornata: (data: string) => void;
  chiudiPannello: () => void;
  /** "Modifica" nel pannello: riapre i passaggi del diario dal primo blocco. */
  modificaGiornata: () => void;
  chiudiModifica: () => void;
  avantiModifica: () => void;
  indietroModifica: () => void;
  vaiAModifica: (blocco: Blocco) => void;
  aggiornaGiornata: (diario: Diario) => void;
};

const TESTI = {
  condiviso: 'Giornata condivisa con la tua nutrizionista.',
  giaCondiviso: 'La giornata era già stata condivisa.',
  erroreRete: 'Sei offline: le modifiche sono salvate sul telefono.',
  erroreAltro: 'Non siamo riusciti a salvare il diario.',
  erroreModifica: 'Non siamo riusciti a salvare le modifiche alla giornata.',
} as const;

function notificaDi(esito: EsitoScrittura, condivisione: boolean): NotificaDiario | null {
  if (esito.tipo === 'ok') return condivisione ? { tipo: 'conferma', testo: TESTI.condiviso } : null;
  if (esito.tipo === 'giaCondiviso') return { tipo: 'conferma', testo: TESTI.giaCondiviso };
  return { tipo: 'errore', testo: esito.errore === 'rete' ? TESTI.erroreRete : TESTI.erroreAltro, riprova: true };
}

function notificaModifica(esito: EsitoScrittura): NotificaDiario | null {
  if (esito.tipo !== 'errore') return null;
  return { tipo: 'errore', testo: esito.errore === 'rete' ? TESTI.erroreRete : TESTI.erroreModifica, riprova: true };
}

/** Nutrizionista del cliente (dal profilo dello stato): ripiego per l'autore del commento. */
export type NutrizionistaCliente = { nome: string; foto: string | null } | null;

export function useDiario(clientId: string, nutrizionista: NutrizionistaCliente = null): StatoPaginaOggi & AzioniPaginaOggi {
  const [fase, setFase] = useState<FaseDiario>({ tipo: 'caricamento' });
  const [locale, setLocale] = useState<DiarioLocale | null>(null);
  const [settimana, setSettimana] = useState<RigaSettimana[]>([]);
  const [blocco, setBlocco] = useState<Blocco | null>(null);
  const [inviando, setInviando] = useState(false);
  const [notifica, setNotifica] = useState<NotificaDiario | null>(null);
  const [pannello, setPannello] = useState<StatoPannello | null>(null);

  // Ultime copie locali, leggibili dai gestori di AppState e di smontaggio senza richiudere lo stato.
  const localeRef = useRef<DiarioLocale | null>(null);
  const settimanaRef = useRef<RigaSettimana[]>([]);
  const giornateRef = useRef<Record<string, GiornataLocale>>({});
  const lettureInAttesaRef = useRef<string[]>([]);
  const pannelloRef = useRef<StatoPannello | null>(null);
  const nutrizionistaRef = useRef(nutrizionista);
  useEffect(() => {
    nutrizionistaRef.current = nutrizionista;
  }, [nutrizionista]);
  const scritturaInCorso = useRef<Promise<unknown>>(Promise.resolve());
  const montato = useRef(true);

  /** Persiste tutto ciò che è in memoria (diario di oggi, settimana, giornate, letture in attesa). */
  const persisti = useCallback(() => {
    if (!localeRef.current) return;
    salvaCache({ locale: localeRef.current, settimana: settimanaRef.current, giornate: giornateRef.current, lettureInAttesa: lettureInAttesaRef.current });
  }, []);

  const impostaLocale = useCallback(
    (nuovo: DiarioLocale) => {
      localeRef.current = nuovo;
      if (montato.current) setLocale(nuovo);
      persisti();
    },
    [persisti],
  );

  const impostaSettimana = useCallback((righe: RigaSettimana[]) => {
    settimanaRef.current = righe;
    if (montato.current) setSettimana(righe);
  }, []);

  const impostaPannello = useCallback((nuovo: StatoPannello | null) => {
    pannelloRef.current = nuovo;
    if (montato.current) setPannello(nuovo);
  }, []);

  /** Aggiorna una giornata in memoria e, se è quella aperta nel pannello, anche a schermo. */
  const impostaGiornata = useCallback(
    (giornata: GiornataLocale) => {
      giornateRef.current = { ...giornateRef.current, [giornata.data]: giornata };
      const p = pannelloRef.current;
      if (p && p.data === giornata.data && p.fase.tipo === 'pronto') impostaPannello({ ...p, fase: { ...p.fase, giornata } });
      // La giornata di oggi, se condivisa, è anche il diario di oggi: la copia locale segue le modifiche.
      const l = localeRef.current;
      if (l && l.data === giornata.data && l.riga.tipo === 'condiviso') {
        localeRef.current = { ...l, diario: giornata.diario };
        if (montato.current) setLocale(localeRef.current);
      }
      persisti();
    },
    [impostaPannello, persisti],
  );

  /** Salvataggio della bozza di oggi (serializzato: una scrittura alla volta). */
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

  /** Salvataggio delle giornate condivise con modifiche in attesa (serializzato con le altre scritture). */
  const salvaGiornate = useCallback(
    (mostraErrore: boolean): Promise<void> => {
      const esecuzione = scritturaInCorso.current.then(async () => {
        for (const attuale of Object.values(giornateRef.current)) {
          if (!attuale.inAttesa) continue;
          const { giornata: dopo, esito } = await salvaGiornata(attuale);
          const corrente = giornateRef.current[attuale.data];
          impostaGiornata(corrente && corrente !== attuale ? aggiornaGiornata({ ...corrente, salvato: dopo.salvato, updatedAt: dopo.updatedAt, errore: dopo.errore }, corrente.diario) : dopo);
          // La riga della settimana segue l'updated_at del server: alla prossima apertura la giornata in cache vale ancora.
          if (esito.tipo === 'ok' && dopo.updatedAt) {
            const { energy_level, satiety_level, hydration_level, sport_type, sport_duration } = dopo.salvato;
            impostaSettimana(settimanaRef.current.map((r) => (r.id === dopo.id ? { ...r, updated_at: dopo.updatedAt, energy_level, satiety_level, hydration_level, sport_type, sport_duration } : r)));
          }
          const n = notificaModifica(esito);
          if (n && mostraErrore && montato.current) setNotifica(n);
        }
      });
      scritturaInCorso.current = esecuzione.catch(() => {});
      return esecuzione;
    },
    [impostaGiornata, impostaSettimana],
  );

  /** "Letto" in attesa di conferma: si riprova in silenzio (all'apertura di un pannello). */
  const riprovaLetture = useCallback(() => {
    for (const id of lettureInAttesaRef.current) {
      void scriviCommentoLetto({ id, campi: { comment_acknowledged: true } }).then((ok) => {
        if (!ok) return;
        lettureInAttesaRef.current = lettureInAttesaRef.current.filter((x) => x !== id);
        persisti();
      });
    }
  }, [persisti]);

  /** Segna letto il commento di una riga: subito in cache (pallino verde), poi sul server; se fallisce resta in attesa. */
  const segnaLetto = useCallback(
    (riga: RigaSettimana) => {
      const op = pianificaLetto(riga);
      if (op.tipo === 'nessuna') return;
      impostaSettimana(segnaLettoInCache(settimanaRef.current, riga.id));
      lettureInAttesaRef.current = [...new Set([...lettureInAttesaRef.current, riga.id])];
      persisti();
      void scriviCommentoLetto(op.modifica).then((ok) => {
        if (!ok) return;
        lettureInAttesaRef.current = lettureInAttesaRef.current.filter((x) => x !== riga.id);
        persisti();
      });
    },
    [impostaSettimana, persisti],
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
        case 'ok': {
          localeRef.current = esito.dati.locale;
          // Giornate e letture in attesa: quelle in memoria sono le più recenti; la cache le integra al primo avvio.
          giornateRef.current = { ...esito.dati.giornate, ...giornateRef.current };
          lettureInAttesaRef.current = [...new Set([...esito.dati.lettureInAttesa, ...lettureInAttesaRef.current])];
          impostaSettimana(applicaLettureInAttesa(esito.dati.settimana, lettureInAttesaRef.current));
          setLocale(esito.dati.locale);
          setFase({ tipo: 'pronto' });
          if (esito.dati.locale.riga.tipo === 'condiviso') setBlocco(null);
          // Copie locali in attesa (errore precedente o offline) ripartono appena c'è rete.
          if (!esito.daCache) {
            if (esito.dati.locale.inAttesa) void salva(true);
            if (Object.values(giornateRef.current).some((g) => g.inAttesa)) void salvaGiornate(true);
            riprovaLetture();
          }
          break;
        }
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
  }, [clientId, salva, salvaGiornate, impostaSettimana, riprovaLetture]);

  // Prima lettura, riletture al ritorno in primo piano (così compaiono i nuovi commenti), salvataggio quando l'app
  // va in secondo piano e all'uscita.
  useEffect(() => {
    montato.current = true;
    const annulla = carica();
    const sub = AppState.addEventListener('change', (stato: AppStateStatus) => {
      if (stato === 'active') carica();
      else if (stato === 'background' || stato === 'inactive') {
        void salva(false);
        void salvaGiornate(false);
      }
    });
    return () => {
      montato.current = false;
      annulla();
      sub.remove();
      void salva(false);
      void salvaGiornate(false);
    };
  }, [carica, salva, salvaGiornate]);

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
      if (dopo.riga.tipo === 'condiviso') {
        // Oggi diventa un giorno condiviso della settimana (apribile nel pannello); la giornata completa si rilegge al tocco.
        const id = dopo.riga.id;
        const senzaOggi = settimanaRef.current.filter((r) => r.submission_date !== dopo.data);
        const precedente = settimanaRef.current.find((r) => r.submission_date === dopo.data);
        const rigaOggi: RigaSettimana = {
          id,
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
        };
        impostaSettimana([...senzaOggi, rigaOggi].sort((a, b) => (a.submission_date < b.submission_date ? -1 : 1)));
        const { [dopo.data]: _vecchia, ...altre } = giornateRef.current;
        giornateRef.current = altre;
        persisti();
      }
      if (!montato.current) return;
      setInviando(false);
      setNotifica(notificaDi(esito, true));
      if (esito.tipo !== 'errore') setBlocco(null);
    });
    scritturaInCorso.current = esecuzione.catch(() => {
      if (montato.current) setInviando(false);
    });
  }, [impostaLocale, impostaSettimana, inviando, persisti]);

  const riprova = useCallback(() => {
    setNotifica(null);
    void salva(true);
    void salvaGiornate(true);
  }, [salva, salvaGiornate]);

  const nascondiNotifica = useCallback(() => setNotifica(null), []);

  // ---- Pannello della giornata ----------------------------------------------------------------------------------

  const apriGiornata = useCallback(
    (data: string) => {
      if (!dataValida(data) || pannelloRef.current?.data === data) return;
      // Le modifiche in attesa di un pannello precedente si salvano prima di passare a un'altra giornata.
      void salvaGiornate(true);
      riprovaLetture();
      impostaPannello({ data, fase: { tipo: 'caricamento' }, modifica: null });
      (async () => {
        const oggi = localeRef.current?.data ?? dataOggiRoma(new Date());
        // 1. La riga della settimana (con commento e "letto"); fuori settimana (rotta diretta) si legge per data.
        let riga = settimanaRef.current.find((r) => r.submission_date === data && statoRiga(r.status) === 'submitted');
        if (!riga) {
          if (giorniDellaSettimana(oggi).includes(data)) return impostaPannello(null); // non condiviso: nulla da aprire
          const esito = await leggiGiornataPerData(clientId, data);
          if (pannelloRef.current?.data !== data) return;
          if (esito.tipo !== 'ok') return impostaPannello({ data, fase: { tipo: esito.tipo }, modifica: null });
          if (!esito.dati || statoRiga(esito.dati.status) !== 'submitted') return impostaPannello(null);
          const { nutritionist_comment, comment_author_id, comment_acknowledged, ...completa } = esito.dati;
          riga = { ...completa, nutritionist_comment, comment_author_id, comment_acknowledged };
          giornateRef.current = { ...giornateRef.current, [data]: giornataDaRiga(completa) };
        }
        // 2. La giornata completa: dalla cache se è ancora quella del server, altrimenti una lettura per id.
        let giornata = giornateRef.current[data];
        if (giornataDaRileggere(giornata, riga)) {
          const esito = await leggiGiornata(riga.id);
          if (pannelloRef.current?.data !== data) return;
          if (esito.tipo === 'ok' && esito.dati) giornata = giornataDaRiga(esito.dati);
          else if (esito.tipo === 'rete' && giornata) {
            // senza rete si mostra la copia in cache
          } else return impostaPannello({ data, fase: { tipo: esito.tipo === 'ok' ? 'errore' : esito.tipo }, modifica: null });
          giornateRef.current = { ...giornateRef.current, [data]: giornata };
        }
        if (!giornata) return impostaPannello({ data, fase: { tipo: 'errore' }, modifica: null });
        // 3. Il commento: autore (una lettura per autore, cache lunga) e "letto" all'apertura.
        const stato = statoCommento(riga);
        let commento: CommentoPannello | null = null;
        if (stato !== 'nessuno' && riga.nutritionist_comment) {
          const profilo = riga.comment_author_id ? await leggiAutore(riga.comment_author_id) : null;
          if (pannelloRef.current?.data !== data) return;
          commento = { testo: riga.nutritionist_comment.trim(), nuovo: stato === 'daLeggere', autore: autoreCommento(profilo, nutrizionistaRef.current) };
          if (stato === 'daLeggere') segnaLetto(riga);
        }
        persisti();
        impostaPannello({ data, fase: { tipo: 'pronto', giornata, commento }, modifica: null });
      })();
    },
    [clientId, impostaPannello, persisti, riprovaLetture, salvaGiornate, segnaLetto],
  );

  const chiudiPannello = useCallback(() => {
    impostaPannello(null);
    void salvaGiornate(true);
  }, [impostaPannello, salvaGiornate]);

  const modificaGiornata = useCallback(() => {
    const p = pannelloRef.current;
    if (!p || p.fase.tipo !== 'pronto') return;
    impostaPannello({ ...p, modifica: 'pasti' });
  }, [impostaPannello]);

  const chiudiModifica = useCallback(() => {
    const p = pannelloRef.current;
    if (p) impostaPannello({ ...p, modifica: null });
    void salvaGiornate(true);
  }, [impostaPannello, salvaGiornate]);

  const vaiAModifica = useCallback(
    (nuovo: Blocco) => {
      const p = pannelloRef.current;
      if (p && p.modifica !== nuovo) impostaPannello({ ...p, modifica: nuovo });
      void salvaGiornate(true);
    },
    [impostaPannello, salvaGiornate],
  );

  const avantiModifica = useCallback(() => {
    const b = pannelloRef.current?.modifica;
    const prossimo = b ? bloccoSuccessivo(b) : null;
    if (prossimo) vaiAModifica(prossimo);
  }, [vaiAModifica]);

  const indietroModifica = useCallback(() => {
    const b = pannelloRef.current?.modifica;
    const precedente = b ? BLOCCHI[BLOCCHI.indexOf(b) - 1] : undefined;
    if (precedente) vaiAModifica(precedente);
  }, [vaiAModifica]);

  const aggiornaGiornataAperta = useCallback(
    (diario: Diario) => {
      const p = pannelloRef.current;
      if (!p || p.fase.tipo !== 'pronto') return;
      impostaGiornata(aggiornaGiornata(p.fase.giornata, diario));
    },
    [impostaGiornata],
  );

  return {
    fase,
    locale,
    settimana,
    blocco,
    inviando,
    notifica,
    pannello,
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
    apriGiornata,
    chiudiPannello,
    modificaGiornata,
    chiudiModifica,
    avantiModifica,
    indietroModifica,
    vaiAModifica,
    aggiornaGiornata: aggiornaGiornataAperta,
  };
}
