// Lettura unica dello stato all'avvio: una sola richiesta PostgREST su clients (per user_id, con l'indice
// clients_user_id_idx) con le tabelle collegate incorporate tramite le chiavi esterne, elencando solo le
// colonne necessarie. Le policy RLS si applicano a ogni tabella incorporata; su consultation_leads_v2 il
// ruolo authenticated ha il grant solo su alcune colonne (mai nutritionist_id: si prende da clients).
import { COLONNE_ACCOUNT } from '../account/account.ts';
import type { AppuntamentoRiga, ClienteRiga, DatiStato, LeadSlotRiga, NutrizionistaRiga } from './stato.ts';

export const TABELLA_STATO = 'clients';

export const SELEZIONE_STATO = [
  'id',
  'status',
  'full_name',
  'gender',
  'nutritionist_id',
  'consultation_lead_v2_id',
  // Stati C e D (step 12): telefono del cliente nella card "I tuoi dati".
  'phone_number',
  // Account (step 11): email, giornate condivise, promemoria, presenza del cliente Stripe (mai la chiave).
  ...COLONNE_ACCOUNT,
  // clients.consultation_lead_v2_id → consultation_leads_v2.id (ci sono due FK tra le due tabelle: serve il nome)
  'consultation_leads_v2!clients_consultation_lead_v2_id_fkey(desired_date,desired_start_time)',
  // appointments.client_id → clients.id: incorporare per client_id esclude le righe v1 (client_id nullo); end_time dallo step 12
  'appointments!appointments_client_id_fkey(id,appointment_date,start_time,end_time,status,meeting_url)',
  // clients.nutritionist_id → nutritionist_profiles.id (mai profile_image_url né email); specializzazione e numero d'ordine dallo step 12
  'nutritionist_profiles!clients_nutritionist_id_fkey(id,full_name,title,app_square_photo_url,expertise,registration_number)',
].join(',');

/** Forma della riga restituita da PostgREST con SELEZIONE_STATO. */
export type RigaStato = ClienteRiga & {
  consultation_leads_v2: LeadSlotRiga | null;
  appointments: AppuntamentoRiga[] | null;
  nutritionist_profiles: NutrizionistaRiga | null;
};

export function datiDaRiga(riga: RigaStato | null): DatiStato {
  if (!riga) return { cliente: null, lead: null, appuntamenti: [], nutrizionista: null };
  const { consultation_leads_v2, appointments, nutritionist_profiles, ...cliente } = riga;
  return { cliente, lead: consultation_leads_v2, appuntamenti: appointments ?? [], nutrizionista: nutritionist_profiles };
}
