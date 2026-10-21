// Conferma della consulenza con confirm_initial_appointment (step 12): parametri della chiamata e traduzione del
// codice di risposta in un esito per le schermate. La funzione del database (censimento step 12, §1) risponde sempre
// `{ success, code, ... }`: `confirmed` o `already_confirmed` con l'appuntamento, altrimenti un codice di rifiuto.
// L'app non decide nulla sul calendario: mostra le schermate che corrispondono al codice.
import { istanteRoma } from '../stato/orarioRoma.ts';
import type { Appuntamento } from '../stato/stato.ts';
import type { OrarioDisponibile } from './orari.ts';

export const FUNZIONE_CONFERMA = 'confirm_initial_appointment';
/** Le due email che la web app invia dopo `confirmed` (fire-and-forget, body { appointmentId }, sessione del cliente). */
export const FUNZIONI_EMAIL_CONFERMA = ['send-appointment-confirmation-v2', 'send-booking-notification-v2'] as const;

/** Parametri PostgREST della RPC: data e ora solo se il cliente ha scelto un orario diverso da quello del funnel. */
export type ParametriConferma = { p_client_id: string; p_date?: string; p_start_time?: string };

export function parametriConferma(clientId: string, scelta: OrarioDisponibile | null): ParametriConferma {
  if (!scelta) return { p_client_id: clientId };
  return { p_client_id: clientId, p_date: scelta.date, p_start_time: oraPerFunzione(scelta.time) };
}

/** `HH:MM` → `HH:MM:00`, il formato che la web app passa a p_start_time (SlotPickerDrawer.tsx:136). */
export function oraPerFunzione(ora: string): string {
  const m = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(ora);
  if (!m) return ora;
  return `${m[1]}:${m[2]}:${m[3] ?? '00'}`;
}

/** Codici di risposta della funzione (sorgente letto da pg_proc). */
export type CodiceConferma = 'confirmed' | 'already_confirmed' | 'slot_taken' | 'day_full' | 'slot_in_past' | 'invalid_status' | 'no_desired_slot' | 'client_not_found' | 'not_authorized';

export type AppuntamentoRisposta = { id: string; date: string; start_time: string; end_time: string | null };
export type RispostaConferma = { success?: boolean; code?: string; appointment?: AppuntamentoRisposta | null; status?: string };

/**
 * Esito per le schermate (decisione 4 dello step 12):
 * - confermata → schermata G, poi le due email in sottofondo;
 * - giaConfermata → rilettura dello stato e home F (niente G né email);
 * - nonDisponibile (slot_taken, day_full) → pannello con l'avviso "non più disponibile", scelta azzerata, orari riletti;
 * - orarioPassato → pannello "orario passato", orari riletti;
 * - statoNonValido → rilettura dello stato;
 * - senzaOrario → pannello di scelta (come D);
 * - errore (client_not_found, not_authorized, risposta inattesa) → Notifica breve di errore.
 */
export type EsitoConferma =
  | { tipo: 'confermata'; appuntamento: Appuntamento }
  | { tipo: 'giaConfermata' }
  | { tipo: 'nonDisponibile' }
  | { tipo: 'orarioPassato' }
  | { tipo: 'statoNonValido' }
  | { tipo: 'senzaOrario' }
  | { tipo: 'errore'; codice: string };

export function appuntamentoDaRisposta(riga: AppuntamentoRisposta | null | undefined): Appuntamento | null {
  if (!riga || !riga.id) return null;
  const istante = istanteRoma(riga.date, riga.start_time);
  if (!istante) return null;
  return {
    id: riga.id,
    data: riga.date,
    ora: riga.start_time.slice(0, 5),
    fine: riga.end_time ? riga.end_time.slice(0, 5) : null,
    istante,
    stato: 'scheduled',
    linkVideochiamata: null,
  };
}

export function interpretaRispostaConferma(risposta: unknown): EsitoConferma {
  const r = (typeof risposta === 'object' && risposta !== null ? risposta : {}) as RispostaConferma;
  const codice = r.code ?? '';
  switch (codice) {
    case 'confirmed': {
      const appuntamento = appuntamentoDaRisposta(r.appointment);
      // Senza un appuntamento leggibile la conferma è comunque avvenuta: si rilegge lo stato (come già confermata).
      return appuntamento ? { tipo: 'confermata', appuntamento } : { tipo: 'giaConfermata' };
    }
    case 'already_confirmed':
      return { tipo: 'giaConfermata' };
    case 'slot_taken':
    case 'day_full':
      return { tipo: 'nonDisponibile' };
    case 'slot_in_past':
      return { tipo: 'orarioPassato' };
    case 'invalid_status':
      return { tipo: 'statoNonValido' };
    case 'no_desired_slot':
      return { tipo: 'senzaOrario' };
    default:
      return { tipo: 'errore', codice: codice || 'risposta_inattesa' };
  }
}

/** Motivo con cui si apre il pannello di scelta (varianti del componente Figma 555:422). */
export type MotivoPannello = 'orarioPassato' | 'nonDisponibile' | 'modifica';

export const TESTI_PANNELLO: Record<MotivoPannello, { titolo: string; avviso: string | null }> = {
  orarioPassato: { titolo: 'Scegli un nuovo orario', avviso: "L'orario che avevi scelto è passato. Scegli un nuovo giorno e un nuovo orario." },
  nonDisponibile: { titolo: 'Scegli un nuovo orario', avviso: 'Questo orario non è più disponibile: è stato appena prenotato. Scegli un nuovo giorno e un nuovo orario.' },
  modifica: { titolo: 'Cambia orario', avviso: null },
};

export const TESTI_NESSUN_ORARIO = {
  titolo: 'Nessun orario disponibile',
  avviso: `Non ci sono orari disponibili nei prossimi 14 giorni. Contatta il supporto: ti aiutiamo noi a fissare la consulenza.`,
} as const;

export const TESTI_CONFERMA = {
  conferma: 'Conferma la consulenza',
  modifica: 'Modifica',
  scegliNuovo: 'Scegli un nuovo orario',
  confermaOrario: 'Conferma orario',
  annulla: 'Annulla',
  chiudi: 'Chiudi',
  selezionaGiorno: 'Seleziona il giorno',
  nonDisponibile: 'N/A',
  orarioPassato: 'Questo orario è passato: scegline uno nuovo.',
  senzaOrario: 'Non hai ancora un orario per la consulenza: scegline uno.',
  errore: 'Non siamo riusciti a confermare la consulenza. Riprova tra poco.',
  erroreOrari: 'Non riusciamo a caricare gli orari disponibili. Riprova tra poco.',
  tornaAllaHome: 'Torna alla home',
} as const;

/** Testi della schermata G (Figma 550:3890). */
export const TESTI_CONFERMATA = {
  titoloPrima: 'Prenotazione della consulenza ',
  titoloAccento: 'confermata',
  titoloDopo: '!',
  passi: 'I prossimi passi:',
  righe: [
    { icona: 'Email', testo: 'Email con alcune indicazioni' },
    { icona: 'Campanella attiva', testo: 'Reminder il giorno prima' },
    { icona: 'Link', testo: 'Trovi il link anche in App' },
  ],
} as const;
