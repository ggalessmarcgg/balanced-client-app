// Account (step 11, lotto 3; censimento ~/Desktop/censimenti-app/step11-censimento-menu-account.md, §5–7 e §9):
// profilo e statistiche dalla riga clients già letta all'avvio, abbonamento dalla edge function get-client-subscription
// (Stripe, solo lettura), promemoria del diario su due colonne di clients. Logica pura, senza dipendenze.
import { STATI_CON_TESTO, type RigaRevisione } from '../revisioni/letture.ts';

/** Colonne di clients aggiunte alla lettura dello stato per l'Account (mai select *). */
export const COLONNE_ACCOUNT = ['email', 'total_submissions', 'diary_reminder_enabled', 'diary_reminder_weekend_enabled', 'stripe_customer_id'] as const;

export type RigaAccount = {
  email: string | null;
  total_submissions: number | null;
  diary_reminder_enabled: boolean | null;
  diary_reminder_weekend_enabled: boolean | null;
  stripe_customer_id: string | null;
};

export type Promemoria = { diario: boolean; weekend: boolean };

/** Dati dell'Account ricavati dalla riga clients (parte del Profilo dello stato). */
export type DatiAccount = {
  email: string;
  giornateCondivise: number;
  promemoria: Promemoria;
  /** Vero se il cliente ha un cliente Stripe: solo allora si interroga la function dell'abbonamento. */
  conStripe: boolean;
};

export function datiAccount(riga: Partial<RigaAccount>): DatiAccount {
  return {
    email: (riga.email ?? '').trim(),
    giornateCondivise: Math.max(0, Math.floor(riga.total_submissions ?? 0)),
    promemoria: { diario: riga.diary_reminder_enabled ?? true, weekend: riga.diary_reminder_weekend_enabled ?? true },
    conStripe: Boolean(riga.stripe_customer_id),
  };
}

/** Iniziali per l'avatar (Figma 499:2174: "GR"): prima lettera del primo e dell'ultimo nome, in maiuscolo. */
export function inizialiNome(nomeCompleto: string | null | undefined): string {
  const parti = (nomeCompleto ?? '').trim().split(/\s+/).filter(Boolean);
  if (parti.length === 0) return '';
  const prima = parti[0]?.[0] ?? '';
  const ultima = parti.length > 1 ? (parti[parti.length - 1]?.[0] ?? '') : '';
  return (prima + ultima).toUpperCase();
}

/** "Revisioni ricevute": revisioni inviate (sent, opened, read) tra quelle già caricate dall'app. */
export function revisioniRicevute(righe: Pick<RigaRevisione, 'status'>[]): number {
  return righe.filter((r) => (STATI_CON_TESTO as readonly string[]).includes(r.status)).length;
}

// ---- Promemoria ---------------------------------------------------------------------------------------------------

/** Colonne scritte su clients (le uniche: policy senza restrizione di colonna, ma l'app ne tocca solo queste). */
export const COLONNE_PROMEMORIA = { diario: 'diary_reminder_enabled', weekend: 'diary_reminder_weekend_enabled' } as const;

export type ScritturaPromemoria = Partial<Record<(typeof COLONNE_PROMEMORIA)[keyof typeof COLONNE_PROMEMORIA], boolean>>;

/**
 * Cambio di un interruttore con la cascata della web app: spegnere il diario spegne anche il weekend; il weekend
 * si può accendere solo con il diario acceso. Restituisce il nuovo stato e le sole colonne da scrivere.
 */
export function cambiaPromemoria(attuale: Promemoria, campo: keyof Promemoria, valore: boolean): { promemoria: Promemoria; scrittura: ScritturaPromemoria } {
  if (campo === 'diario') {
    if (!valore && attuale.weekend) {
      return { promemoria: { diario: false, weekend: false }, scrittura: { diary_reminder_enabled: false, diary_reminder_weekend_enabled: false } };
    }
    return { promemoria: { ...attuale, diario: valore }, scrittura: { diary_reminder_enabled: valore } };
  }
  if (!attuale.diario) return { promemoria: attuale, scrittura: {} };
  return { promemoria: { ...attuale, weekend: valore }, scrittura: { diary_reminder_weekend_enabled: valore } };
}

// ---- Abbonamento --------------------------------------------------------------------------------------------------

export const FUNZIONE_ABBONAMENTO = 'get-client-subscription';
/** L'abbonamento cambia di rado e la function interroga Stripe a ogni chiamata: una lettura per ora (come la web app). */
export const DURATA_CACHE_ABBONAMENTO_MS = 60 * 60 * 1000;

/** Risposta della function (sorgente nel repo della web app, supabase/functions/get-client-subscription/index.ts). */
export type RispostaAbbonamento = {
  subscription: {
    amount?: number | null;
    currency?: string | null;
    interval?: string | null;
    intervalCount?: number | null;
    /** Fine del periodo corrente, secondi Unix. */
    currentPeriodEnd?: number | null;
    status?: string | null;
    priceId?: string | null;
    planName?: string | null;
    pendingChange?: unknown;
  } | null;
};

/** Righe della card Abbonamento (Figma 499:2190): Piano, Stato, Prossimo rinnovo. */
export type Abbonamento = { piano: string; stato: string; rinnovo: string };

const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];

