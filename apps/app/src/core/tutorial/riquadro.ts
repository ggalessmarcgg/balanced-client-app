// Posizione dell'elemento evidenziato da un tutorial (src/ui/Tutorial.tsx). Funzioni pure: il riquadro è nelle
// coordinate della finestra (punti), con l'origine in alto a sinistra.

export type Riquadro = { x: number; y: number; larghezza: number; altezza: number };
export type Finestra = { larghezza: number; altezza: number };

/** Vero se il riquadro ha una misura e sta per intero dentro la finestra: solo allora il tutorial può comparire. */
export function riquadroNellaFinestra(r: Riquadro, finestra: Finestra): boolean {
  return r.larghezza > 0 && r.altezza > 0 && r.x >= 0 && r.y >= 0 && r.x + r.larghezza <= finestra.larghezza && r.y + r.altezza <= finestra.altezza;
}

/**
 * Riquadro nella finestra di un elemento dentro un contenuto scorrevole, ricavato da parti che non dipendono dallo
 * stato dello scorrimento: la posizione dell'elemento dentro il contenuto, quella del contenitore scorrevole nella
 * finestra e di quanto il contenuto è scorso (dagli eventi di scorrimento). Serve perché, dopo uno scorrimento
 * programmato, la misura diretta nella finestra può restare quella di prima dello scorrimento (difetto del 23/10/2026).
 */
export function riquadroDalContenuto(nelContenuto: Riquadro, contenitore: { x: number; y: number }, scorso: number): Riquadro {
  return { x: contenitore.x + nelContenuto.x, y: contenitore.y + nelContenuto.y - scorso, larghezza: nelContenuto.larghezza, altezza: nelContenuto.altezza };
}

/** Vero se due riquadri coincidono (per non rimettere in stato lo stesso valore). */
export function stessoRiquadro(a: Riquadro | null, b: Riquadro | null): boolean {
  if (a === null || b === null) return a === b;
  return a.x === b.x && a.y === b.y && a.larghezza === b.larghezza && a.altezza === b.altezza;
}
