// Memoria di sessione del diario, condivisa tra la pagina Oggi, lo storico e il pannello della giornata: diario di
// oggi, settimana corrente, giornate complete già lette, "letto" in attesa, righe di giorni fuori settimana aperte
// dallo storico, primo diario e mesi dello storico. Un solo posto che cambia (aggiornaMemoria) e chi la mostra si
// iscrive con useMemoriaDiario; la parte che serve anche senza rete si persiste nel portachiavi (persistiMemoria).
import { useSyncExternalStore } from 'react';

import type { DiarioLocale } from '@/core/diario/bozza';
import type { GiornataLocale } from '@/core/diario/giornata';
import type { RigaSettimana } from '@/core/diario/letture';
import type { Mese, RigaStorico } from '@/core/diario/storico';
import { salvaCache } from '@/servizi/diario';

export type FaseLettura = 'caricamento' | 'pronto' | 'rete' | 'errore';
/** Un mese dello storico: le righe lette (per il mese corrente solo la parte prima della settimana corrente). */
export type MeseInMemoria = { fase: FaseLettura; righe: RigaStorico[] };

export type MemoriaDiario = {
  locale: DiarioLocale | null;
  settimana: RigaSettimana[];
  giornate: Record<string, GiornataLocale>;
  lettureInAttesa: string[];
  /** Giorni fuori dalla settimana corrente aperti dallo storico o dalla rotta (chiave data): commento e "letto" per il pannello. */
  righeFuoriSettimana: Record<string, RigaSettimana>;
  /** Data del primo diario del cliente: null se non ha diari, undefined se non ancora letta. */
  primoDiario: string | null | undefined;
  mesi: Record<Mese, MeseInMemoria>;
};

const VUOTA: MemoriaDiario = { locale: null, settimana: [], giornate: {}, lettureInAttesa: [], righeFuoriSettimana: {}, primoDiario: undefined, mesi: {} };

let memoria: MemoriaDiario = VUOTA;
const ascoltatori = new Set<() => void>();

export function memoriaDiario(): MemoriaDiario {
  return memoria;
}

export function aggiornaMemoria(modifica: Partial<MemoriaDiario>): void {
  memoria = { ...memoria, ...modifica };
  for (const a of ascoltatori) a();
}

function iscriviti(ascoltatore: () => void): () => void {
  ascoltatori.add(ascoltatore);
  return () => {
    ascoltatori.delete(ascoltatore);
  };
}

/** La memoria del diario come stato React: si aggiorna a ogni aggiornaMemoria. */
export function useMemoriaDiario(): MemoriaDiario {
  return useSyncExternalStore(iscriviti, memoriaDiario);
}

/** Persiste nel portachiavi la parte che serve a ripartire senza rete (diario di oggi, settimana, giornate, letture in attesa, primo diario). */
export function persistiMemoria(): void {
  if (!memoria.locale) return;
  salvaCache({ locale: memoria.locale, settimana: memoria.settimana, giornate: memoria.giornate, lettureInAttesa: memoria.lettureInAttesa, primoDiario: memoria.primoDiario });
}

/** All'uscita. */
export function svuotaMemoriaDiario(): void {
  memoria = VUOTA;
  for (const a of ascoltatori) a();
}

// Coda delle scritture sul server: una alla volta, nell'ordine in cui sono richieste (bozza, condivisione, modifiche).
let coda: Promise<unknown> = Promise.resolve();
export function accodaScrittura<T>(scrittura: () => Promise<T>): Promise<T> {
  const esecuzione = coda.then(scrittura);
  coda = esecuzione.catch(() => {});
  return esecuzione;
}
