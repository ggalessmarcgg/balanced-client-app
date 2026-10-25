// Macchina a stati del pannello "Sostituisci" (contratto di sostituzione v0.8 §1 e §3; Figma Piano · 4 → 4.5).
// Pura: riceve eventi e restituisce lo stato nuovo più gli effetti che il servizio esegue (chiamata al server,
// rilettura del piano). Ogni apertura riparte da capo: niente riuso dei risultati, niente rigenerazione.
import type { Alternativa, ErroreSostituzione, EsitoSostituzione, Spiegazione } from './server.ts';
import { paragrafiSpiegazione } from './server.ts';

/** La riga toccata, come scritta nel piano (`testo` = "nome · quantità"). */
export type RigaScelta = { id: string; testo: string };

type Base = { riga: RigaScelta; inCasa: string };

export type StatoPannello =
  | { tipo: 'chiuso' }
  /** Piano · 4: alimento, campo facoltativo e "Trova alternative". */
  | ({ tipo: 'avvio' } & Base)
  /** Piano · 4.1: chiamata in corso; `richiesta` distingue la risposta attesa da una vecchia. */
  | ({ tipo: 'ricerca'; richiesta: number } & Base)
  /** Piano · 4.2: da una a tre alternative e la spiegazione. */
  | ({ tipo: 'alternative'; alternative: Alternativa[]; spiegazione: Spiegazione } & Base)
  /** Piano · 4.3 */
  | ({ tipo: 'nessunaAlternativa' } & Base)
  /** Piano · 4.4 */
  | ({ tipo: 'nonRiconosciuto' } & Base)
  /** Piano · 4.5: "Riprova" ripete la stessa richiesta; senza "Riprova" per sessione, abbonamento ed errori definitivi. */
  | ({ tipo: 'errore'; errore: ErroreSostituzione; riprovabile: boolean } & Base);

export type EventoPannello =
  | { tipo: 'apri'; riga: RigaScelta }
  | { tipo: 'chiudi' }
  | { tipo: 'scrivi'; testo: string }
  | { tipo: 'trova' }
  | { tipo: 'riprova' }
  | { tipo: 'risposta'; richiesta: number; esito: EsitoSostituzione };

export type EffettoPannello =
  /** POST /v1/sostituzione/alternative con la riga e il testo del campo. */
  | { tipo: 'chiama'; richiesta: number; rigaId: string; inCasa: string }
  /** riga_non_disponibile: il piano si rilegge senza versione nota e il cliente vede la Notifica breve. */
  | { tipo: 'rileggiPiano' };

export const STATO_CHIUSO: StatoPannello = { tipo: 'chiuso' };
export const NOTIFICA_PIANO_AGGIORNATO = 'Il piano è stato aggiornato: tocca di nuovo l’alimento.';

export type Transizione = { stato: StatoPannello; effetti: EffettoPannello[] };

function nulla(stato: StatoPannello): Transizione {
  return { stato, effetti: [] };
}

function avviaRicerca(base: Base, richiesta: number): Transizione {
  return { stato: { tipo: 'ricerca', richiesta, riga: base.riga, inCasa: base.inCasa }, effetti: [{ tipo: 'chiama', richiesta, rigaId: base.riga.id, inCasa: base.inCasa }] };
}

/** Esiti che hanno "Riprova": rete, timeout e errori riprovabili del server; gli altri non cambierebbero riprovando. */
function conRiprova(errore: ErroreSostituzione): boolean {
  return errore.esito === 'rete' || errore.esito === 'riprovabile';
}

/**
 * Applica un evento. `prossimaRichiesta` è il numero da dare a una nuova chiamata (chi chiama lo incrementa a ogni
 * "chiama" emesso), così una risposta arrivata dopo la chiusura o una riapertura si ignora.
 */
export function riduci(stato: StatoPannello, evento: EventoPannello, prossimaRichiesta: number): Transizione {
  switch (evento.tipo) {
    case 'apri':
      // Ogni apertura riparte da capo, anche sulla stessa riga (contratto §1.5).
      return nulla({ tipo: 'avvio', riga: evento.riga, inCasa: '' });
    case 'chiudi':
      return nulla(STATO_CHIUSO);
    case 'scrivi':
      return stato.tipo === 'avvio' ? nulla({ ...stato, inCasa: evento.testo }) : nulla(stato);
    case 'trova':
      return stato.tipo === 'avvio' ? avviaRicerca(stato, prossimaRichiesta) : nulla(stato);
    case 'riprova':
      return stato.tipo === 'errore' && stato.riprovabile ? avviaRicerca(stato, prossimaRichiesta) : nulla(stato);
    case 'risposta': {
      if (stato.tipo !== 'ricerca' || stato.richiesta !== evento.richiesta) return nulla(stato);
      const base: Base = { riga: stato.riga, inCasa: stato.inCasa };
      if (evento.esito.tipo === 'ok') {
        const r = evento.esito.risposta;
        switch (r.esito) {
          case 'alternative':
            return nulla({ tipo: 'alternative', ...base, alternative: r.alternative, spiegazione: paragrafiSpiegazione(r.spiegazione, r.inCasa, base.inCasa.trim() !== '') });
          case 'nessuna_alternativa':
            return nulla({ tipo: 'nessunaAlternativa', ...base });
          case 'non_riconosciuto':
            return nulla({ tipo: 'nonRiconosciuto', ...base });
        }
      }
      const errore = evento.esito.errore;
      if (errore.esito === 'rigaNonDisponibile') return { stato: STATO_CHIUSO, effetti: [{ tipo: 'rileggiPiano' }] };
      return nulla({ tipo: 'errore', ...base, errore, riprovabile: conRiprova(errore) });
    }
  }
}

/** Mentre si cerca il pannello non si chiude dal gesto? No: si chiude sempre (maniglia, velo, gesto); la risposta in arrivo si ignora. */
export function pannelloAperto(stato: StatoPannello): boolean {
  return stato.tipo !== 'chiuso';
}

/** Testi delle card degli esiti senza alternative e dell'errore (Figma 4.3 531:3528, 4.4 789:7727, 4.5 789:7865; sessione e abbonamento come il diario vocale). */
export function testiEsito(stato: Extract<StatoPannello, { tipo: 'nessunaAlternativa' | 'nonRiconosciuto' | 'errore' }>): { titolo: string; testo: string } {
  switch (stato.tipo) {
    case 'nessunaAlternativa':
      return { titolo: 'Nessuna alternativa adatta', testo: 'Per questo alimento non abbiamo trovato un’alternativa adatta. La tua nutrizionista può aiutarti a scegliere.' };
    case 'nonRiconosciuto':
      return { titolo: 'Non riconosciamo questo alimento', testo: 'Non riusciamo a trovare alternative per questo alimento. La tua nutrizionista può aiutarti a scegliere.' };
    case 'errore':
      switch (stato.errore.esito) {
        case 'sessione':
          return { titolo: 'La sessione è scaduta', testo: 'Esci e accedi di nuovo per cercare le alternative.' };
        case 'nonDisponibile':
          return stato.errore.codice === 'abbonamento_non_attivo'
            ? { titolo: 'Funzione non disponibile', testo: 'La sostituzione degli alimenti è disponibile solo con il percorso attivo.' }
            : { titolo: 'Non riusciamo a riconoscere il tuo account', testo: 'Scrivi all’assistenza se il problema continua.' };
        default:
          return { titolo: 'Qualcosa non ha funzionato', testo: 'Non siamo riusciti a cercare le alternative. Controlla la connessione e riprova.' };
      }
  }
}
