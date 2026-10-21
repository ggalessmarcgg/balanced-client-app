// Memoria di sessione delle revisioni: la fusione di una modifica e la decisione su cosa portare in memoria dalla
// cache sono qui, pure, così si prova che un aggiornamento senza cambiamenti non produce un nuovo stato (e quindi
// nessuna notifica a chi ascolta: una schermata che rilegge quando le righe mancano non deve rimettersi in ciclo).
import type { RigaRevisione } from './letture.ts';
import type { ModificaRevisione } from './lettura.ts';
import type { TestoRevisione } from './testo.ts';

export type MemoriaRevisioni = {
  clientId: string | null;
  /** null = stato mai letto in questa sessione (né dalla cache). */
  righe: RigaRevisione[] | null;
  /** Testi per id, solo revisioni inviate (sent, opened, read). */
  testi: Record<string, TestoRevisione>;
  /** Aperture e letture mostrate ma non ancora confermate dal server: si riprovano in silenzio. */
  scrittureInAttesa: ModificaRevisione[];
};

export const MEMORIA_VUOTA: MemoriaRevisioni = { clientId: null, righe: null, testi: {}, scrittureInAttesa: [] };

/** Fonde la modifica; restituisce lo stesso oggetto (nessun cambiamento) se ogni campo indicato è già identico. */
export function fondiMemoria(memoria: MemoriaRevisioni, modifica: Partial<MemoriaRevisioni>): MemoriaRevisioni {
  let cambiata = false;
  for (const chiave of Object.keys(modifica) as (keyof MemoriaRevisioni)[]) {
    if (modifica[chiave] !== memoria[chiave]) {
      cambiata = true;
      break;
    }
  }
  return cambiata ? { ...memoria, ...modifica } : memoria;
}

export type CacheRevisioni = { righe: RigaRevisione[] | null; testi: Record<string, TestoRevisione>; scrittureInAttesa: ModificaRevisione[] };

/**
 * Cosa portare in memoria dalla cache all'inizio di una lettura: tutto se il cliente cambia; solo le righe della
 * cache se la memoria non ne ha ancora; nulla (null) se la memoria è già pronta o la cache è vuota quanto lei.
 */
export function modificaDaCache(memoria: MemoriaRevisioni, clientId: string, cache: CacheRevisioni): Partial<MemoriaRevisioni> | null {
  if (memoria.clientId !== clientId) return { clientId, righe: cache.righe, testi: cache.testi, scrittureInAttesa: cache.scrittureInAttesa };
  if (memoria.righe !== null || cache.righe === null) return null;
  return { righe: cache.righe, testi: cache.testi, scrittureInAttesa: cache.scrittureInAttesa };
}
