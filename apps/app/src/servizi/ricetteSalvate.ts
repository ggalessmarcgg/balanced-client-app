// Le tue ricette (step 9, lotto 3): lettura di client_saved_recipes con la RLS del cliente (colonne esplicite, dalla
// più recente), copia su file nella cache come per i contenuti, inserimento con "Salva ricetta" ed eliminazione con
// "Elimina ricetta": le uniche scritture dell'app sul database per le ricette (contratto ricette v0.2 §6).
import { useSyncExternalStore } from 'react';

import { classificaErrore } from '@/core/accesso/errori';
import type { RicettaPronta } from '@/core/ricette/pannello';
import {
  elencoRicetteSalvate,
  eliminaRicetta as eliminaConScrittore,
  salvaRicetta as salvaConScrittore,
  SELEZIONE_RICETTE_SALVATE,
  TABELLA_RICETTE_SALVATE,
  type EsitoScrittura,
  type RicettaSalvata,
  type RigaRicettaSalvata,
  type ScrittoreRicette,
} from '@/core/ricette/salvate';
import { leggiFile, rimuoviFile, scriviFile } from '@/servizi/archivioFile';
import { supabase } from '@/servizi/supabase';

export type EsitoRicetteSalvate = { tipo: 'ok'; ricette: RicettaSalvata[]; daCache: boolean } | { tipo: 'nonAutenticato' } | { tipo: 'rete' } | { tipo: 'errore'; messaggio: string };

const PREFISSO_CACHE = 'balanced.ricette';
type Cache = { righe: RigaRicettaSalvata[]; letto: string };
type Memoria = { clientId: string | null; ricette: RicettaSalvata[] | null };

let memoria: Memoria = { clientId: null, ricette: null };
const ascoltatori = new Set<() => void>();

function aggiorna(clientId: string, ricette: RicettaSalvata[] | null): void {
  memoria = { clientId, ricette };
  for (const a of ascoltatori) a();
}
function iscriviti(a: () => void): () => void {
  ascoltatori.add(a);
  return () => {
    ascoltatori.delete(a);
  };
}
function memoriaRicette(): Memoria {
  return memoria;
}
/** L'elenco in memoria del cliente (null finché non è letto); si aggiorna da solo dopo un salvataggio o un'eliminazione. */
export function useRicetteSalvateInMemoria(clientId: string): RicettaSalvata[] | null {
  const m = useSyncExternalStore(iscriviti, memoriaRicette);
  return m.clientId === clientId ? m.ricette : null;
}

function chiave(clientId: string): string {
  return `${PREFISSO_CACHE}.${clientId}`;
}

function erroreDiRete(error: { code?: string | null; message?: string | null; name?: string | null; status?: number | null }): boolean {
  return classificaErrore(error) === 'rete' || error.code === '' || /network|fetch|offline/i.test(error.message ?? '');
}

async function copiaSuFile(clientId: string): Promise<RigaRicettaSalvata[] | null> {
  try {
    const testo = await leggiFile(chiave(clientId));
    if (!testo) return null;
    const cache = JSON.parse(testo) as Cache;
    return Array.isArray(cache.righe) ? cache.righe : null;
  } catch {
    return null;
  }
}

/** Lettura dell'elenco: la copia su file si mostra subito, poi il server; senza rete resta la copia. */
export async function leggiRicetteSalvate(clientId: string): Promise<EsitoRicetteSalvate> {
  if (memoria.clientId !== clientId) aggiorna(clientId, null);
  if (memoria.ricette === null) {
    const copia = await copiaSuFile(clientId);
    if (copia && memoria.clientId === clientId && memoria.ricette === null) aggiorna(clientId, elencoRicetteSalvate(copia));
  }
  const { data: sessione } = await supabase.auth.getSession();
  if (!sessione.session) return { tipo: 'nonAutenticato' };
  const { data, error } = await supabase.from(TABELLA_RICETTE_SALVATE).select(SELEZIONE_RICETTE_SALVATE).eq('client_id', clientId).order('created_at', { ascending: false }).returns<RigaRicettaSalvata[]>();
  if (error) {
    const inMemoria = memoria.clientId === clientId ? memoria.ricette : null;
    if (erroreDiRete(error)) return inMemoria ? { tipo: 'ok', ricette: inMemoria, daCache: true } : { tipo: 'rete' };
    return { tipo: 'errore', messaggio: error.message };
  }
  const righe = data ?? [];
  const ricette = elencoRicetteSalvate(righe);
  aggiorna(clientId, ricette);
  scriviFile(chiave(clientId), JSON.stringify({ righe, letto: new Date().toISOString() } satisfies Cache)).catch(() => {});
  return { tipo: 'ok', ricette, daCache: false };
}

/** Dopo una scrittura la copia su file si rifà dal server alla prossima lettura: qui basta aggiornare la memoria. */
const scrittore: ScrittoreRicette = {
  inserisci: async (riga) => {
    const { data: sessione } = await supabase.auth.getSession();
    if (!sessione.session) return { tipo: 'nonAutenticato' };
    const { data, error } = await supabase.from(TABELLA_RICETTE_SALVATE).insert(riga).select('id, created_at').single<{ id: string; created_at: string }>();
    if (error) return erroreDiRete(error) ? { tipo: 'rete' } : { tipo: 'errore', messaggio: error.message };
    if (!data) return { tipo: 'errore', messaggio: 'Riga inserita senza id' };
    return { tipo: 'ok', dati: data };
  },
  elimina: async (id) => {
    const { data: sessione } = await supabase.auth.getSession();
    if (!sessione.session) return { tipo: 'nonAutenticato' };
    const { error } = await supabase.from(TABELLA_RICETTE_SALVATE).delete().eq('id', id);
    if (error) return erroreDiRete(error) ? { tipo: 'rete' } : { tipo: 'errore', messaggio: error.message };
    return { tipo: 'ok', dati: null };
  },
};

/** "Salva ricetta": un inserimento; la ricetta salvata va in cima all'elenco in memoria. */
export async function salvaRicetta(clientId: string, pronta: RicettaPronta): Promise<EsitoScrittura<RicettaSalvata>> {
  const esito = await salvaConScrittore(scrittore, clientId, pronta);
  if (esito.tipo === 'ok') {
    const attuali = memoria.clientId === clientId ? (memoria.ricette ?? []) : [];
    aggiorna(clientId, [esito.dati, ...attuali]);
    rimuoviFile(chiave(clientId)).catch(() => {});
  }
  return esito;
}

/** "Elimina ricetta": un'eliminazione per id; l'elenco in memoria si aggiorna subito. */
export async function eliminaRicetta(clientId: string, id: string): Promise<EsitoScrittura<RicettaSalvata[]>> {
  const attuali = memoria.clientId === clientId ? (memoria.ricette ?? []) : [];
  const esito = await eliminaConScrittore(scrittore, attuali, id);
  if (esito.tipo === 'ok') {
    aggiorna(clientId, esito.dati);
    rimuoviFile(chiave(clientId)).catch(() => {});
  }
  return esito;
}

/** All'uscita: memoria e copia su file del cliente (il file sta nella cache, che viene comunque svuotata). */
export async function svuotaRicetteSalvate(): Promise<void> {
  const clientId = memoria.clientId;
  memoria = { clientId: null, ricette: null };
  for (const a of ascoltatori) a();
  if (clientId) await rimuoviFile(chiave(clientId));
}
