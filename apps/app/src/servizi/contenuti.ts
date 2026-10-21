// Contenuti della libreria: 16 righe statiche (41 kB di testo) lette una volta con il corpo e tenute su file per un
// giorno; la lettura di un contenuto non fa richieste. Nessuna scrittura.
import { classificaErrore } from '@/core/accesso/errori';
import { SELEZIONE_CONTENUTI, TABELLA_CONTENUTI, type RigaContenuto } from '@/core/contenuti/contenuti';
import { leggiFile, scriviFile } from '@/servizi/archivioFile';
import { supabase } from '@/servizi/supabase';

export type EsitoContenuti = { tipo: 'ok'; righe: RigaContenuto[]; daCache: boolean } | { tipo: 'nonAutenticato' } | { tipo: 'rete' } | { tipo: 'errore'; messaggio: string };

const CHIAVE_CACHE = 'balanced.contenuti';
const DURATA_CACHE_MS = 24 * 60 * 60 * 1000;
type Cache = { righe: RigaContenuto[]; letto: string };

let inMemoria: Cache | null = null;

function erroreDiRete(error: { code?: string | null; message?: string | null; name?: string | null; status?: number | null }): boolean {
  return classificaErrore(error) === 'rete' || error.code === '' || /network|fetch|offline/i.test(error.message ?? '');
}

async function cache(): Promise<Cache | null> {
  if (inMemoria) return inMemoria;
  try {
    const testo = await leggiFile(CHIAVE_CACHE);
    inMemoria = testo ? (JSON.parse(testo) as Cache) : null;
  } catch {
    inMemoria = null;
  }
  return inMemoria;
}

export async function leggiContenuti(adesso: Date = new Date()): Promise<EsitoContenuti> {
  const salvata = await cache();
  if (salvata && adesso.getTime() - Date.parse(salvata.letto) < DURATA_CACHE_MS) return { tipo: 'ok', righe: salvata.righe, daCache: true };
  const { data: sessione } = await supabase.auth.getSession();
  if (!sessione.session) return { tipo: 'nonAutenticato' };
  const { data, error } = await supabase.from(TABELLA_CONTENUTI).select(SELEZIONE_CONTENUTI).order('order_index', { ascending: true }).returns<RigaContenuto[]>();
  if (error) {
    if (erroreDiRete(error) && salvata) return { tipo: 'ok', righe: salvata.righe, daCache: true };
    return erroreDiRete(error) ? { tipo: 'rete' } : { tipo: 'errore', messaggio: error.message };
  }
  inMemoria = { righe: data ?? [], letto: adesso.toISOString() };
  scriviFile(CHIAVE_CACHE, JSON.stringify(inMemoria)).catch(() => {});
  return { tipo: 'ok', righe: inMemoria.righe, daCache: false };
}

/** All'uscita: solo la memoria (il file è contenuto pubblico per tutti gli autenticati, resta nella cache). */
export function svuotaContenutiInMemoria(): void {
  inMemoria = null;
}
