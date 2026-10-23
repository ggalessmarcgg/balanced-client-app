// Regola dei campi lunghi (decisione del 23/10/2026, CLAUDE.md, tastiera): quando il campo è più alto dello spazio
// libero sopra la tastiera, la pagina porta sopra la tastiera la riga del cursore e la segue; con i campi brevi resta
// la regola del campo intero sopra la tastiera. Funzioni pure usate dai worklet di src/ui/tastiera.tsx (nessun
// import, così girano anche sul thread dell'interfaccia).

export type SpazioTastiera = {
  altezzaFinestra: number;
  altezzaTastiera: number;
  /** Area sicura in alto (barra di stato): sopra non si legge nulla. */
  cimaSicura: number;
  /** Distanza da tenere tra il testo e i bordi (tastiera e cima). */
  margine: number;
};

/** Altezza dello spazio in cui un campo può stare per intero: tra la cima sicura e la tastiera, con i margini. */
export function spazioLibero(s: SpazioTastiera): number {
  'worklet';
  return s.altezzaFinestra - s.altezzaTastiera - s.cimaSicura - 2 * s.margine;
}

/** Vero se il campo (alto `altezzaCampo`) non entra nello spazio libero sopra la tastiera. */
export function campoLungo(altezzaCampo: number, s: SpazioTastiera): boolean {
  'worklet';
  return altezzaCampo > 0 && altezzaCampo > spazioLibero(s);
}

/**
 * Di quanto scorrere (positivo = verso il basso) perché la riga del cursore (`cima`/`fondo` nella finestra) stia tra la
 * cima sicura e la tastiera, con il margine. 0 se è già in vista; se la riga sta sotto la tastiera si porta subito
 * sopra, se sta sopra la cima si porta subito sotto.
 */
export function spostamentoPerCursore(riga: { cima: number; fondo: number }, s: SpazioTastiera): number {
  'worklet';
  const fondoVisibile = s.altezzaFinestra - s.altezzaTastiera - s.margine;
  const cimaVisibile = s.cimaSicura + s.margine;
  if (riga.fondo > fondoVisibile) return riga.fondo - fondoVisibile;
  if (riga.cima < cimaVisibile) return riga.cima - cimaVisibile;
  return 0;
}
