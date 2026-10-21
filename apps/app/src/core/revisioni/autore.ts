// Autrice della revisione (censimento step 7, §3): "<title> <full_name>" del profilo review_author_id, con ripiego
// sulla nutrizionista assegnata (2.325 revisioni storiche senza autrice; profili disattivati non leggibili).
import { iniziali } from '../diario/commento.ts';
import type { RigaAutore } from '../diario/letture.ts';

export type AutoreRevisione = { nome: string; foto: string | null; iniziali: string; fotoPronta: boolean };

export function nomeConTitolo(profilo: Pick<RigaAutore, 'title' | 'full_name'>): string {
  return [profilo.title, profilo.full_name]
    .map((p) => (p ?? '').trim())
    .filter(Boolean)
    .join(' ');
}

/** Profilo dell'autrice se leggibile, altrimenti la nutrizionista del cliente; null se non si conosce nessuna delle due. */
export function autoreRevisione(profiloAutore: RigaAutore | null, nutrizionistaCliente: { nome: string; foto: string | null } | null): AutoreRevisione | null {
  if (profiloAutore && nomeConTitolo(profiloAutore)) {
    const nome = nomeConTitolo(profiloAutore);
    return { nome, foto: profiloAutore.app_square_photo_url, iniziali: iniziali(nome), fotoPronta: false };
  }
  if (nutrizionistaCliente && nutrizionistaCliente.nome.trim()) {
    return { nome: nutrizionistaCliente.nome.trim(), foto: nutrizionistaCliente.foto, iniziali: iniziali(nutrizionistaCliente.nome), fotoPronta: false };
  }
  return null;
}
