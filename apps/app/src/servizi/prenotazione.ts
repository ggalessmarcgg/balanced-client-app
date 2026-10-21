// Conferma e cambio dell'orario della consulenza (step 12): le stesse due funzioni del database della web app,
// nessuna logica di prenotazione nuova (censimento ~/Desktop/censimenti-app/step12-censimento-stati.md, §1 e §3).
// - Orari: get_nutritionist_available_slots_v2 con il solo p_nutritionist_id (default 14 giorni, 8 ore), una chiamata
//   all'apertura del pannello, dopo slot_taken/day_full e su "Riprova"; mai al cambio di scheda. Una ripetizione
//   silenziosa dopo 300 ms su errore, come il funnel.
// - Conferma: confirm_initial_appointment con p_client_id e, se il cliente ha scelto un orario diverso, p_date e
//   p_start_time ("HH:MM:00"). Scrive una riga in appointments e clients.status (lo fa la funzione, non l'app).
// - Dopo `confirmed`: le due email della web app (send-appointment-confirmation-v2, send-booking-notification-v2)
//   con body { appointmentId } e la sessione del cliente, una sola volta per appuntamento; un errore si registra
//   senza bloccare il cliente.
import { FUNZIONE_CONFERMA, FUNZIONI_EMAIL_CONFERMA, interpretaRispostaConferma, parametriConferma, type EsitoConferma } from '@/core/prenotazione/conferma';
import { conUnaRipetizione, normalizzaOrari, type OrarioDisponibile } from '@/core/prenotazione/orari';
import { supabase } from '@/servizi/supabase';

export const FUNZIONE_ORARI = 'get_nutritionist_available_slots_v2';

export type EsitoOrari = { tipo: 'ok'; orari: OrarioDisponibile[] } | { tipo: 'errore'; messaggio: string };

async function chiamaOrari(nutritionistId: string): Promise<OrarioDisponibile[]> {
  const { data, error } = await supabase.rpc(FUNZIONE_ORARI, { p_nutritionist_id: nutritionistId });
  if (error) throw error;
  return normalizzaOrari(data);
}

/** Orari liberi della nutrizionista del cliente (clients.nutritionist_id, come la web app). Elenco vuoto = "Nessun orario". */
export async function leggiOrari(nutritionistId: string): Promise<EsitoOrari> {
  try {
    return { tipo: 'ok', orari: await conUnaRipetizione(() => chiamaOrari(nutritionistId)) };
  } catch (e) {
    return { tipo: 'errore', messaggio: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Conferma della consulenza. `scelta` null = l'orario del funnel (quello del lead), altrimenti l'orario scelto nel
 * pannello. Un errore di trasporto (rete, PostgREST) diventa un esito `errore` con il messaggio.
 */
export async function confermaConsulenza(clientId: string, scelta: OrarioDisponibile | null): Promise<EsitoConferma> {
  try {
    const { data, error } = await supabase.rpc(FUNZIONE_CONFERMA, parametriConferma(clientId, scelta));
    if (error) return { tipo: 'errore', codice: error.code || error.message || 'errore_chiamata' };
    return interpretaRispostaConferma(data);
  } catch (e) {
    return { tipo: 'errore', codice: e instanceof Error ? e.message : 'errore_chiamata' };
  }
}

const emailInviate = new Set<string>();

/**
 * Email di conferma alla cliente e avviso interno a supporto e nutrizionista, in sottofondo e una sola volta per
 * appuntamento in questa sessione (la web app le invia allo stesso modo, Calendar.tsx:127-136). Richiedono la
 * sessione dell'utente (verify_jwt). Gli errori non bloccano il cliente: si registrano soltanto.
 */
export function inviaEmailConferma(appointmentId: string): void {
  if (!appointmentId || emailInviate.has(appointmentId)) return;
  emailInviate.add(appointmentId);
  for (const funzione of FUNZIONI_EMAIL_CONFERMA) {
    supabase.functions
      .invoke(funzione, { body: { appointmentId } })
      .then(({ error }) => {
        if (error && __DEV__) console.warn(`[prenotazione] ${funzione} non riuscita`, error.message);
      })
      .catch((e: unknown) => {
        if (__DEV__) console.warn(`[prenotazione] ${funzione} non riuscita`, e);
      });
  }
}

export function svuotaPrenotazioneInMemoria(): void {
  emailInviate.clear();
}
