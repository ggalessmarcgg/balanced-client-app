// Notifiche in app dalla campanella (step 11, lotto 3; censimento §8): lettura di client_notifications filtrata per
// utente, ultimi 7 giorni, con limite e colonne esplicite; i promemoria (diario, peso, misure) sono esclusi nella
// lettura stessa. Titolo e testo li compone l'app dal tipo e dai dati già in memoria (nome della nutrizionista,
// giornata, numero della revisione, ferie); title/body salvati sono solo la riserva. Logica pura.
import { dataOraRoma } from '../stato/orarioRoma.ts';

export const TABELLA_NOTIFICHE = 'client_notifications';
export const SELEZIONE_NOTIFICHE = ['id', 'notification_type', 'reference_id', 'reference_table', 'title', 'body', 'viewed_at', 'clicked_at', 'created_at'].join(',');
export const GIORNI_NOTIFICHE = 7;
export const LIMITE_NOTIFICHE = 50;
/** Promemoria generati dai cron: mai nell'elenco (filtro `not.in` nella lettura). */
export const TIPI_ESCLUSI = ['diary_reminder', 'weight_update', 'measurement_update'] as const;
/** Valore del filtro PostgREST `notification_type=not.in.(…)`. */
export const FILTRO_TIPI_ESCLUSI = `(${TIPI_ESCLUSI.join(',')})`;

export type RigaNotifica = {
  id: string;
  notification_type: string;
  reference_id: string;
  reference_table: string;
  title: string;
  body: string | null;
  viewed_at: string | null;
  clicked_at: string | null;
  created_at: string;
};

/** Istante ISO da cui leggere (adesso − 7 giorni). */
export function daQuando(adesso: Date): string {
  return new Date(adesso.getTime() - GIORNI_NOTIFICHE * 24 * 60 * 60 * 1000).toISOString();
}

/** Destinazioni aperte dal tocco (le altre righe si mostrano senza destinazione). */
export type Destinazione =
  | { tipo: 'giornata'; submissionId: string }
  | { tipo: 'revisione'; id: string }
  | { tipo: 'revisioni' }
  | { tipo: 'nutrizionista' }
  | { tipo: 'piano' };

export type Notifica = {
  id: string;
  tipo: string;
  titolo: string;
  testo: string;
  ora: string;
  daLeggere: boolean;
  destinazione: Destinazione | null;
};

/** Dati già in memoria con cui comporre i testi (tutti facoltativi: senza, si usa la riserva salvata). */
export type ContestoNotifiche = {
  /** Nome di battesimo della nutrizionista ("Margherita"). */
  nomeNutrizionista?: string | null;
  /** Data (YYYY-MM-DD) della giornata per id di daily_submissions. */
  dataGiornata?: (submissionId: string) => string | null | undefined;
  /** Numero e diari condivisi della revisione per id di client_reviews. */
  revisione?: (id: string) => { numero: number; diari: number } | null | undefined;
  /** Ferie in corso: fine (YYYY-MM-DD) e nome con titolo della sostituta. */
  ferie?: { al: string; sostituta: string | null } | null;
};

const GIORNI_LUNGHI = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
const GIORNI_BREVI = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];

function giornoSettimana(data: string): string {
  const [a, m, g] = data.split('-').map(Number);
  if (!a || !m || !g) return '';
  return GIORNI_LUNGHI[new Date(Date.UTC(a, m - 1, g)).getUTCDay()] ?? '';
}

function giornoMese(data: string): string {
  const [a, m, g] = data.split('-').map(Number);
  if (!a || !m || !g) return '';
  return `${g} ${MESI[m - 1]}`;
}

/** "Oggi, 09:12" · "Ieri, 18:40" · "Lun, 11:02" (Figma 639:7336 e seguenti), in ora italiana. */
export function etichettaOra(createdAt: string, adesso: Date): string {
  const istante = new Date(createdAt);
  if (Number.isNaN(istante.getTime())) return '';
  const { data, ora } = dataOraRoma(istante);
  const oggi = dataOraRoma(adesso).data;
  const ieri = dataOraRoma(new Date(adesso.getTime() - 24 * 60 * 60 * 1000)).data;
  const hhmm = ora.slice(0, 5);
  if (data === oggi) return `Oggi, ${hhmm}`;
  if (data === ieri) return `Ieri, ${hhmm}`;
  const [a, m, g] = data.split('-').map(Number);
  const giorno = a && m && g ? (GIORNI_BREVI[new Date(Date.UTC(a, m - 1, g)).getUTCDay()] ?? '') : '';
  return `${giorno}, ${hhmm}`;
}

/** "Dott.ssa Margherita Chiadò" → "Margherita": via il titolo, prima parola. */
export function nomeDiBattesimo(nomeConTitolo: string | null | undefined): string {
  const parti = (nomeConTitolo ?? '').trim().split(/\s+/).filter(Boolean);
  const senzaTitolo = parti.filter((p) => !/^(dott\.?(ssa)?|dr\.?(ssa)?|prof\.?(ssa)?)$/i.test(p));
  return senzaTitolo[0] ?? '';
}

function nomeOppure(nome: string | null | undefined, riserva: string): string {
  const n = (nome ?? '').trim();
  return n || riserva;
}

