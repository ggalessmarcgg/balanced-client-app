// Rotta dell'app per ogni stato del cliente (mappa dell'app → file in app/).
import type { CodiceStato } from '@/core/stato/stato';

export const ROTTA_PER_STATO = {
  A: '/accesso',
  B: '/accesso',
  C: '/stato/prenotazione',
  D: '/stato/prenotazione',
  F: '/stato/prenotato',
  G: '/stato/prenotato',
  H: '/stato/percorso-non-attivo',
  I: '/stato/consulenza-non-svolta',
  J: '/abbonato',
  K: '/stato/percorso-concluso',
  L: '/stato/account-non-collegato',
} as const satisfies Record<CodiceStato, string>;

export function rottaPerStato(codice: CodiceStato): (typeof ROTTA_PER_STATO)[CodiceStato] {
  return ROTTA_PER_STATO[codice];
}
