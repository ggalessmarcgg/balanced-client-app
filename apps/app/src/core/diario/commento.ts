// Commento della nutrizionista su una giornata condivisa (censimento step 5, §5): testo in nutritionist_comment,
// autore in comment_author_id (trigger stamp_comment_author), letto in comment_acknowledged. L'app scrive solo
// comment_acknowledged = true, all'apertura del pannello, come la web app con "Ho capito"; nessun'altra colonna.
import { primoNome } from '../stato/stato.ts';
import type { RigaAutore } from './letture.ts';

export type StatoCommento = 'nessuno' | 'daLeggere' | 'letto';

export type RigaConCommento = { nutritionist_comment: string | null; comment_acknowledged: boolean | null };

/** Un commento esiste se il testo non è vuoto; è letto se comment_acknowledged è true (null vale come false). */
export function statoCommento(riga: RigaConCommento): StatoCommento {
  if (!riga.nutritionist_comment || riga.nutritionist_comment.trim() === '') return 'nessuno';
  return riga.comment_acknowledged === true ? 'letto' : 'daLeggere';
}

/** L'unica scrittura del pannello: comment_acknowledged = true. */
export const CAMPI_LETTO = { comment_acknowledged: true } as const;
export type ModificaLetto = { id: string; campi: typeof CAMPI_LETTO };

/** All'apertura del pannello: una sola modifica se c'è un commento non ancora letto, altrimenti nulla. */
export function pianificaLetto(riga: RigaConCommento & { id: string }): { tipo: 'nessuna' } | { tipo: 'segnaLetto'; modifica: ModificaLetto } {
  if (statoCommento(riga) !== 'daLeggere') return { tipo: 'nessuna' };
  return { tipo: 'segnaLetto', modifica: { id: riga.id, campi: CAMPI_LETTO } };
}

/** Aggiorna la cache della settimana dopo il "letto" (anche prima della conferma del server: il pallino diventa verde subito). */
export function segnaLettoInCache<R extends { id: string; comment_acknowledged: boolean | null }>(righe: R[], id: string): R[] {
  return righe.map((r) => (r.id === id && r.comment_acknowledged !== true ? { ...r, comment_acknowledged: true } : r));
}

/**
 * Le righe rilette dal server portano comment_acknowledged = false per i "letto" la cui scrittura è fallita (si riprova
 * in silenzio alla prossima apertura): finché sono in attesa, in locale restano letti.
 */
export function applicaLettureInAttesa<R extends { id: string; comment_acknowledged: boolean | null }>(righe: R[], inAttesa: string[]): R[] {
  if (inAttesa.length === 0) return righe;
  const ids = new Set(inAttesa);
  return righe.map((r) => (ids.has(r.id) && r.comment_acknowledged !== true ? { ...r, comment_acknowledged: true } : r));
}

/**
 * Autore mostrato nella Card commento: nome di battesimo e foto quadrata (o iniziali se manca la foto). `fotoPronta`
 * = la foto è già in cache (lo decide chi apre il pannello): si mostra subito, senza dissolvenza.
 */
export type AutoreCommento = { nome: string; foto: string | null; iniziali: string; fotoPronta: boolean };

/** Titoli professionali da togliere dal nome ("Dott.ssa Margherita Chiadò" → "Margherita Chiadò"). */
const TITOLO = /^(dott\.?(ssa|\.)?|dr\.?(ssa)?|dottoressa|dottore)\s+/i;

export function nomeSenzaTitolo(nome: string | null | undefined): string {
  return (nome ?? '').trim().replace(TITOLO, '').trim();
}

/** Iniziali di nome e cognome (al massimo due lettere), per la foto mancante. */
export function iniziali(nomeCompleto: string): string {
  return nomeSenzaTitolo(nomeCompleto)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join('');
}

/**
 * Autore da mostrare: il profilo dell'autore del commento se leggibile (i profili inattivi non sono visibili al
 * cliente), altrimenti la nutrizionista del cliente; null se non si conosce nessuno dei due ("Commento della tua
 * nutrizionista").
 */
export function autoreCommento(profiloAutore: RigaAutore | null, nutrizionistaCliente: { nome: string; foto: string | null } | null): AutoreCommento | null {
  if (profiloAutore && nomeSenzaTitolo(profiloAutore.full_name)) {
    const nome = nomeSenzaTitolo(profiloAutore.full_name);
    return { nome: primoNome(nome), foto: profiloAutore.app_square_photo_url, iniziali: iniziali(nome), fotoPronta: false };
  }
  if (nutrizionistaCliente && nomeSenzaTitolo(nutrizionistaCliente.nome)) {
    const nome = nomeSenzaTitolo(nutrizionistaCliente.nome);
    return { nome: primoNome(nome), foto: nutrizionistaCliente.foto, iniziali: iniziali(nome), fotoPronta: false };
  }
  return null;
}
