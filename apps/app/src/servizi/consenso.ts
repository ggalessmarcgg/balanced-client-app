// Consenso alle funzioni AI (step 6, contratto notifiche v0.2 §8): l'ultima riga di client_consents del cliente in
// sessione, letta all'avvio e tenuta in memoria (useSyncExternalStore); "Accetto" e l'interruttore in Account inseriscono
// una riga (granted / revoked) con la sessione del cliente (RLS: solo lettura e inserimento delle proprie righe).
import Constants from 'expo-constants';
import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

import { classificaErrore } from '@/core/accesso/errori';
import { consensoValido, rigaConsenso, SELEZIONE_CONSENSO, TABELLA_CONSENSI, TIPO_CONSENSO_AI, type AzioneConsenso, type RigaConsenso } from '@/core/consenso/consenso';
import { supabase } from '@/servizi/supabase';

export type MemoriaConsenso = { clientId: string | null; letto: boolean; ultima: RigaConsenso | null };
export type EsitoLetturaConsenso = { tipo: 'ok' } | { tipo: 'nonAutenticato' } | { tipo: 'rete' } | { tipo: 'errore'; messaggio: string };

const VUOTA: MemoriaConsenso = { clientId: null, letto: false, ultima: null };
let memoria: MemoriaConsenso = VUOTA;
const ascoltatori = new Set<() => void>();
let letturaInCorso: Promise<EsitoLetturaConsenso> | null = null;

function aggiorna(nuova: MemoriaConsenso): void {
  memoria = nuova;
  for (const a of ascoltatori) a();
}
function iscriviti(a: () => void): () => void {
  ascoltatori.add(a);
  return () => {
    ascoltatori.delete(a);
  };
}
export function memoriaConsenso(): MemoriaConsenso {
  return memoria;
}
export function useMemoriaConsenso(): MemoriaConsenso {
  return useSyncExternalStore(iscriviti, memoriaConsenso);
}

/** true/false quando l'ultima riga è nota per il cliente; null finché non è stata letta (o senza rete). */
export function consensoAIValido(clientId: string): boolean | null {
  if (memoria.clientId !== clientId || !memoria.letto) return null;
  return consensoValido(memoria.ultima);
}

function piattaforma(): 'android' | 'ios' {
  return Platform.OS === 'android' ? 'android' : 'ios';
}

/** Una lettura leggera (ultima riga per tipo) all'avvio dell'app e quando serve il consenso; una sola in corso. */
export function leggiConsenso(clientId: string): Promise<EsitoLetturaConsenso> {
  if (letturaInCorso && memoria.clientId === clientId) return letturaInCorso;
  if (memoria.clientId !== clientId) aggiorna({ clientId, letto: false, ultima: null });
  letturaInCorso = (async () => {
    try {
      const { data, error } = await supabase
        .from(TABELLA_CONSENSI)
        .select(SELEZIONE_CONSENSO)
        .eq('client_id', clientId)
        .eq('kind', TIPO_CONSENSO_AI)
        .order('created_at', { ascending: false })
        .limit(1)
        .returns<RigaConsenso[]>();
      if (error) {
        const rete = classificaErrore(error) === 'rete' || error.code === '' || /network|fetch|offline/i.test(error.message ?? '');
        return rete ? { tipo: 'rete' as const } : { tipo: 'errore' as const, messaggio: error.message };
      }
      if (memoria.clientId === clientId) aggiorna({ clientId, letto: true, ultima: data?.[0] ?? null });
      return { tipo: 'ok' as const };
    } catch (e) {
      return { tipo: 'errore' as const, messaggio: e instanceof Error ? e.message : 'errore' };
    } finally {
      letturaInCorso = null;
    }
  })();
  return letturaInCorso;
}

/**
 * "Accetto" (carosello o pannello al primo uso) → granted; interruttore spento in Account → revoked; riacceso → granted.
 * La memoria si aggiorna solo con la riga restituita dal server. false se la scrittura non è andata.
 */
export async function registraConsensoAI(clientId: string, action: AzioneConsenso): Promise<boolean> {
  try {
    const { data: sessione } = await supabase.auth.getSession();
    const userId = sessione.session?.user.id;
    if (!userId) return false;
    const riga = rigaConsenso(action, clientId, userId, Constants.expoConfig?.version ?? null, piattaforma());
    const { data, error } = await supabase.from(TABELLA_CONSENSI).insert(riga).select(SELEZIONE_CONSENSO).returns<RigaConsenso[]>();
    const inserita = data?.[0];
    if (error || !inserita) return false;
    aggiorna({ clientId, letto: true, ultima: inserita });
    return true;
  } catch {
    return false;
  }
}

/** All'uscita dall'account. */
export function svuotaConsenso(): void {
  aggiorna(VUOTA);
}
