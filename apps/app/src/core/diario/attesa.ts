// Copie di sicurezza delle modifiche non ancora confermate dal server (decisione del 21/10/2026): bozza del diario
// (di oggi o di un giorno passato non ancora salvato), modifiche di giornate condivise in attesa, "letto" dei commenti
// non confermati. Stanno in un file nella cartella documenti dell'app (che il sistema non svuota), separato dalla cache
// dei dati già sul server, e non si cancellano mai prima della conferma: il file si aggiorna per fusione, così una
// bozza di un giorno che non è più in memoria resta finché non viene salvata.
import { copiaValida, type DiarioLocale } from './bozza.ts';
import type { GiornataLocale } from './giornata.ts';

export type CopieInAttesa = {
  /** Bozze del diario per data (solo quelle con modifiche in attesa). */
  bozze: Record<string, DiarioLocale>;
  /** Giornate condivise per data con modifiche in attesa. */
  giornate: Record<string, GiornataLocale>;
  /** Righe il cui "letto" è stato mostrato ma non confermato. */
  lettureInAttesa: string[];
};

export const ATTESA_VUOTA: CopieInAttesa = { bozze: {}, giornate: {}, lettureInAttesa: [] };

export type MemoriaPerAttesa = { locale: DiarioLocale | null; giornate: Record<string, GiornataLocale>; lettureInAttesa: string[] };

/**
 * Nuovo contenuto del file a partire da quello salvato e dalla memoria: per le date presenti in memoria vale la
 * memoria (in attesa → si tiene, confermata → si toglie); le date assenti dalla memoria restano come sono.
 * Le letture in attesa seguono la memoria, che le ha già integrate all'avvio.
 */
export function aggiornaCopieInAttesa(salvate: CopieInAttesa, memoria: MemoriaPerAttesa): CopieInAttesa {
  const bozze = { ...salvate.bozze };
  if (memoria.locale) {
    if (memoria.locale.inAttesa) bozze[memoria.locale.data] = memoria.locale;
    else delete bozze[memoria.locale.data];
  }
  const giornate = { ...salvate.giornate };
  for (const [data, g] of Object.entries(memoria.giornate)) {
    if (g.inAttesa) giornate[data] = g;
    else delete giornate[data];
  }
  return { bozze, giornate, lettureInAttesa: [...memoria.lettureInAttesa] };
}

export function haCopieInAttesa(c: CopieInAttesa): boolean {
  return Object.keys(c.bozze).length > 0 || Object.keys(c.giornate).length > 0 || c.lettureInAttesa.length > 0;
}

/** Il file letto da disco (forma non garantita): solo le voci coerenti con il cliente e con la propria chiave. */
export function copieInAttesaValide(grezzo: unknown, clientId: string): CopieInAttesa {
  const c = (typeof grezzo === 'object' && grezzo !== null ? grezzo : {}) as Partial<CopieInAttesa>;
  const bozze: Record<string, DiarioLocale> = {};
  for (const [data, l] of Object.entries(c.bozze ?? {})) if (copiaValida(l, clientId, data) && l.inAttesa) bozze[data] = l;
  const giornate: Record<string, GiornataLocale> = {};
  for (const [data, g] of Object.entries(c.giornate ?? {})) if (g && g.data === data && g.inAttesa) giornate[data] = g;
  const lettureInAttesa = Array.isArray(c.lettureInAttesa) ? c.lettureInAttesa.filter((x): x is string => typeof x === 'string') : [];
  return { bozze, giornate, lettureInAttesa };
}

/** Bozze di giorni diversi da oggi rimaste in attesa (app chiusa prima del salvataggio, poi è cambiato il giorno): da salvare prima di passare a oggi. */
export function bozzePrecedenti(c: CopieInAttesa, oggi: string): DiarioLocale[] {
  return Object.values(c.bozze)
    .filter((l) => l.data !== oggi)
    .sort((a, b) => (a.data < b.data ? -1 : 1));
}

/**
 * Dati con cui ripartire: la bozza di oggi in attesa vince sulla copia in cache; le giornate in attesa vincono sulle
 * copie in cache delle stesse date.
 */
export function unisciConCache<C extends { locale: DiarioLocale | null; giornate: Record<string, GiornataLocale> }>(
  cache: C | null,
  attesa: CopieInAttesa,
  oggi: string,
): { locale: DiarioLocale | null; giornate: Record<string, GiornataLocale> } {
  return { locale: attesa.bozze[oggi] ?? cache?.locale ?? null, giornate: { ...(cache?.giornate ?? {}), ...attesa.giornate } };
}

/** Tutto ciò che l'app ha mostrato come fatto ma il server non ha ancora confermato: da inviare prima di uscire. */
export type ModificheInAttesa = MemoriaPerAttesa & { scrittureRevisioni: number };

/** Vero se c'è almeno una modifica non confermata (bozza, giornate, "letto" dei commenti, aperture e letture delle revisioni). */
export function haModificheInAttesa(m: ModificheInAttesa): boolean {
  return Boolean(m.locale?.inAttesa) || Object.values(m.giornate).some((g) => g.inAttesa) || m.lettureInAttesa.length > 0 || m.scrittureRevisioni > 0;
}