function plurale(n: number, singolare: string, plurale: string): string {
  return `${n} ${n === 1 ? singolare : plurale}`;
}

/** "6 mesi", "1 mese", "1 anno": dalla cadenza Stripe; se manca, il nome del piano della function. */
export function etichettaPiano(interval: string | null | undefined, intervalCount: number | null | undefined, planName: string | null | undefined): string {
  const n = Math.max(1, Math.floor(intervalCount ?? 1));
  switch (interval) {
    case 'month':
      return plurale(n, 'mese', 'mesi');
    case 'year':
      return plurale(n, 'anno', 'anni');
    case 'week':
      return plurale(n, 'settimana', 'settimane');
    case 'day':
      return plurale(n, 'giorno', 'giorni');
    default:
      return (planName ?? '').trim();
  }
}

export function etichettaStatoAbbonamento(status: string | null | undefined): string {
  switch (status) {
    case 'active':
      return 'Attivo';
    case 'trialing':
      return 'In prova';
    case 'past_due':
    case 'unpaid':
      return 'Pagamento in sospeso';
    case 'canceled':
      return 'Disdetto';
    case 'paused':
      return 'Sospeso';
    default:
      return status ? status : 'Attivo';
  }
}

/** "15 marzo 2027" dalla fine del periodo (secondi Unix), in ora italiana. */
export function etichettaRinnovo(currentPeriodEnd: number | null | undefined, dataRoma: (istante: Date) => string): string {
  if (!currentPeriodEnd || !Number.isFinite(currentPeriodEnd)) return '';
  const data = dataRoma(new Date(currentPeriodEnd * 1000));
  const [a, m, g] = data.split('-').map(Number);
  if (!a || !m || !g) return '';
  return `${g} ${MESI[m - 1]} ${a}`;
}

/** Card dalla risposta della function; null se il cliente non ha un abbonamento Stripe leggibile. */
export function abbonamentoDa(risposta: RispostaAbbonamento | null | undefined, dataRoma: (istante: Date) => string): Abbonamento | null {
  const s = risposta?.subscription;
  if (!s) return null;
  return { piano: etichettaPiano(s.interval, s.intervalCount, s.planName), stato: etichettaStatoAbbonamento(s.status), rinnovo: etichettaRinnovo(s.currentPeriodEnd, dataRoma) };
}

// ---- Testi ---------------------------------------------------------------------------------------------------------

export const URL_PRIVACY = 'https://www.joinbalanced.it/privacy-policy';
export const URL_TERMINI = 'https://www.joinbalanced.it/termini-e-condizioni';

export const TESTI_ACCOUNT = {
  giornateCondivise: 'Giornate condivise',
  revisioniRicevute: 'Revisioni ricevute',
  notifiche: 'Notifiche',
  promemoriaDiario: 'Promemoria del diario',
  promemoriaWeekend: 'Anche nel weekend',
  abbonamento: 'Abbonamento',
  piano: 'Piano',
  stato: 'Stato',
  rinnovo: 'Prossimo rinnovo',
  statoAttivo: 'Attivo',
  modificaTitolo: 'Vuoi modificare o sospendere il tuo abbonamento?',
  modificaPrima: 'Scrivici a ',
  modificaDopo: ' almeno 24 ore prima del rinnovo e ce ne occupiamo noi.',
  /** Senza abbonamento Stripe leggibile (clienti v1 senza stripe_customer_id, function non raggiungibile). */
  senzaAbbonamento: 'Per informazioni sul tuo abbonamento contatta il supporto.',
  supporto: 'Supporto',
  privacy: 'Privacy e dati',
  informativa: 'Informativa privacy',
  termini: 'Termini del servizio',
  elimina: 'Elimina account',
  esci: 'Esci',
} as const;

/** Card Notifiche senza il permesso (step 6, contratto notifiche §5; Figma Account · 2 492:3408 e · 3 831:8335). */
export const TESTI_NOTIFICHE_ACCOUNT = {
  disattivate: 'Senza notifiche non riceverai promemoria né avvisi per commenti e revisioni.',
  negate: 'Le notifiche sono disattivate nelle impostazioni del telefono. Senza notifiche non riceverai promemoria né avvisi per commenti e revisioni.',
  attiva: 'Attiva le notifiche',
  impostazioni: 'Apri le impostazioni',
} as const;

/** Eliminazione dell'account (Figma 499:2568 e 499:2709): nessun sistema la esegue oggi (censimento §7). */
export const TESTI_ELIMINAZIONE = {
  avvisoTitolo: 'Vuoi eliminare il tuo account?',
  avvisoInfo: "Eliminare il tuo account non interrompe l'abbonamento. Prima contatta il supporto per disdire.",
  avvisoTesto: 'Una volta cancellato non potrai più recuperare il tuo account e tutti i dati ad esso collegati.',
  indietro: 'Indietro',
  continua: 'Continua',
  confermaTitolo: 'Conferma con la tua password',
  confermaTesto: "Per sicurezza, inserisci la password del tuo account per confermare l'eliminazione.",
  password: 'Password',
  eliminaDefinitivamente: 'Elimina definitivamente',
  nonDisponibile: "L'eliminazione dell'account sarà disponibile a breve. Nel frattempo puoi chiederla al supporto.",
} as const;
