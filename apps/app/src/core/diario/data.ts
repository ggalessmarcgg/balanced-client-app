// Date del diario: sempre in ora italiana (Europe/Rome) nel formato YYYY-MM-DD di daily_submissions.submission_date,
// la stessa data che usa l'invio automatico delle 23:50 (toLocaleDateString con timeZone Europe/Rome). La web app
// usa il fuso del dispositivo: nel database ci sono già 2 righe con la data sbagliata (censimento step 5, §2).
import { dataOraRoma } from '../stato/orarioRoma.ts';

const GIORNO_MS = 86_400_000;
const DATA = /^(\d{4})-(\d{2})-(\d{2})$/;

const GIORNI = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'] as const;
const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'] as const;
/** Iniziali dei giorni nell'ordine della Card settimana (Figma 449:253): L M M G V S D. */
export const INIZIALI_SETTIMANA = ['L', 'M', 'M', 'G', 'V', 'S', 'D'] as const;

/** Data di oggi in ora italiana (`YYYY-MM-DD`). */
export function dataOggiRoma(adesso: Date): string {
  return dataOraRoma(adesso).data;
}

/** Vero se la stringa è una data `YYYY-MM-DD` valida. */
export function dataValida(data: string): boolean {
  const m = DATA.exec(data);
  if (!m) return false;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return !Number.isNaN(d.getTime()) && d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3]);
}

// Le date del diario sono "naive": per fare aritmetica si leggono come mezzanotte UTC (nessun cambio d'ora in UTC).
function aUtc(data: string): Date {
  const m = DATA.exec(data);
  if (!m) throw new Error(`Data non valida: ${data}`);
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

function daUtc(d: Date): string {
  const due = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${due(d.getUTCMonth() + 1)}-${due(d.getUTCDate())}`;
}

export function aggiungiGiorni(data: string, giorni: number): string {
  return daUtc(new Date(aUtc(data).getTime() + giorni * GIORNO_MS));
}

/** Confronto tra date `YYYY-MM-DD` (il formato è ordinabile come testo). */
export function confrontaDate(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Lunedì della settimana che contiene la data (settimana lunedì–domenica). */
export function lunediDellaSettimana(data: string): string {
  const giorno = aUtc(data).getUTCDay(); // 0 = domenica
  const daLunedi = (giorno + 6) % 7;
  return aggiungiGiorni(data, -daLunedi);
}

/** I sette giorni della settimana corrente, da lunedì a domenica. */
export function giorniDellaSettimana(oggi: string): string[] {
  const lunedi = lunediDellaSettimana(oggi);
  return Array.from({ length: 7 }, (_, i) => aggiungiGiorni(lunedi, i));
}

/**
 * Intervallo dell'unica lettura della pagina Oggi: la sola settimana corrente, da lunedì a domenica (decisione del
 * 12/10/2026: anche l'Andamento usa la stessa settimana; correzione del lotto 2, prima copriva anche gli ultimi 7 giorni).
 */
export function intervalloSettimana(oggi: string): { da: string; a: string } {
  const lunedi = lunediDellaSettimana(oggi);
  return { da: lunedi, a: aggiungiGiorni(lunedi, 6) };
}

/** "Venerdì 9 ottobre": sottotitolo della Card diario. */
export function etichettaData(data: string): string {
  const d = aUtc(data);
  return `${GIORNI[d.getUTCDay()]} ${d.getUTCDate()} ${MESI[d.getUTCMonth()]}`;
}
