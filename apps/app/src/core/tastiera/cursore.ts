// Regole dello scorrimento verso il campo a fuoco (CLAUDE.md, tastiera). Funzioni pure usate dai worklet di
// src/ui/tastiera.tsx (nessun import, così girano anche sul thread dell'interfaccia).
//
// - Campo breve: il campo intero (il suo contenitore) sta sopra la tastiera con il margine.
// - Campo lungo (più alto dello spazio libero sopra la tastiera, decisione del 23/10/2026): sopra la tastiera sta la
//   riga del cursore, che deve restare anche sotto la cima sicura.
// Tutto si calcola dalle posizioni correnti nella finestra: chiamare la regola due volte di seguito dà la seconda
// volta 0 (nessun doppio conteggio quando il fuoco passa da un campo all'altro con la tastiera già aperta).

export type SpazioTastiera = {
  altezzaFinestra: number;
  altezzaTastiera: number;
  /** Area sicura in alto (barra di stato): sopra non si legge nulla. */
  cimaSicura: number;
  /** Distanza da tenere tra il testo e i bordi (tastiera e cima). */
  margine: number;
};

/** Posizioni correnti nella finestra del campo a fuoco (−1 = non nota). */
export type CampoAFuoco = {
  /** Cima del TextInput. */
  cima: number;
  altezzaTextInput: number;
  /** Bordo inferiore del contenitore del campo (misurato dal JS), se noto. */
  fondoContenitore: number;
  /** Altezza del contenitore, se nota (0 = non nota). */
  altezzaContenitore: number;
  /** Riga del cursore rispetto alla cima del TextInput. */
  cursore: { cima: number; fondo: number };
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

/**
 * Di quanto scorrere per il campo a fuoco, dalle sue posizioni correnti: campo lungo → riga del cursore; campo breve
 * → bordo inferiore del contenitore (o del TextInput finché il contenitore non è misurato) sopra la tastiera con il
 * margine, mai verso l'alto. 0 se il campo non è noto o è già a posto.
 */
export function spostamentoPerCampo(campo: CampoAFuoco, s: SpazioTastiera): number {
  'worklet';
  if (campo.cima < 0) return 0;
  const altezza = campo.altezzaContenitore > 0 ? campo.altezzaContenitore : campo.altezzaTextInput;
  if (campoLungo(altezza, s)) {
    return spostamentoPerCursore({ cima: campo.cima + campo.cursore.cima, fondo: campo.cima + campo.cursore.fondo }, s);
  }
  const fondo = campo.fondoContenitore >= 0 ? campo.fondoContenitore : campo.cima + campo.altezzaTextInput;
  return Math.max(0, fondo - (s.altezzaFinestra - s.altezzaTastiera - s.margine));
}
