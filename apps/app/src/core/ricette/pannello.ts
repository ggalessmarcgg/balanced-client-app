// Macchina a stati del pannello "Ricetta" (contratto ricette v0.2 §1 e §5; Figma Piano · 5 → 5.8). Pura: riceve
// eventi e restituisce lo stato nuovo più gli effetti che il servizio esegue (le due chiamate al server, la
// rilettura del piano, l'apertura della pagina della ricetta). Ogni apertura riparte da capo (contratto §1.7).
import { pastoIniziale, nomeGiorno, type ContestoRicetta, type PastoScelto } from './contesto.ts';
import type { ErroreRicette, EsitoIdee, EsitoRicetta, Idea, Ricetta, Stima } from './server.ts';

type Base = { contesto: ContestoRicetta; pasto: PastoScelto | null; campo: string };

/** Quanto serve per la seconda chiamata e per "Riprova" della ricetta: tutto ciò che la prima ha restituito, più l'idea scelta. */
export type DatiIdee = { richiestaId: string; stima: Stima; idee: Idea[]; fraseIngredienti: string | null; versioneIstruzioni: string | null; scelta: number | null };

/** La ricetta pronta per la pagina (5.4 / 5.5) con il contesto da salvare in client_saved_recipes. */
export type RicettaPronta = {
  ricetta: Ricetta;
  pasto: PastoScelto;
  giorno: string | null;
  pianoId: string;
  tipoPiano: 'fisso' | 'variabile';
  /** `richiesta_id` del server (uuid), lo stesso delle due righe del registro; null se il server non l'ha dato. */
  richiestaId: string | null;
  versioneIstruzioni: string | null;
};

export type StatoPannello =
  | { tipo: 'chiuso' }
  /** Piano · 5 / 5.1: scelta del pasto (solo fisso), campo facoltativo e "Trova idee". */
  | ({ tipo: 'avvio' } & Base)
  /** Piano · 5.2: prima chiamata in corso; `richiesta` distingue la risposta attesa da una vecchia. */
  | ({ tipo: 'ricerca'; richiesta: number; pasto: PastoScelto } & Base)
  /** Piano · 5.3: da una a tre idee, la nota e la frase sugli ingredienti; "Vedi la ricetta" dopo il tocco di un'idea. */
  | ({ tipo: 'idee'; pasto: PastoScelto; dati: DatiIdee } & Base)
  /** Piano · 5.3.1: seconda chiamata in corso con le idee visibili e quella scelta evidenziata. */
  | ({ tipo: 'attesaRicetta'; richiesta: number; pasto: PastoScelto; dati: DatiIdee & { scelta: number } } & Base)
  /** Piano · 5.7 */
  | ({ tipo: 'nessunaIdea'; pasto: PastoScelto } & Base)
  /** Piano · 5.8: "Riprova" ripete la chiamata fallita (idee o ricetta); senza "Riprova" per sessione, abbonamento ed errori definitivi. */
  | ({ tipo: 'errore'; pasto: PastoScelto; errore: ErroreRicette; riprovabile: boolean; fase: 'idee' | 'ricetta'; dati: DatiIdee | null } & Base);

export type EventoPannello =
  | { tipo: 'apri'; contesto: ContestoRicetta }
  | { tipo: 'chiudi' }
  | { tipo: 'scegliPasto'; pasto: PastoScelto }
  | { tipo: 'scrivi'; testo: string }
  | { tipo: 'trova' }
  | { tipo: 'scegliIdea'; indice: number }
  | { tipo: 'vediRicetta' }
  | { tipo: 'riprova' }
  | { tipo: 'rispostaIdee'; richiesta: number; esito: EsitoIdee }
  | { tipo: 'rispostaRicetta'; richiesta: number; esito: EsitoRicetta };

export type EffettoPannello =
  /** POST /v1/ricette/idee con il pasto e il testo del campo. */
  | { tipo: 'chiamaIdee'; richiesta: number; pastoId: string; campo: string }
  /** POST /v1/ricette/ricetta con identificativo, stima e idea rimandati tali e quali. */
  | { tipo: 'chiamaRicetta'; richiesta: number; pastoId: string; richiestaId: string; stima: Stima; idea: Idea; campo: string }
  /** pasto_non_disponibile: il piano si rilegge senza versione nota e il cliente vede la Notifica breve. */
  | { tipo: 'rileggiPiano' }
  /** La ricetta è arrivata: il pannello si chiude e si apre la pagina (5.4 / 5.5). */
  | { tipo: 'apriRicetta'; ricetta: RicettaPronta };

