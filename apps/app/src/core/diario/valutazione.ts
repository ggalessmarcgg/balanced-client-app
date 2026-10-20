// Valutazione della giornata da parte della nutrizionista: daily_submissions.review_status (CHECK positive |
// needs_review | null, scritto dal CRM). L'app la legge soltanto, nelle letture già esistenti della settimana e dei
// mesi dello storico: positive → approvata (verde), needs_review → da rivedere (senape), null → in attesa (bianco).
export type Valutazione = 'approvata' | 'daRivedere' | 'inAttesa';

export type RigaConValutazione = { review_status: string | null };

export function valutazioneDi(review_status: string | null | undefined): Valutazione {
  if (review_status === 'positive') return 'approvata';
  if (review_status === 'needs_review') return 'daRivedere';
  return 'inAttesa';
}
