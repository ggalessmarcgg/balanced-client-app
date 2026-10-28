// Ricette salvate (client_saved_recipes, migrazione 20261028220205; contratto ricette v0.2 §6): l'unica scrittura
// dell'app sul database, con la sessione del cliente e la RLS (inserimento ed eliminazione delle proprie ricette, mai
// modifiche). Colonne esplicite, elenco dalla più recente, ricetta salvata così com'è ricevuta.
import type { RicettaPronta } from './pannello.ts';
import { leggiRicetta, type Ricetta } from './server.ts';

export const TABELLA_RICETTE_SALVATE = 'client_saved_recipes';
export const SELEZIONE_RICETTE_SALVATE = ['id', 'created_at', 'meal_name', 'day_name', 'plan_type', 'title', 'prep_minutes', 'recipe', 'request_id', 'instructions_version'].join(',');

export type RigaRicettaSalvata = {
  id: string;
  created_at: string;
  meal_name: string;
  day_name: string | null;
  plan_type: 'fisso' | 'variabile' | null;
  title: string;
  prep_minutes: number | null;
  recipe: unknown;
  request_id: string | null;
  instructions_version: string | null;
};

/** La riga da inserire: solo le colonne scritte dall'app (id e created_at li dà il database). */
export type NuovaRigaRicetta = {
  client_id: string;
  plan_id: string;
  plan_meal_id: string;
  meal_name: string;
  day_name: string | null;
  plan_type: 'fisso' | 'variabile';
  title: string;
  prep_minutes: number | null;
  recipe: Record<string, unknown>;
  request_id: string | null;
  instructions_version: string | null;
};

export type RicettaSalvata = { id: string; creataIl: string; pasto: string; giorno: string | null; ricetta: Ricetta };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** `request_id` è un uuid nel database: un identificativo in un altro formato non si scrive. */
export function requestIdPerDatabase(richiestaId: string | null): string | null {
  return richiestaId && UUID.test(richiestaId) ? richiestaId : null;
}

/** La riga per "Salva ricetta" dalla ricetta pronta e dal cliente in sessione. */
export function nuovaRigaRicetta(clientId: string, pronta: RicettaPronta): NuovaRigaRicetta {
  const r = pronta.ricetta;
  return {
    client_id: clientId,
    plan_id: pronta.pianoId,
    plan_meal_id: pronta.pasto.id,
    meal_name: pronta.pasto.nome,
    day_name: pronta.giorno,
    plan_type: pronta.tipoPiano,
    title: r.titolo,
    prep_minutes: r.tempoMinuti !== null && r.tempoMinuti > 0 ? r.tempoMinuti : null,
    recipe: r.grezza,
    request_id: requestIdPerDatabase(pronta.richiestaId),
    instructions_version: pronta.versioneIstruzioni,
  };
}

/** Una riga letta → ricetta salvata; null se la ricetta salvata non è leggibile (si nasconde dall'elenco). */
export function ricettaSalvataDa(riga: RigaRicettaSalvata): RicettaSalvata | null {
  const ricetta = leggiRicetta(riga.recipe);
  if (!ricetta) return null;
  const titolo = riga.title.trim() || ricetta.titolo;
  return { id: riga.id, creataIl: riga.created_at, pasto: riga.meal_name.trim(), giorno: riga.day_name, ricetta: { ...ricetta, titolo, tempoMinuti: riga.prep_minutes ?? ricetta.tempoMinuti } };
}

/** Elenco dalla più recente (anche se il server non ha ordinato). */
export function elencoRicetteSalvate(righe: RigaRicettaSalvata[]): RicettaSalvata[] {
  const salvate: RicettaSalvata[] = [];
  for (const r of righe) {
    const s = ricettaSalvataDa(r);
    if (s) salvate.push(s);
  }
  return salvate.sort((a, b) => Date.parse(b.creataIl) - Date.parse(a.creataIl));
}

/** La ricetta salvata da una riga appena inserita (il database restituisce id e created_at), per metterla in cima all'elenco. */
export function salvataDaInserimento(riga: Pick<RigaRicettaSalvata, 'id' | 'created_at'>, pronta: RicettaPronta): RicettaSalvata {
  return { id: riga.id, creataIl: riga.created_at, pasto: pronta.pasto.nome, giorno: pronta.giorno, ricetta: pronta.ricetta };
}

export type EsitoScrittura<T> = { tipo: 'ok'; dati: T } | { tipo: 'rete' } | { tipo: 'nonAutenticato' } | { tipo: 'errore'; messaggio: string };

/** Lo scrittore sul database (il servizio lo collega a Supabase; i test passano uno finto). */
export type ScrittoreRicette = {
  inserisci: (riga: NuovaRigaRicetta) => Promise<EsitoScrittura<Pick<RigaRicettaSalvata, 'id' | 'created_at'>>>;
  elimina: (id: string) => Promise<EsitoScrittura<null>>;
};

/** "Salva ricetta": inserisce e restituisce la ricetta salvata da mettere in cima all'elenco. */
export async function salvaRicetta(scrittore: ScrittoreRicette, clientId: string, pronta: RicettaPronta): Promise<EsitoScrittura<RicettaSalvata>> {
  const esito = await scrittore.inserisci(nuovaRigaRicetta(clientId, pronta));
  if (esito.tipo !== 'ok') return esito;
  return { tipo: 'ok', dati: salvataDaInserimento(esito.dati, pronta) };
}

/** "Elimina ricetta": elimina e restituisce l'elenco senza la ricetta. */
export async function eliminaRicetta(scrittore: ScrittoreRicette, elenco: RicettaSalvata[], id: string): Promise<EsitoScrittura<RicettaSalvata[]>> {
  const esito = await scrittore.elimina(id);
  if (esito.tipo !== 'ok') return esito;
  return { tipo: 'ok', dati: elenco.filter((r) => r.id !== id) };
}

export const TESTI_RICETTE_SALVATE = {
  titolo: 'Le tue ricette',
  vuoto: { titolo: 'Nessuna ricetta salvata', testo: 'Dalla pagina Piano tocca “Ricetta”: le ricette che salvi le ritrovi qui.' },
  elimina: 'Elimina ricetta',
  avvisoElimina: { titolo: 'Vuoi eliminare questa ricetta?', testo: 'Non sarà più tra le tue ricette.', annulla: 'Annulla', conferma: 'Elimina' },
  notificaSalvata: 'Ricetta salvata',
  notificaErroreSalvataggio: 'Non siamo riusciti a salvare la ricetta.',
  notificaErroreEliminazione: 'Non siamo riusciti a eliminare la ricetta.',
} as const;