/** Titolo, testo e destinazione per tipo; per i tipi non previsti title/body salvati. */
export function composiNotifica(riga: RigaNotifica, contesto: ContestoNotifiche, adesso: Date): Notifica {
  const base = { id: riga.id, tipo: riga.notification_type, ora: etichettaOra(riga.created_at, adesso), daLeggere: riga.viewed_at === null };
  const riserva = (riga.body ?? '').trim();
  const nome = nomeOppure(contesto.nomeNutrizionista, 'La tua nutrizionista');
  switch (riga.notification_type) {
    case 'nutritionist_comment': {
      const data = contesto.dataGiornata?.(riga.reference_id);
      // Solo il giorno della settimana (Figma 639:7336): le notifiche coprono al massimo 7 giorni.
      const testo = data ? `${nome} ha commentato la tua giornata di ${giornoSettimana(data)}.` : `${nome} ha commentato una tua giornata.`;
      return { ...base, titolo: 'Nuovo commento sul tuo diario', testo, destinazione: { tipo: 'giornata', submissionId: riga.reference_id } };
    }
    case 'review_sent': {
      const r = contesto.revisione?.(riga.reference_id);
      const numero = r?.numero ?? numeroDalCorpo(riserva);
      const testo = numero ? `Revisione ${numero}: scopri cosa è andato bene questa settimana.` : 'Scopri cosa è andato bene questa settimana.';
      const destinazione: Destinazione = riga.reference_table === 'client_reviews' ? { tipo: 'revisione', id: riga.reference_id } : { tipo: 'revisioni' };
      return { ...base, titolo: 'La tua revisione è pronta', testo, destinazione };
    }
    case 'review_unlocked': {
      const r = contesto.revisione?.(riga.reference_id);
      const testo = r && r.diari > 0 ? `Hai condiviso ${r.diari} diari: ${nome} sta preparando la revisione.` : `${nome} sta preparando la tua revisione.`;
      return { ...base, titolo: 'Revisione sbloccata', testo, destinazione: { tipo: 'revisioni' } };
    }
    case 'holiday_replacement': {
      const f = contesto.ferie;
      const testo = f?.sostituta ? `Fino al ${giornoMese(f.al)} ti segue la ${f.sostituta}.` : f ? `Fino al ${giornoMese(f.al)} ti segue una collega.` : 'Durante le ferie della tua nutrizionista ti segue una collega.';
      return { ...base, titolo: 'Sostituzione per ferie', testo, destinazione: { tipo: 'nutrizionista' } };
    }
    case 'plan_sent':
      // Piano pronto (step 6, contratto notifiche v0.2 §2; Figma 831:8481): tipo nuovo scritto dal trigger su nutrition_plans.
      return { ...base, titolo: 'Il tuo piano è pronto', testo: `${nome} ha preparato il tuo piano alimentare.`, destinazione: { tipo: 'piano' } };
    case 'food_suggestion_approved':
      return { ...base, titolo: 'Suggerimento approvato', testo: riserva || 'Il tuo suggerimento è stato aggiunto al piano.', destinazione: null };
    case 'goal_comment':
      return { ...base, titolo: 'Nuovo commento sul tuo obiettivo', testo: riserva || `${nome} ha commentato il tuo obiettivo.`, destinazione: null };
    default:
      return { ...base, titolo: (riga.title ?? '').trim() || 'Notifica', testo: riserva, destinazione: null };
  }
}

/** "Revisione 13: clicca per vederla" → 13 (riserva quando la revisione non è in memoria). */
export function numeroDalCorpo(corpo: string): number | null {
  const m = /revisione\s+(\d+)/i.exec(corpo);
  return m ? Number(m[1]) : null;
}

/** Elenco per la schermata: dalla più recente, solo gli ultimi 7 giorni (il filtro è anche nella lettura). */
export function elencoNotifiche(righe: RigaNotifica[], contesto: ContestoNotifiche, adesso: Date): Notifica[] {
  const da = daQuando(adesso);
  return righe
    .filter((r) => !(TIPI_ESCLUSI as readonly string[]).includes(r.notification_type) && r.created_at >= da)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0))
    .map((r) => composiNotifica(r, contesto, adesso));
}

/** Pallino sulla campanella: almeno una notifica dell'elenco non ancora vista. */
export function nuoveDaLeggere(righe: RigaNotifica[], adesso: Date): boolean {
  const da = daQuando(adesso);
  return righe.some((r) => r.viewed_at === null && r.created_at >= da && !(TIPI_ESCLUSI as readonly string[]).includes(r.notification_type));
}

/** Segna viste in memoria (stessa modifica della scrittura: viewed_at sulle righe senza). */
export function segnaViste(righe: RigaNotifica[], adesso: Date): RigaNotifica[] {
  const ora = adesso.toISOString();
  return righe.map((r) => (r.viewed_at === null ? { ...r, viewed_at: ora } : r));
}

export function segnaCliccata(righe: RigaNotifica[], id: string, adesso: Date): RigaNotifica[] {
  const ora = adesso.toISOString();
  return righe.map((r) => (r.id === id && r.clicked_at === null ? { ...r, clicked_at: ora } : r));
}
