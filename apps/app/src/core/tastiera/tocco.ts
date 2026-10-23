// Regola del tocco fuori dai campi (CLAUDE.md, tastiera): un tocco su un punto non interattivo della pagina toglie il
// fuoco al campo di testo e chiude la tastiera. Funzione pura usata da src/ui/tastiera.tsx.

/**
 * Vero se un tocco iniziato su `bersaglio` deve chiudere il campo a fuoco: c'è un campo a fuoco e il tocco non è sul
 * campo stesso. Un tocco su un altro campo o su un elemento interattivo non arriva qui: lo prende l'elemento.
 */
export function toccoChiudeCampo(campoAFuoco: unknown, bersaglio: unknown): boolean {
  return campoAFuoco !== null && campoAFuoco !== undefined && bersaglio !== campoAFuoco;
}
