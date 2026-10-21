// Lettura dello stato del cliente: una sola richiesta all'avvio (clients per user_id con le tabelle collegate),
// risultato tenuto in memoria per la sessione e salvato nel portachiavi per ripartire anche senza rete.
import { classificaErrore } from '@/core/accesso/errori';
import type { DatiAccount } from '@/core/account/account';
import { datiDaRiga, SELEZIONE_STATO, TABELLA_STATO, type RigaStato } from '@/core/stato/letture';
import { calcolaStato, type StatoCliente } from '@/core/stato/stato';
import { leggi, rimuovi, scrivi } from '@/servizi/archivio';
import { supabase } from '@/servizi/supabase';

export type EsitoStato =
  | { tipo: 'ok'; stato: StatoCliente; daCache: boolean }
  | { tipo: 'nonAutenticato' }
  | { tipo: 'rete' }
  | { tipo: 'errore'; messaggio: string };

const CHIAVE_CACHE = 'balanced.stato';
type Cache = { userId: string; riga: RigaStato | null; letto: string };

let inMemoria: StatoCliente | null = null;
let ultimaCache: Cache | null = null;

/** Stato già letto in questa sessione dell'app (null se non ancora letto o dopo l'uscita). */
export function statoCorrente(): StatoCliente | null {
  return inMemoria;
}

export function svuotaStatoInMemoria(): void {
  inMemoria = null;
  ultimaCache = null;
}

export async function svuotaCacheStato(): Promise<void> {
  inMemoria = null;
  ultimaCache = null;
  await rimuovi(CHIAVE_CACHE);
}

/**
 * Dopo una scrittura dell'Account andata a buon fine (promemoria): aggiorna il profilo in memoria e la riga salvata,
 * così la schermata mostra il valore nuovo anche senza rileggere lo stato.
 */
export function aggiornaAccountInMemoria(modifica: Partial<DatiAccount>, colonne: Record<string, boolean | string | null>): void {
  if (inMemoria && 'profilo' in inMemoria) {
    inMemoria = { ...inMemoria, profilo: { ...inMemoria.profilo, account: { ...inMemoria.profilo.account, ...modifica } } };
  }
  if (ultimaCache?.riga) {
    ultimaCache = { ...ultimaCache, riga: { ...ultimaCache.riga, ...colonne } };
    scrivi(CHIAVE_CACHE, JSON.stringify(ultimaCache)).catch(() => {});
  }
}

async function cacheDi(userId: string): Promise<RigaStato | null | undefined> {
  try {
    const testo = await leggi(CHIAVE_CACHE);
    if (!testo) return undefined;
    const cache = JSON.parse(testo) as Cache;
    return cache.userId === userId ? cache.riga : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Legge lo stato. `forza` ignora la copia in memoria (ma non la rete: se manca, usa la cache salvata).
 * Senza sessione → nonAutenticato. Errore di rete senza cache → rete. Altro errore → errore.
 */
export async function leggiStato({ forza = false } = {}): Promise<EsitoStato> {
  if (inMemoria && !forza) return { tipo: 'ok', stato: inMemoria, daCache: false };

  const { data: sessione, error: erroreSessione } = await supabase.auth.getSession();
  if (erroreSessione) return { tipo: 'errore', messaggio: erroreSessione.message };
  const userId = sessione.session?.user.id;
  if (!userId) return { tipo: 'nonAutenticato' };

  const { data, error } = await supabase.from(TABELLA_STATO).select(SELEZIONE_STATO).eq('user_id', userId).maybeSingle<RigaStato>();
  if (error) {
    const tipo = classificaErrore(error);
    const rete = tipo === 'rete' || error.code === '' || /network|fetch/i.test(error.message);
    if (rete) {
      const salvata = await cacheDi(userId);
      if (salvata !== undefined) {
        ultimaCache = { userId, riga: salvata, letto: new Date().toISOString() };
        inMemoria = calcolaStato(datiDaRiga(salvata), new Date());
        return { tipo: 'ok', stato: inMemoria, daCache: true };
      }
      return { tipo: 'rete' };
    }
    return { tipo: 'errore', messaggio: error.message };
  }

  inMemoria = calcolaStato(datiDaRiga(data), new Date());
  const cache: Cache = { userId, riga: data, letto: new Date().toISOString() };
  ultimaCache = cache;
  scrivi(CHIAVE_CACHE, JSON.stringify(cache)).catch(() => {});
  return { tipo: 'ok', stato: inMemoria, daCache: false };
}
