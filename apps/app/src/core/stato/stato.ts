// Smistamento per stato del cliente (mappa dell'app, stati A–L). Funzione pura: riceve le righe lette dal
// database e l'istante corrente, restituisce lo stato da mostrare. Regole dal censimento dello step 3
// (~/Desktop/censimenti-app/step3-censimento-accesso.md, §3), identiche alla web app dove la web app decide.
import { istanteRoma } from './orarioRoma.ts';

/** Valori di clients.status (CHECK clients_status_check). */
export type StatoClienteDb = 'not_confirmed' | 'booked' | 'subscribed' | 'churned';
/** Valori di appointments.status (CHECK appointments_status_check). */
export type StatoAppuntamentoDb = 'scheduled' | 'completed' | 'cancelled' | 'no_show';

/** Riga di clients letta per user_id = auth.uid(), con le sole colonne che servono allo smistamento. */
export type ClienteRiga = {
  id: string;
  status: string;
  full_name: string | null;
  gender: string | null;
  nutritionist_id: string | null;
  consultation_lead_v2_id: string | null;
};
/** Slot desiderato in consultation_leads_v2: solo colonne concesse al ruolo authenticated (mai nutritionist_id). */
export type LeadSlotRiga = { desired_date: string | null; desired_start_time: string | null };
/** Riga di appointments, già filtrata per client_id. */
export type AppuntamentoRiga = { id: string; appointment_date: string; start_time: string; status: string; meeting_url: string | null };
/** Riga di nutritionist_profiles (mai profile_image_url: è in base64). */
export type NutrizionistaRiga = { id: string; full_name: string | null; title: string | null; app_square_photo_url: string | null };

export type DatiStato = {
  cliente: ClienteRiga | null;
  lead: LeadSlotRiga | null;
  appuntamenti: AppuntamentoRiga[];
  nutrizionista: NutrizionistaRiga | null;
};

export type Genere = 'female' | 'male' | 'other';
export type Nutrizionista = { id: string; nome: string; foto: string | null };
export type Profilo = { clientId: string; nome: string; genere: Genere | null; nutrizionista: Nutrizionista | null };
export type Slot = { data: string; ora: string; istante: Date };
export type Appuntamento = Slot & { id: string; stato: StatoAppuntamentoDb; linkVideochiamata: string | null };

/**
 * Stati della mappa. A (non autenticato) e B (email non confermata) non nascono dai dati ma dalla sessione
 * e dall'errore di login; E (orario non più disponibile) e G (appena prenotata) sono stati di interfaccia.
 */
export type StatoCliente =
  | { codice: 'A' }
  | { codice: 'B'; email: string }
  | { codice: 'C'; profilo: Profilo; slot: Slot }
  | { codice: 'D'; profilo: Profilo; slot: Slot | null }
  | { codice: 'F'; profilo: Profilo; appuntamento: Appuntamento | null }
  | { codice: 'G'; profilo: Profilo; appuntamento: Appuntamento }
  | { codice: 'H'; profilo: Profilo }
  | { codice: 'I'; profilo: Profilo }
  | { codice: 'J'; profilo: Profilo }
  | { codice: 'K'; profilo: Profilo }
  | { codice: 'L' };
export type CodiceStato = StatoCliente['codice'];

/** Dopo la consulenza: scheduled con inizio + 45 minuti passato (stessa euristica della web app). */
export const MINUTI_DOPO_INIZIO_CONSULENZA = 45;
const MINUTO_MS = 60_000;

export const NOMI_STATI: Record<CodiceStato, string> = {
  A: 'Non autenticato',
  B: 'Email non confermata',
  C: 'Consulenza da confermare',
  D: 'Orario passato senza conferma',
  F: 'Prenotato, prima della consulenza',
  G: 'Appena prenotata',
  H: 'Dopo la consulenza, non abbonato',
  I: 'Consulenza non svolta (no-show)',
  J: 'Abbonato',
  K: 'Percorso concluso',
  L: 'Account non collegato',
};

/** Primo nome dal nome completo (per i saluti "Ciao Giulia,"). */
export function primoNome(nomeCompleto: string | null | undefined): string {
  return (nomeCompleto ?? '').trim().split(/\s+/)[0] ?? '';
}

