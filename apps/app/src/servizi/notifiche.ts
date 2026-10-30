// Notifiche in app (step 11, lotto 3; censimento §8): una lettura di client_notifications per user_id, ultimi 7 giorni,
// limite 50, colonne esplicite, promemoria esclusi nella richiesta (mai la lettura senza filtro della web app:
// 15 ore di CPU in 4 mesi). Righe in memoria (useSyncExternalStore) e su file per ripartire senza rete; due
// scritture: viewed_at su tutte le righe non viste all'apertura dell'elenco, clicked_at sulla riga toccata.
import { useSyncExternalStore } from 'react';

import { classificaErrore } from '@/core/accesso/errori';
import { daQuando, FILTRO_TIPI_ESCLUSI, idDaSegnareViste, LIMITE_NOTIFICHE, nuoveDaLeggere, segnaCliccata, segnaViste, segnaVistePerId, SELEZIONE_NOTIFICHE, TABELLA_NOTIFICHE, type RigaNotifica } from '@/core/notifiche/notifiche';
import { leggiFile, rimuoviFile, scriviFile } from '@/servizi/archivioFile';
import { supabase } from '@/servizi/supabase';

export type MemoriaNotifiche = { userId: string | null; righe: RigaNotifica[] | null };
export type EsitoNotifiche = { tipo: 'ok'; daCache: boolean } | { tipo: 'nonAutenticato' } | { tipo: 'rete' } | { tipo: 'errore'; messaggio: string };

const VUOTA: MemoriaNotifiche = { userId: null, righe: null };
const CHIAVE_CACHE = 'balanced.notifiche';
type Cache = { userId: string; righe: RigaNotifica[]; letto: string };

let memoria: MemoriaNotifiche = VUOTA;
const ascoltatori = new Set<() => void>();

function aggiorna(modifica: Partial<MemoriaNotifiche>): void {
  memoria = { ...memoria, ...modifica };
  for (const a of ascoltatori) a();
}
function iscriviti(a: () => void): () => void {
  ascoltatori.add(a);
  return () => {
    ascoltatori.delete(a);
  };
}
export function memoriaNotifiche(): MemoriaNotifiche {
  return memoria;
}
export function useMemoriaNotifiche(): MemoriaNotifiche {
  return useSyncExternalStore(iscriviti, memoriaNotifiche);
}
function nuove(): boolean {
  return memoria.righe !== null && nuoveDaLeggere(memoria.righe, new Date());
}
/** Pallino rosso sulla campanella: almeno una notifica dell'elenco non ancora vista. */
export function useNotificheNuove(): boolean {
  return useSyncExternalStore(iscriviti, nuove);
}

function erroreDiRete(error: { code?: string | null; message?: string | null; name?: string | null; status?: number | null }): boolean {
  return classificaErrore(error) === 'rete' || error.code === '' || /network|fetch|offline/i.test(error.message ?? '');
}

async function cacheDi(userId: string): Promise<RigaNotifica[] | null> {
  try {
    const testo = await leggiFile(CHIAVE_CACHE);
    const cache = testo ? (JSON.parse(testo) as Partial<Cache>) : null;
    return cache && cache.userId === userId && Array.isArray(cache.righe) ? cache.righe : null;
  } catch {
    return null;
  }
}

function persisti(): void {
  if (!memoria.userId || !memoria.righe) return;
  const cache: Cache = { userId: memoria.userId, righe: memoria.righe, letto: new Date().toISOString() };
  scriviFile(CHIAVE_CACHE, JSON.stringify(cache)).catch(() => {});
}

