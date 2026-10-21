// Contenuti (censimento step 11, §4): library_contents, 16 righe statiche con markdown minimo (**grassetto** e
// paragrafi separati da riga vuota). Lettura unica con cache lunga; nessuna scrittura; nessun criterio di visibilità.

export const TABELLA_CONTENUTI = 'library_contents';
export const SELEZIONE_CONTENUTI = ['id', 'order_index', 'step_name', 'category', 'reading_time', 'content_body'].join(',');

export type RigaContenuto = { id: string; order_index: number; step_name: string; category: string; reading_time: number | null; content_body: string };

export type CategoriaContenuto = 'Imparando la nutrizione' | 'Integrando nuove abitudini' | 'Scelte più consapevoli';
export const CATEGORIE: CategoriaContenuto[] = ['Imparando la nutrizione', 'Integrando nuove abitudini', 'Scelte più consapevoli'];

export type Contenuto = { id: string; ordine: number; titolo: string; categoria: string; minutiLettura: number | null };

/** Un paragrafo del testo: in grassetto se racchiuso in ** (i titoletti del design), altrimenti normale. */
export type Paragrafo = { tipo: 'titolo' | 'testo'; testo: string };

export function contenutoDa(riga: RigaContenuto): Contenuto {
  return { id: riga.id, ordine: riga.order_index, titolo: riga.step_name.trim(), categoria: riga.category.trim(), minutiLettura: riga.reading_time ?? null };
}

/** Elenco nell'ordine di order_index (la chiave di navigazione della web app). */
export function elencoContenuti(righe: RigaContenuto[]): Contenuto[] {
  return [...righe].sort((a, b) => a.order_index - b.order_index).map(contenutoDa);
}

/**
 * Griglia del design (Figma 520:2883): gruppi di 4 → una card larga, poi una riga con una card alta a sinistra e due
 * card impilate a destra. L'ultimo gruppo può essere incompleto: le card restanti seguono lo stesso ordine di posti.
 */
export type GruppoGriglia = { larga: Contenuto; alta?: Contenuto; colonna: Contenuto[] };
export function grigliaContenuti(contenuti: Contenuto[]): GruppoGriglia[] {
  const gruppi: GruppoGriglia[] = [];
  for (let i = 0; i < contenuti.length; i += 4) {
    const larga = contenuti[i];
    if (!larga) break;
    gruppi.push({ larga, alta: contenuti[i + 1], colonna: contenuti.slice(i + 2, i + 4) });
  }
  return gruppi;
}

/** "Tempo di lettura: 3 minuti". */
export function etichettaLettura(minuti: number | null): string | null {
  if (!minuti || minuti <= 0) return null;
  return `Tempo di lettura: ${minuti} ${minuti === 1 ? 'minuto' : 'minuti'}`;
}

/** Paragrafi dal corpo: separati da una o più righe vuote; un paragrafo interamente in **grassetto** è un titoletto; i ** interni si tolgono. */
export function paragrafi(contentBody: string): Paragrafo[] {
  return contentBody
    .replace(/\r\n?/g, '\n')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p !== '')
    .map((p) => {
      const m = /^\*\*(.+)\*\*$/s.exec(p);
      if (m && m[1] && !m[1].includes('**')) return { tipo: 'titolo', testo: m[1].trim() };
      return { tipo: 'testo', testo: p.replace(/\*\*/g, '') };
    });
}
