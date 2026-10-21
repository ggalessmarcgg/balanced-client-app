// Card e elenco della sezione Revisioni (piano del 12/10/2026, chat del 21/10/2026, censimento step 7 §6).
// Il ciclo lo gestisce il database (trigger del diario): qui si legge soltanto. Una revisione ogni 7 diari condivisi.
// - Inizia: 0 su 7, la revisione successiva che non esiste ancora come riga (numero = massimo + 1, mai creata dall'app);
// - Da sbloccare: on_going, submissions_count su 7;
// - In elaborazione: unlocked o draft, 7 su 7;
// - Nuova: sent, non ancora aperta;
// - passate: opened e read, in elenco per sent_at decrescente.
import { etichettaGiornoMese } from '../diario/data.ts';
import { dataOraRoma } from '../stato/orarioRoma.ts';
import { statoRevisione, type RigaRevisione } from './letture.ts';

export const DIARI_PER_REVISIONE = 7;

export type CardAvanzamento = {
  tipo: 'inizia' | 'daSbloccare';
  /** null per la card "Inizia" (riga virtuale). */
  id: string | null;
  numero: number;
  diari: number;
  /** Solo la revisione 1 ha il testo che spiega cos'è una revisione. */
  primaRevisione: boolean;
};
export type CardInElaborazione = { tipo: 'inElaborazione'; id: string; numero: number; diari: number };
export type CardNuova = { tipo: 'nuova'; id: string; numero: number; autoreId: string | null; sentAt: string | null };
export type CardRevisione = CardAvanzamento | CardInElaborazione | CardNuova;

export type RevisionePassata = {
  id: string;
  numero: number;
  /** "Revisione 12 · 2 ottobre" (data di invio in ora italiana; senza data solo "Revisione 12"). */
  titolo: string;
  /** Istante usato per l'ordine (sent_at, o apertura/lettura sul legacy senza sent_at). */
  istante: string | null;
};

export type SezioneRevisioni = {
  /** Card attive nell'ordine di Figma: avanzamento (Inizia o Da sbloccare), In elaborazione, Nuove (sent_at crescente). */
  attive: CardRevisione[];
  passate: RevisionePassata[];
  /** Almeno una revisione Nuova: pallino rosso sulla voce Revisioni della barra. */
  nuovaPresente: boolean;
};

/** Data italiana (YYYY-MM-DD) di un istante ISO; null se non valido. */
export function dataRoma(istante: string | null): string | null {
  if (!istante) return null;
  const d = new Date(istante);
  return Number.isNaN(d.getTime()) ? null : dataOraRoma(d).data;
}

/** Ordina per istante (crescente o decrescente); gli istanti assenti o non validi vanno sempre in fondo. */
function confrontaIstanti(a: string | null, b: string | null, verso: 'crescente' | 'decrescente' = 'crescente'): number {
  const ta = a ? Date.parse(a) : Number.NaN;
  const tb = b ? Date.parse(b) : Number.NaN;
  if (Number.isNaN(ta) && Number.isNaN(tb)) return 0;
  if (Number.isNaN(ta)) return 1;
  if (Number.isNaN(tb)) return -1;
  return verso === 'crescente' ? ta - tb : tb - ta;
}

export function titoloRevisione(numero: number): string {
  return `Revisione ${numero}`;
}

/** "3 diari", "1 diario", "0 diari". */
export function etichettaDiari(n: number): string {
  return n === 1 ? '1 diario' : `${n} diari`;
}

export function nuovaPresente(righe: RigaRevisione[]): boolean {
  return righe.some((r) => r.status === 'sent');
}

/** Dalle righe lette (qualunque ordine) alle card e all'elenco della sezione. */
export function sezioneRevisioni(righe: RigaRevisione[]): SezioneRevisioni {
  const massimo = righe.reduce((m, r) => Math.max(m, r.review_number), 0);
  const inCorso = righe.find((r) => r.status === 'on_going');
  const avanzamento: CardAvanzamento = inCorso
    ? { tipo: 'daSbloccare', id: inCorso.id, numero: inCorso.review_number, diari: inCorso.submissions_count, primaRevisione: inCorso.review_number === 1 }
    : { tipo: 'inizia', id: null, numero: massimo + 1, diari: 0, primaRevisione: massimo === 0 };

  const inElaborazione: CardInElaborazione[] = righe
    .filter((r) => r.status === 'unlocked' || r.status === 'draft')
    .sort((a, b) => b.review_number - a.review_number)
    .map((r) => ({ tipo: 'inElaborazione', id: r.id, numero: r.review_number, diari: r.submissions_count }));

  const nuove: CardNuova[] = righe
    .filter((r) => r.status === 'sent')
    .sort((a, b) => confrontaIstanti(a.sent_at, b.sent_at) || a.review_number - b.review_number)
    .map((r) => ({ tipo: 'nuova', id: r.id, numero: r.review_number, autoreId: r.review_author_id, sentAt: r.sent_at }));

  const passate: RevisionePassata[] = righe
    .filter((r) => r.status === 'opened' || r.status === 'read')
    .map((r) => {
      const istante = r.sent_at ?? r.opened_at ?? r.read_at;
      const data = dataRoma(istante);
      return { id: r.id, numero: r.review_number, titolo: data ? `${titoloRevisione(r.review_number)} · ${etichettaGiornoMese(data)}` : titoloRevisione(r.review_number), istante };
    })
    .sort((a, b) => confrontaIstanti(a.istante, b.istante, 'decrescente') || b.numero - a.numero);

  return { attive: [avanzamento, ...inElaborazione, ...nuove], passate, nuovaPresente: nuove.length > 0 };
}

/** Avanzamento della barra (0–1) con il contatore che sul legacy può superare 7. */
export function frazioneAvanzamento(diari: number): number {
  return Math.min(1, Math.max(0, diari / DIARI_PER_REVISIONE));
}

/** Stato noto dell'enum (per i test e per scartare righe con stati futuri). */
export function rigaValida(r: RigaRevisione): boolean {
  return statoRevisione(r.status) !== null;
}
