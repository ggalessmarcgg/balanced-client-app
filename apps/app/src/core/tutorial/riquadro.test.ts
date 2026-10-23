import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { riquadroDalContenuto, riquadroNellaFinestra, stessoRiquadro } from './riquadro.ts';

const FINESTRA = { larghezza: 402, altezza: 874 };

describe('tutorial: riquadro dell’elemento evidenziato', () => {
  it('compare solo se l’elemento è misurato e sta per intero nella finestra', () => {
    assert.equal(riquadroNellaFinestra({ x: 52, y: 671, larghezza: 298, altezza: 56 }, FINESTRA), true);
    assert.equal(riquadroNellaFinestra({ x: 52, y: 0, larghezza: 298, altezza: 56 }, FINESTRA), true);
    // Misurato prima dello scorrimento in fondo (difetto del 23/10/2026): sotto lo schermo, il tutorial non deve comparire.
    assert.equal(riquadroNellaFinestra({ x: 52, y: 1935.67, larghezza: 298, altezza: 56 }, FINESTRA), false);
    assert.equal(riquadroNellaFinestra({ x: 52, y: 830, larghezza: 298, altezza: 56 }, FINESTRA), false);
    assert.equal(riquadroNellaFinestra({ x: -1, y: 100, larghezza: 298, altezza: 56 }, FINESTRA), false);
    assert.equal(riquadroNellaFinestra({ x: 200, y: 100, larghezza: 298, altezza: 56 }, FINESTRA), false);
    // Non misurato (vista non ancora disposta): niente tutorial.
    assert.equal(riquadroNellaFinestra({ x: 0, y: 0, larghezza: 0, altezza: 0 }, FINESTRA), false);
  });

  it('dal contenuto scorrevole: posizione nel contenuto + contenitore nella finestra − scorrimento', () => {
    // Riepilogo di Racconta: il contenuto è alto 2042,67, scorso in fondo di 1264,67 in una finestra di 874 con il
    // contenitore sotto la barra di stato (y 59): "Invia alla nutrizionista" misurato a 1935,67 nel contenuto, bordo
    // sinistro 52 → 671 nella finestra.
    const r = riquadroDalContenuto({ x: 52, y: 1876.67, larghezza: 298, altezza: 56 }, { x: 0, y: 59 }, 1264.67);
    assert.deepEqual(r, { x: 52, y: 671, larghezza: 298, altezza: 56 });
    assert.equal(riquadroNellaFinestra(r, FINESTRA), true);
    // Senza scorrimento la stessa misura resta sotto lo schermo.
    assert.equal(riquadroNellaFinestra(riquadroDalContenuto({ x: 52, y: 1876.67, larghezza: 298, altezza: 56 }, { x: 0, y: 59 }, 0), FINESTRA), false);
  });

  it('stessoRiquadro confronta i quattro valori e tratta null a parte', () => {
    const a = { x: 1, y: 2, larghezza: 3, altezza: 4 };
    assert.equal(stessoRiquadro(a, { ...a }), true);
    assert.equal(stessoRiquadro(a, { ...a, y: 5 }), false);
    assert.equal(stessoRiquadro(null, null), true);
    assert.equal(stessoRiquadro(a, null), false);
  });
});