export const STATO_CHIUSO: StatoPannello = { tipo: 'chiuso' };
export const NOTIFICA_PIANO_AGGIORNATO = 'Il piano è stato aggiornato: tocca di nuovo “Ricetta”.';

export type Transizione = { stato: StatoPannello; effetti: EffettoPannello[] };

function nulla(stato: StatoPannello): Transizione {
  return { stato, effetti: [] };
}

function avviaRicerca(base: Base, pasto: PastoScelto, richiesta: number): Transizione {
  return { stato: { tipo: 'ricerca', richiesta, contesto: base.contesto, pasto, campo: base.campo }, effetti: [{ tipo: 'chiamaIdee', richiesta, pastoId: pasto.id, campo: base.campo }] };
}

function avviaRicetta(base: Base, pasto: PastoScelto, dati: DatiIdee & { scelta: number }, richiesta: number): Transizione {
  const idea = dati.idee[dati.scelta];
  if (!idea) return nulla({ tipo: 'idee', contesto: base.contesto, pasto, campo: base.campo, dati: { ...dati, scelta: null } });
  return {
    stato: { tipo: 'attesaRicetta', richiesta, contesto: base.contesto, pasto, campo: base.campo, dati },
    effetti: [{ tipo: 'chiamaRicetta', richiesta, pastoId: pasto.id, richiestaId: dati.richiestaId, stima: dati.stima, idea, campo: base.campo }],
  };
}

/** Esiti che hanno "Riprova": rete, timeout e errori riprovabili del server; gli altri non cambierebbero riprovando. */
function conRiprova(errore: ErroreRicette): boolean {
  return errore.esito === 'rete' || errore.esito === 'riprovabile';
}

/** "Trova idee" è attivo solo con il pasto noto (contratto §1.2). */
export function puoTrovare(stato: StatoPannello): boolean {
  return stato.tipo === 'avvio' && stato.pasto !== null;
}

/**
 * Applica un evento. `prossimaRichiesta` è il numero da dare a una nuova chiamata (chi chiama lo incrementa a ogni
 * effetto di chiamata emesso), così una risposta arrivata dopo la chiusura o una riapertura si ignora.
 */
