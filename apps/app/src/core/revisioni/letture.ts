// Letture di client_reviews (censimento step 7, §1 e §6): colonne esplicite, filtro per user_id (policy "Clients can
// view their own reviews", indice client_reviews_user_id_idx), mai select *. Una lettura leggera dello stato senza
// testo per tutte le righe; una seconda con review_text solo per le revisioni inviate (sent, opened, read): il testo
// di unlocked e draft è leggibile via RLS ma non va mai letto né mostrato.

export const TABELLA_REVISIONI = 'client_reviews';

/** Valori dell'enum review_status_v2, nell'ordine del ciclo. */
export type StatoRevisioneDb = 'on_going' | 'unlocked' | 'draft' | 'sent' | 'opened' | 'read';

/** Stati in cui il testo è stato inviato al cliente e si può leggere. */
export const STATI_CON_TESTO: readonly StatoRevisioneDb[] = ['sent', 'opened', 'read'];

/** Lettura leggera: stato di ogni revisione del cliente (serve alla sezione e al pallino sulla barra). */
export const SELEZIONE_STATO_REVISIONI = ['id', 'review_number', 'status', 'submissions_count', 'review_author_id', 'sent_at', 'opened_at', 'read_at'].join(',');

export type RigaRevisione = {
  id: string;
  review_number: number;
  status: string;
  submissions_count: number;
  review_author_id: string | null;
  sent_at: string | null;
  opened_at: string | null;
  read_at: string | null;
};

/** Seconda lettura: il testo, solo per id noti e solo con status in STATI_CON_TESTO. */
export const SELEZIONE_TESTO_REVISIONI = ['id', 'review_text'].join(',');

export type RigaTestoRevisione = { id: string; review_text: unknown };

export function statoRevisione(status: string): StatoRevisioneDb | null {
  switch (status) {
    case 'on_going':
    case 'unlocked':
    case 'draft':
    case 'sent':
    case 'opened':
    case 'read':
      return status;
    default:
      return null;
  }
}

/** Vero se la revisione è stata inviata (testo leggibile). */
export function haTesto(status: string): boolean {
  const s = statoRevisione(status);
  return s !== null && STATI_CON_TESTO.includes(s);
}
