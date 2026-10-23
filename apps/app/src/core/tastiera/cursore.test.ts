import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { campoLungo, spazioLibero, spostamentoPerCursore } from './cursore.ts';

// iPhone 17: finestra 874, barra di stato 59, tastiera 336, margine 16.
const S = { altezzaFinestra: 874, altezzaTastiera: 336, cimaSicura: 59, margine: 16 };

describe('tastiera: campi lunghi e riga del cursore', () => {
  it('lo spazio libero sta tra la cima sicura e la tastiera, con i margini', () => {
    assert.equal(spazioLibero(S), 874 - 336 - 59 - 32);
  });

  it('un campo è lungo solo se misurato e più alto dello spazio libero', () => {
    assert.equal(campoLungo(96, S), false);
    assert.equal(campoLungo(447, S), false);
    assert.equal(campoLungo(448, S), true);
    assert.equal(campoLungo(0, S), false);
    // Senza tastiera lo spazio è tutta la finestra.
    assert.equal(campoLungo(448, { ...S, altezzaTastiera: 0 }), false);
  });

  it('la riga del cursore sotto la tastiera si porta subito sopra, con il margine', () => {
    // Fondo visibile: 874 − 336 − 16 = 522.
    assert.equal(spostamentoPerCursore({ cima: 600, fondo: 622 }, S), 100);
    assert.equal(spostamentoPerCursore({ cima: 500, fondo: 522 }, S), 0);
  });

  it('la riga del cursore sopra la cima sicura si porta subito sotto (scorrimento verso l’alto)', () => {
    // Cima visibile: 59 + 16 = 75.
    assert.equal(spostamentoPerCursore({ cima: 40, fondo: 62 }, S), -35);
    assert.equal(spostamentoPerCursore({ cima: 75, fondo: 97 }, S), 0);
  });

  it('la riga già in vista non muove la pagina', () => {
    assert.equal(spostamentoPerCursore({ cima: 300, fondo: 322 }, S), 0);
  });
});
