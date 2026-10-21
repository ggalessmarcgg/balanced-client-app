// Memoria di sessione delle revisioni, condivisa tra la sezione Revisioni, la lettura e la barra di navigazione
// (pallino "Nuova"): righe leggere dello stato, testi delle revisioni inviate già letti, scritture in attesa di
// conferma. Un solo posto che cambia (aggiornaMemoriaRevisioni); chi la mostra si iscrive con useMemoriaRevisioni;
// righe e testi si persistono nella cache su file (archivioFile.ts, non nel portachiavi: i testi crescono con il
// cliente) per ripartire anche senza rete; le scritture in attesa stanno in un file della cartella documenti, che il
// sistema non svuota, finché il server non le conferma (persistiRevisioni). Tutto si cancella all'uscita.
import { useSyncExternalStore } from 'react';

import type { RigaRevisione } from '@/core/revisioni/letture';
import type { ModificaRevisione } from '@/core/revisioni/lettura';
import { fondiMemoria, MEMORIA_VUOTA, type MemoriaRevisioni } from '@/core/revisioni/memoria';
import { nuovaPresente } from '@/core/revisioni/stato';
import type { TestoRevisione } from '@/core/revisioni/testo';
import { leggiFile, rimuoviFile, scriviFile } from '@/servizi/archivioFile';

export type { MemoriaRevisioni };

const VUOTA: MemoriaRevisioni = MEMORIA_VUOTA;

let memoria: MemoriaRevisioni = VUOTA;
const ascoltatori = new Set<() => void>();

export function memoriaRevisioni(): MemoriaRevisioni {
  return memoria;
}

/** Fonde la modifica e avvisa chi ascolta solo se qualcosa è cambiato davvero (core/revisioni/memoria). */
export function aggiornaMemoriaRevisioni(modifica: Partial<MemoriaRevisioni>): void {
  const nuova = fondiMemoria(memoria, modifica);
  if (nuova === memoria) return;
  memoria = nuova;
  for (const a of ascoltatori) a();
}

function iscriviti(ascoltatore: () => void): () => void {
  ascoltatori.add(ascoltatore);
  return () => {
    ascoltatori.delete(ascoltatore);
  };
}

export function useMemoriaRevisioni(): MemoriaRevisioni {
  return useSyncExternalStore(iscriviti, memoriaRevisioni);
}

function nuova(): boolean {
  return memoria.righe !== null && nuovaPresente(memoria.righe);
}

/** Vero se c'è almeno una revisione Nuova (pallino rosso sulla voce Revisioni della barra). */
export function useNuovaRevisione(): boolean {
  return useSyncExternalStore(iscriviti, nuova);
}

// ---- Cache su file ----------------------------------------------------------------------------------------------

const PREFISSO_CACHE = 'balanced.revisioni';
const PREFISSO_ATTESA = 'balanced.revisioni-attesa';
type Cache = { righe: RigaRevisione[]; testi: Record<string, TestoRevisione>; letto: string };
type Attesa = { scrittureInAttesa: ModificaRevisione[] };

function chiaveCache(clientId: string): string {
  return `${PREFISSO_CACHE}.${clientId}`;
}
function chiaveAttesa(clientId: string): string {
  return `${PREFISSO_ATTESA}.${clientId}`;
}

/** Cache (righe e testi) e scritture in attesa del cliente; righe null se la cache manca. */
export async function cacheRevisioni(clientId: string): Promise<{ righe: RigaRevisione[] | null; testi: Record<string, TestoRevisione>; scrittureInAttesa: ModificaRevisione[] }> {
  let righe: RigaRevisione[] | null = null;
  let testi: Record<string, TestoRevisione> = {};
  let scrittureInAttesa: ModificaRevisione[] = [];
  try {
    const testo = await leggiFile(chiaveCache(clientId));
    const cache = testo ? (JSON.parse(testo) as Partial<Cache>) : null;
    if (cache && Array.isArray(cache.righe)) {
      righe = cache.righe;
      testi = cache.testi ?? {};
    }
  } catch {
    // cache illeggibile: si rilegge dal server
  }
  try {
    const testo = await leggiFile(chiaveAttesa(clientId), 'documenti');
    const attesa = testo ? (JSON.parse(testo) as Partial<Attesa>) : null;
    if (attesa && Array.isArray(attesa.scrittureInAttesa)) scrittureInAttesa = attesa.scrittureInAttesa;
  } catch {
    // copia illeggibile: le scritture andranno ripetute dal cliente
  }
  return { righe, testi, scrittureInAttesa };
}

// Scritture su file serializzate: se ne arrivano molte mentre una è in corso si scrive solo l'ultima.
let scritturaCache: Promise<void> = Promise.resolve();
let inCoda: { clientId: string; cache: Cache; attesa: Attesa } | null = null;

/** Persiste righe e testi (cache) e le scritture in attesa (documenti). Non blocca; gli errori di scrittura si ignorano. */
export function persistiRevisioni(): void {
  if (!memoria.clientId || !memoria.righe) return;
  const daScrivere = {
    clientId: memoria.clientId,
    cache: { righe: memoria.righe, testi: memoria.testi, letto: new Date().toISOString() },
    attesa: { scrittureInAttesa: memoria.scrittureInAttesa },
  };
  const primaInCoda = inCoda === null;
  inCoda = daScrivere;
  if (!primaInCoda) return;
  scritturaCache = scritturaCache.then(async () => {
    while (inCoda) {
      const { clientId, cache, attesa } = inCoda;
      inCoda = null;
      if (attesa.scrittureInAttesa.length > 0) await scriviFile(chiaveAttesa(clientId), JSON.stringify(attesa), 'documenti').catch(() => {});
      else await rimuoviFile(chiaveAttesa(clientId), 'documenti');
      await scriviFile(chiaveCache(clientId), JSON.stringify(cache)).catch(() => {});
    }
  });
}

/** All'uscita: memoria, cache su disco (testi del cliente) e scritture in attesa (dopo il signOut non si potrebbero più inviare). */
export async function svuotaRevisioni(): Promise<void> {
  const clientId = memoria.clientId;
  memoria = VUOTA;
  for (const a of ascoltatori) a();
  if (clientId) {
    await rimuoviFile(chiaveCache(clientId));
    await rimuoviFile(chiaveAttesa(clientId), 'documenti');
  }
}