/** Lettura (all'avvio dell'app dell'abbonato, al rientro in primo piano e all'apertura dell'elenco). */
export async function caricaNotifiche(adesso: Date = new Date()): Promise<EsitoNotifiche> {
  const { data: sessione } = await supabase.auth.getSession();
  const userId = sessione.session?.user.id;
  if (!userId) return { tipo: 'nonAutenticato' };
  if (memoria.userId !== userId) aggiorna({ userId, righe: null });
  if (memoria.righe === null) {
    const salvate = await cacheDi(userId);
    if (salvate && memoria.righe === null) aggiorna({ userId, righe: salvate });
  }
  const { data, error } = await supabase
    .from(TABELLA_NOTIFICHE)
    .select(SELEZIONE_NOTIFICHE)
    .eq('user_id', userId)
    .gte('created_at', daQuando(adesso))
    .not('notification_type', 'in', FILTRO_TIPI_ESCLUSI)
    .order('created_at', { ascending: false })
    .limit(LIMITE_NOTIFICHE)
    .returns<RigaNotifica[]>();
  if (error) {
    if (erroreDiRete(error)) return memoria.righe ? { tipo: 'ok', daCache: true } : { tipo: 'rete' };
    return { tipo: 'errore', messaggio: error.message };
  }
  aggiorna({ userId, righe: data ?? [] });
  persisti();
  return { tipo: 'ok', daCache: false };
}

/** Avvio e rientro in primo piano: lettura in silenzio per il pallino (gli errori non si mostrano). */
export function aggiornaNotifiche(): void {
  caricaNotifiche().catch(() => {});
}

/**
 * All'apertura dell'elenco: le righe non viste diventano viste, in memoria subito e con una sola modifica sul server
 * (where user_id = auth.uid() and viewed_at is null, come la web app). Se la scrittura fallisce resta la memoria:
 * si riproverà alla prossima apertura.
 */
export async function segnaTutteViste(adesso: Date = new Date()): Promise<void> {
  const { userId, righe } = memoria;
  if (!userId || !righe || !righe.some((r) => r.viewed_at === null)) return;
  aggiorna({ righe: segnaViste(righe, adesso) });
  persisti();
  try {
    await supabase.from(TABELLA_NOTIFICHE).update({ viewed_at: adesso.toISOString() }).eq('user_id', userId).is('viewed_at', null);
  } catch {
    // senza rete: la memoria resta vista, il server si allinea alla prossima apertura
  }
}

/**
 * Notifiche lette quando il contenuto è stato visto (step 6, 31/10/2026): all'apertura di una giornata (pannello) o di
 * una revisione, da qualunque percorso, le righe in memoria non ancora viste con lo stesso riferimento diventano viste
 * subito (campanella aggiornata) e con una sola scrittura (viewed_at, lo stesso segno della web app, where id in …).
 * Senza righe da segnare nessuna scrittura. Caso limite: aperta da una push ad app chiusa, con l'elenco non ancora
 * caricato, si usa l'identificativo della notifica arrivato nei dati della push. Nessuna lettura in più.
 */
export async function segnaVisteContenuto(riferimento: string, notificaId: string | null = null, adesso: Date = new Date()): Promise<string[]> {
  const { userId, righe } = memoria;
  const ids = righe ? idDaSegnareViste(righe, riferimento) : notificaId ? [notificaId] : [];
  if (ids.length === 0) return ids;
  if (righe) {
    aggiorna({ righe: segnaVistePerId(righe, ids, adesso) });
    persisti();
  }
  try {
    let q = supabase.from(TABELLA_NOTIFICHE).update({ viewed_at: adesso.toISOString() }).in('id', ids).is('viewed_at', null);
    if (userId) q = q.eq('user_id', userId);
    await q;
  } catch {
    // senza rete: la memoria resta vista, il server si allinea alla prossima apertura dell'elenco
  }
  return ids;
}

/** Al tocco di una riga: clicked_at su quella sola riga (where id), in memoria subito. */
export function segnaCliccataNotifica(id: string, adesso: Date = new Date()): void {
  const { userId, righe } = memoria;
  if (!userId || !righe) return;
  const riga = righe.find((r) => r.id === id);
  if (!riga || riga.clicked_at !== null) return;
  aggiorna({ righe: segnaCliccata(righe, id, adesso) });
  persisti();
  supabase
    .from(TABELLA_NOTIFICHE)
    .update({ clicked_at: adesso.toISOString() })
    .eq('id', id)
    .then(() => {}, () => {});
}

/** All'uscita: memoria e copia su file. */
export async function svuotaNotifiche(): Promise<void> {
  memoria = VUOTA;
  for (const a of ascoltatori) a();
  await rimuoviFile(CHIAVE_CACHE);
}
