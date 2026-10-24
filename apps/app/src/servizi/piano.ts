// Piano alimentare (step 8, lotto 1): una sola lettura, la funzione get_my_current_nutrition_plan con la versione
// nota (id + updated_at della copia). "invariato" → si tiene la copia; "piano" → si sostituisce; "nessun_piano" → si
// cancella. Copia su file per cliente nella cache (balanced.piano.<clientId>), servita subito e senza rete; memoria di
// sessione con l'esito dell'ultima chiamata per la vista di sviluppo. Nessuna lettura delle tabelle, nessuna scrittura.
import { useSyncExternalStore } from 'react';

import { classificaErrore } from '@/core/accesso/errori';
import { FUNZIONE_PIANO, interpretaRisposta, parametriVersione, type PianoServer } from '@/core/piano/tipi';
import { leggiFile, rimuoviFile, scriviFile } from '@/servizi/archivioFile';
import { supabase } from '@/servizi/supabase';

export type EsitoChiamata = 'piano' | 'invariato' | 'nessun_piano' | 'rete' | 'errore' | 'nonAutenticato';
export type UltimaChiamata = { esito: EsitoChiamata; quando: string; messaggio?: string };
export type MemoriaPiano = {
  clientId: string | null;
  /** La copia del piano corrente; null = nessun piano noto (in elaborazione) o non ancora letto (vedi `noto`). */
  piano: PianoServer | null;
  /** Vero quando l'assenza di piano è un esito del server (nessun_piano) o della copia, non una lettura mancante. */
  noto: boolean;
  origine: 'file' | 'server' | null;
  ultimaChiamata: UltimaChiamata | null;
};
export type EsitoPiano = { tipo: 'ok'; piano: PianoServer | null; daCache: boolean } | { tipo: 'nonAutenticato' } | { tipo: 'rete' } | { tipo: 'errore'; messaggio: string };

const PREFISSO_CACHE = 'balanced.piano';
type Cache = { clientId: string; piano: PianoServer; letto: string };

const VUOTA: MemoriaPiano = { clientId: null, piano: null, noto: false, origine: null, ultimaChiamata: null };
let memoria: MemoriaPiano = VUOTA;
const ascoltatori = new Set<() => void>();
const inCorso = new Map<string, Promise<EsitoPiano>>();

function aggiorna(modifica: Partial<MemoriaPiano>): void {
  memoria = { ...memoria, ...modifica };
  for (const a of ascoltatori) a();
}
function iscriviti(a: () => void): () => void {
  ascoltatori.add(a);
  return () => {
    ascoltatori.delete(a);
  };
}
export function memoriaPiano(): MemoriaPiano {
  return memoria;
}
export function useMemoriaPiano(): MemoriaPiano {
  return useSyncExternalStore(iscriviti, memoriaPiano);
}

function chiave(clientId: string): string {
  return `${PREFISSO_CACHE}.${clientId}`;
}

function erroreDiRete(error: { code?: string | null; message?: string | null; name?: string | null; status?: number | null }): boolean {
  return classificaErrore(error) === 'rete' || error.code === '' || /network|fetch|offline/i.test(error.message ?? '');
}

async function copiaSuFile(clientId: string): Promise<PianoServer | null> {
  try {
    const testo = await leggiFile(chiave(clientId));
    const cache = testo ? (JSON.parse(testo) as Partial<Cache>) : null;
    return cache && cache.clientId === clientId && cache.piano ? cache.piano : null;
  } catch {
    return null;
  }
}

function registra(esito: EsitoChiamata, messaggio?: string, resto: Partial<MemoriaPiano> = {}): void {
  aggiorna({ ...resto, ultimaChiamata: { esito, quando: new Date().toISOString(), ...(messaggio ? { messaggio } : {}) } });
}

async function leggi(clientId: string): Promise<EsitoPiano> {
  const { data: sessione } = await supabase.auth.getSession();
  if (!sessione.session) return { tipo: 'nonAutenticato' };
  if (memoria.clientId !== clientId) aggiorna({ ...VUOTA, clientId });
  // Copia su file: servita subito (la schermata la mostra mentre arriva il server) e usata come versione nota.
  if (!memoria.noto) {
    const copia = await copiaSuFile(clientId);
    if (copia && memoria.clientId === clientId && !memoria.noto) aggiorna({ piano: copia, noto: true, origine: 'file' });
  }
  const copia = memoria.piano;
  const parametri = parametriVersione(copia);
  const { data, error } = parametri ? await supabase.rpc(FUNZIONE_PIANO, parametri) : await supabase.rpc(FUNZIONE_PIANO);
  if (error) {
    if (erroreDiRete(error)) {
      registra('rete');
      return memoria.noto ? { tipo: 'ok', piano: copia, daCache: true } : { tipo: 'rete' };
    }
    registra('errore', error.message);
    return { tipo: 'errore', messaggio: error.message };
  }
  const risposta = interpretaRisposta(data);
  if (!risposta) {
    registra('errore', 'risposta non riconosciuta');
    return { tipo: 'errore', messaggio: 'Risposta del piano non riconosciuta.' };
  }
  switch (risposta.esito) {
    case 'invariato':
      registra('invariato');
      return { tipo: 'ok', piano: copia, daCache: false };
    case 'nessun_piano':
      registra('nessun_piano', undefined, { piano: null, noto: true, origine: 'server' });
      rimuoviFile(chiave(clientId)).catch(() => {});
      return { tipo: 'ok', piano: null, daCache: false };
    case 'piano': {
      registra('piano', undefined, { piano: risposta.piano, noto: true, origine: 'server' });
      const cache: Cache = { clientId, piano: risposta.piano, letto: new Date().toISOString() };
      scriviFile(chiave(clientId), JSON.stringify(cache)).catch(() => {});
      return { tipo: 'ok', piano: risposta.piano, daCache: false };
    }
  }
}

/** Lettura del piano corrente: una sola chiamata in corso per cliente (avvio, rientro e scheda Piano possono coincidere). */
export function leggiPiano(clientId: string): Promise<EsitoPiano> {
  const pendente = inCorso.get(clientId);
  if (pendente) return pendente;
  const promessa = leggi(clientId).finally(() => {
    inCorso.delete(clientId);
  });
  inCorso.set(clientId, promessa);
  return promessa;
}

/** All'avvio dell'app dell'abbonato e al ritorno in primo piano: la copia si aggiorna in silenzio. */
export function aggiornaPiano(clientId: string): void {
  leggiPiano(clientId).catch(() => {});
}

/** All'uscita: memoria e copia su file del cliente (il file sta nella cache, che viene comunque svuotata). */
export async function svuotaPiano(): Promise<void> {
  const clientId = memoria.clientId;
  memoria = VUOTA;
  for (const a of ascoltatori) a();
  if (clientId) await rimuoviFile(chiave(clientId));
}