function genere(valore: string | null): Genere | null {
  return valore === 'female' || valore === 'male' || valore === 'other' ? valore : null;
}

function nomeNutrizionista(riga: NutrizionistaRiga): string {
  return [riga.title, riga.full_name].filter((p) => p && p.trim()).join(' ').trim();
}

function profiloDi(cliente: ClienteRiga, nutrizionista: NutrizionistaRiga | null): Profilo {
  return {
    clientId: cliente.id,
    nome: primoNome(cliente.full_name),
    genere: genere(cliente.gender),
    nutrizionista:
      nutrizionista && nutrizionista.id === cliente.nutritionist_id
        ? { id: nutrizionista.id, nome: nomeNutrizionista(nutrizionista), foto: nutrizionista.app_square_photo_url }
        : null,
  };
}

function slotDiLead(lead: LeadSlotRiga | null): Slot | null {
  const istante = istanteRoma(lead?.desired_date, lead?.desired_start_time);
  if (!istante || !lead?.desired_date || !lead.desired_start_time) return null;
  return { data: lead.desired_date, ora: lead.desired_start_time.slice(0, 5), istante };
}

function appuntamentoDi(riga: AppuntamentoRiga): Appuntamento | null {
  const istante = istanteRoma(riga.appointment_date, riga.start_time);
  if (!istante) return null;
  const stato = riga.status as StatoAppuntamentoDb;
  if (stato !== 'scheduled' && stato !== 'completed' && stato !== 'cancelled' && stato !== 'no_show') return null;
  return { id: riga.id, data: riga.appointment_date, ora: riga.start_time.slice(0, 5), istante, stato, linkVideochiamata: riga.meeting_url };
}

/**
 * Stato del cliente dai dati letti all'avvio.
 * - riga clients assente (o invisibile per ruolo mancante) → L;
 * - not_confirmed: slot desiderato futuro → C, altrimenti (passato o assente) → D;
 * - booked: come la web app, la fase viene dal più vecchio appuntamento scheduled|completed: completed, oppure
 *   scheduled con inizio + 45 minuti passato → H; altrimenti F con card del primo scheduled futuro;
 *   nessun scheduled|completed: un no_show → I; solo cancellati o nessun appuntamento → F senza card (come oggi);
 * - subscribed → J; churned → K.
 */
export function calcolaStato(dati: DatiStato, adesso: Date): StatoCliente {
  const { cliente } = dati;
  if (!cliente) return { codice: 'L' };
  const profilo = profiloDi(cliente, dati.nutrizionista);
  const ora = adesso.getTime();

  switch (cliente.status as StatoClienteDb) {
    case 'not_confirmed': {
      const slot = slotDiLead(dati.lead);
      if (slot && slot.istante.getTime() > ora) return { codice: 'C', profilo, slot };
      return { codice: 'D', profilo, slot };
    }
    case 'booked': {
      const appuntamenti = dati.appuntamenti
        .map(appuntamentoDi)
        .filter((a): a is Appuntamento => a !== null)
        .sort((a, b) => a.istante.getTime() - b.istante.getTime());
      const attivi = appuntamenti.filter((a) => a.stato === 'scheduled' || a.stato === 'completed');
      const perFase = attivi[0];
      if (perFase) {
        const dopo = perFase.stato === 'completed' || perFase.istante.getTime() + MINUTI_DOPO_INIZIO_CONSULENZA * MINUTO_MS <= ora;
        if (dopo) return { codice: 'H', profilo };
        const futuro = attivi.find((a) => a.stato === 'scheduled' && a.istante.getTime() > ora) ?? null;
        return { codice: 'F', profilo, appuntamento: futuro };
      }
      if (appuntamenti.some((a) => a.stato === 'no_show')) return { codice: 'I', profilo };
      return { codice: 'F', profilo, appuntamento: null };
    }
    case 'subscribed':
      return { codice: 'J', profilo };
    case 'churned':
      return { codice: 'K', profilo };
    default:
      // Impossibile per il CHECK clients_status_check: trattato come riga non collegata.
      return { codice: 'L' };
  }
}
