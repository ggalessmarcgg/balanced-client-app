// Memoria di sessione delle revisioni, condivisa tra la sezione Revisioni, la lettura e la barra di navigazione
// (pallino "Nuova"): righe leggere dello stato, testi delle revisioni inviate già letti, scritture in attesa di
// conferma. Un solo posto che cambia (aggiornaMemoriaRevisioni); chi la mostra si iscrive con useMemoriaRevisioni;
// il tutto si persiste nel portachiavi per ripartire anche senza rete (persistiRevisioni).
import { useSyncExternalStore } from 'react';

import type { RigaRevisione } from '@/core/revisioni/letture';
import type { ModificaRevisione } from '@/core/revisioni/lettura';
import { nuovaPresente } from '@/core/revisioni/stato';
import type { TestoRevisione } from '@/core/revisioni/testo';
import { leggi, rimuovi, scrivi } from '@/servizi/archivio';

export type MemoriaRevisioni = {
  clientId: string | null;
  /** null = stato mai letto in questa sessione (né dalla cache). */
  righe: RigaRevisione[] | null;
  /** Testi per id, solo revisioni inviate (sent, opened, read). */
  testi: Record<string, TestoRevisione>;
  /** Aperture e letture mostrate ma non ancora confermate dal server: si riprovano in silenzio. */
  scrittureInAttesa: ModificaRevisione[];
};

const VUOTA: MemoriaRevisioni = { clientId: null, righe: null, testi: {}, scrittureInAttesa: [] };

let memoria: MemoriaRevisioni = VUOTA;
const ascoltatori = new Set<() => void>();

export function memoriaRevisioni(): MemoriaRevisioni {
  return memoria;
}

export function aggiornaMemoriaRevisioni(modifica: Partial<MemoriaRevisioni>): void {
  memoria = { ...memoria, ...modifica };
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

// ---- Cache nel portachiavi -------------------------------------------------------------------------------------

const PREFISSO_CACHE = 'balanced.revisioni';
type Cache = { righe: RigaRevisione[]; testi: Record<string, TestoRevisione>; scrittureInAttesa: ModificaRevisione[]; letto: string };

function chiaveCache(clientId: string): string {
  return `${PREFISSO_CACHE}.${clientId}`;
}

export async function cacheRevisioni(clientId: string): Promise<Omit<Cache, 'letto'> | null> {
  try {
    const testo = await leggi(chiaveCache(clientId));
    if (!testo) return null;
    const cache = JSON.parse(testo) as Partial<Cache>;
    if (!Array.isArray(cache.righe)) return null;
    return { righe: cache.righe, testi: cache.testi ?? {}, scrittureInAttesa: cache.scrittureInAttesa ?? [] };
  } catch {
    return null;
  }
}

// Scritture nel portachiavi serializzate: se ne arrivano molte mentre una è in corso si scrive solo l'ultima.
let scritturaCache: Promise<void> = Promise.resolve();
let inCoda: { chiave: string; cache: Cache } | null = null;

/** Persiste righe, testi e scritture in attesa (non blocca; gli errori del portachiavi si ignorano). */
export function persistiRevisioni(): void {
  if (!memoria.clientId || !memoria.righe) return;
  const daScrivere = { chiave: chiaveCache(memoria.clientId), cache: { righe: memoria.righe, testi: memoria.testi, scrittureInAttesa: memoria.scrittureInAttesa, letto: new Date().toISOString() } };
  const primaInCoda = inCoda === null;
  inCoda = daScrivere;
  if (!primaInCoda) return;
  scritturaCache = scritturaCache.then(async () => {
    while (inCoda) {
      const { chiave, cache } = inCoda;
      inCoda = null;
      await scrivi(chiave, JSON.stringify(cache)).catch(() => {});
    }
  });
}

/** All'uscita: memoria e cache su disco (contiene i testi delle revisioni del cliente). */
export async function svuotaRevisioni(): Promise<void> {
  const clientId = memoria.clientId;
  memoria = VUOTA;
  for (const a of ascoltatori) a();
  if (clientId) await rimuovi(chiaveCache(clientId)).catch(() => {});
}