export function riduci(stato: StatoPannello, evento: EventoPannello, prossimaRichiesta: number): Transizione {
  switch (evento.tipo) {
    case 'apri':
      return nulla({ tipo: 'avvio', contesto: evento.contesto, pasto: pastoIniziale(evento.contesto), campo: '' });
    case 'chiudi':
      return nulla(STATO_CHIUSO);
    case 'scegliPasto':
      return stato.tipo === 'avvio' && stato.contesto.tipo === 'fisso' ? nulla({ ...stato, pasto: evento.pasto }) : nulla(stato);
    case 'scrivi':
      return stato.tipo === 'avvio' ? nulla({ ...stato, campo: evento.testo }) : nulla(stato);
    case 'trova':
      return stato.tipo === 'avvio' && stato.pasto ? avviaRicerca(stato, stato.pasto, prossimaRichiesta) : nulla(stato);
    case 'scegliIdea':
      if (stato.tipo !== 'idee' || !stato.dati.idee[evento.indice]) return nulla(stato);
      return nulla({ ...stato, dati: { ...stato.dati, scelta: evento.indice } });
    case 'vediRicetta':
      if (stato.tipo !== 'idee' || stato.dati.scelta === null) return nulla(stato);
      return avviaRicetta(stato, stato.pasto, { ...stato.dati, scelta: stato.dati.scelta }, prossimaRichiesta);
    case 'riprova': {
      if (stato.tipo !== 'errore' || !stato.riprovabile) return nulla(stato);
      if (stato.fase === 'ricetta' && stato.dati && stato.dati.scelta !== null) return avviaRicetta(stato, stato.pasto, { ...stato.dati, scelta: stato.dati.scelta }, prossimaRichiesta);
      return avviaRicerca(stato, stato.pasto, prossimaRichiesta);
    }
    case 'rispostaIdee': {
      if (stato.tipo !== 'ricerca' || stato.richiesta !== evento.richiesta) return nulla(stato);
      const base = { contesto: stato.contesto, pasto: stato.pasto, campo: stato.campo };
      if (evento.esito.tipo === 'ok') {
        const r = evento.esito.risposta;
        if (r.esito === 'nessuna_idea') return nulla({ tipo: 'nessunaIdea', ...base });
        return nulla({ tipo: 'idee', ...base, dati: { richiestaId: r.richiestaId, stima: r.stima, idee: r.idee, fraseIngredienti: r.fraseIngredienti, versioneIstruzioni: r.versioneIstruzioni, scelta: null } });
      }
      const errore = evento.esito.errore;
      if (errore.esito === 'pastoNonDisponibile') return { stato: STATO_CHIUSO, effetti: [{ tipo: 'rileggiPiano' }] };
      return nulla({ tipo: 'errore', ...base, errore, riprovabile: conRiprova(errore), fase: 'idee', dati: null });
    }
    case 'rispostaRicetta': {
      if (stato.tipo !== 'attesaRicetta' || stato.richiesta !== evento.richiesta) return nulla(stato);
      const base = { contesto: stato.contesto, pasto: stato.pasto, campo: stato.campo };
      if (evento.esito.tipo === 'ok') {
        const r = evento.esito.risposta;
        const ricetta: RicettaPronta = {
          ricetta: r.ricetta,
          pasto: stato.pasto,
          giorno: nomeGiorno(stato.contesto),
          pianoId: stato.contesto.pianoId,
          tipoPiano: stato.contesto.tipo,
          richiestaId: r.richiestaId ?? stato.dati.richiestaId,
          versioneIstruzioni: r.versioneIstruzioni ?? stato.dati.versioneIstruzioni,
        };
        return { stato: STATO_CHIUSO, effetti: [{ tipo: 'apriRicetta', ricetta }] };
      }
      const errore = evento.esito.errore;
      if (errore.esito === 'pastoNonDisponibile') return { stato: STATO_CHIUSO, effetti: [{ tipo: 'rileggiPiano' }] };
      // Stima non plausibile o idea non ammessa: si torna alla ricerca delle idee (docs/server-ricette.md §5).
      if (errore.esito === 'ripetiIdee') return avviaRicerca(base, stato.pasto, prossimaRichiesta);
      return nulla({ tipo: 'errore', ...base, errore, riprovabile: conRiprova(errore), fase: 'ricetta', dati: stato.dati });
    }
  }
}

/** Testi delle card degli esiti senza idee e dell'errore (Figma 5.7 818:8055, 5.8 818:8193; sessione e abbonamento come il diario vocale). */
export function testiEsito(stato: Extract<StatoPannello, { tipo: 'nessunaIdea' | 'errore' }>): { titolo: string; testo: string } {
  if (stato.tipo === 'nessunaIdea') return { titolo: 'Nessuna idea disponibile', testo: 'Per questo pasto non abbiamo trovato ricette adatte. La tua nutrizionista può aiutarti a scegliere.' };
  switch (stato.errore.esito) {
    case 'sessione':
      return { titolo: 'La sessione è scaduta', testo: 'Esci e accedi di nuovo per cercare le ricette.' };
    case 'nonDisponibile':
      return stato.errore.codice === 'abbonamento_non_attivo'
        ? { titolo: 'Funzione non disponibile', testo: 'Le ricette sono disponibili solo con il percorso attivo.' }
        : { titolo: 'Non riusciamo a riconoscere il tuo account', testo: 'Scrivi all’assistenza se il problema continua.' };
    default:
      return stato.fase === 'ricetta'
        ? { titolo: 'Qualcosa non ha funzionato', testo: 'Non siamo riusciti a preparare la ricetta. Controlla la connessione e riprova.' }
        : { titolo: 'Qualcosa non ha funzionato', testo: 'Non siamo riusciti a cercare le ricette. Controlla la connessione e riprova.' };
  }
}
