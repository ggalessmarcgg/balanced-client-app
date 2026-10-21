// Account (step 11, lotto 3): abbonamento dalla edge function get-client-subscription (Stripe, solo lettura, cache in
// memoria di un'ora come la web app), promemoria del diario scritti su clients (due colonne, cascata in core/account),
// pagine web di privacy e termini. Le statistiche e il profilo vengono dallo stato già letto all'avvio.
import * as WebBrowser from 'expo-web-browser';

import { abbonamentoDa, DURATA_CACHE_ABBONAMENTO_MS, FUNZIONE_ABBONAMENTO, type Abbonamento, type RispostaAbbonamento, type ScritturaPromemoria } from '@/core/account/account';
import { dataOraRoma } from '@/core/stato/orarioRoma';
import { TABELLA_STATO } from '@/core/stato/letture';
import { supabase } from '@/servizi/supabase';

export type EsitoAbbonamento = { tipo: 'ok'; abbonamento: Abbonamento | null } | { tipo: 'errore' };

let abbonamentoInMemoria: { valore: Abbonamento | null; letto: number } | null = null;

const dataRoma = (istante: Date) => dataOraRoma(istante).data;

/**
 * Abbonamento del cliente: una chiamata alla function con la sessione dell'utente (verify_jwt), al massimo una
 * volta l'ora; senza cliente Stripe (clienti v1) non si chiama nulla. Errore → la card mostra il testo di riserva.
 */
export async function leggiAbbonamento(conStripe: boolean, adesso: Date = new Date()): Promise<EsitoAbbonamento> {
  if (!conStripe) return { tipo: 'ok', abbonamento: null };
  if (abbonamentoInMemoria && adesso.getTime() - abbonamentoInMemoria.letto < DURATA_CACHE_ABBONAMENTO_MS) return { tipo: 'ok', abbonamento: abbonamentoInMemoria.valore };
  try {
    const { data, error } = await supabase.functions.invoke<RispostaAbbonamento>(FUNZIONE_ABBONAMENTO, { method: 'GET' });
    if (error) return { tipo: 'errore' };
    const abbonamento = abbonamentoDa(data, dataRoma);
    abbonamentoInMemoria = { valore: abbonamento, letto: adesso.getTime() };
    return { tipo: 'ok', abbonamento };
  } catch {
    return { tipo: 'errore' };
  }
}

export function svuotaAccountInMemoria(): void {
  abbonamentoInMemoria = null;
}

/**
 * Promemoria: una sola modifica su clients per id (policy per user_id = auth.uid()), solo le colonne della cascata.
 * Il trigger Klaviyo scatta su ogni UPDATE ma invia solo se cambia status (censimento §6). false se non è andata.
 */
export async function scriviPromemoria(clientId: string, scrittura: ScritturaPromemoria): Promise<boolean> {
  if (Object.keys(scrittura).length === 0) return true;
  try {
    const { data, error } = await supabase.from(TABELLA_STATO).update(scrittura).eq('id', clientId).select('id').returns<{ id: string }[]>();
    if (error) return false;
    return Boolean(data && data.length > 0);
  } catch {
    return false;
  }
}

/** Informativa privacy e termini: pagine del sito nel browser interno all'app (expo-web-browser, approvato il 21/10/2026). */
export async function apriPaginaWeb(url: string): Promise<boolean> {
  try {
    await WebBrowser.openBrowserAsync(url, { presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET, dismissButtonStyle: 'close' });
    return true;
  } catch {
    return false;
  }
}
