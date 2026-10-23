import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { campoLungo, spazioLibero, spostamentoPerCampo, spostamentoPerCursore, type CampoAFuoco } from './cursore.ts';

// iPhone 17: finestra 874, barra di stato 59, tastiera 336, margine 16. Fondo visibile: 874 − 336 − 16 = 522.
const S = { altezzaFinestra: 874, altezzaTastiera: 336, cimaSicura: 59, margine: 16 };
const breve = (cima: number, extra: Partial<CampoAFuoco> = {}): CampoAFuoco => ({ cima, altezzaTextInput: 96, fondoContenitore: -1, altezzaContenitore: 0, cursore: { cima: 12, fondo: 34 }, ...extra });

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

describe('tastiera: scorrimento per il campo a fuoco dalle posizioni correnti', () => {
  it('campo breve sotto la tastiera: scorre di quanto serve a portare il contenitore sopra la tastiera', () => {
    // Contenitore (campo + pulsante "Invia") che finisce a 700: 700 − 522 = 178.
    assert.equal(spostamentoPerCampo(breve(500, { fondoContenitore: 700, altezzaContenitore: 200 }), S), 178);
    // Senza contenitore misurato vale il fondo del TextInput: 500 + 96 − 522 = 74.
    assert.equal(spostamentoPerCampo(breve(500), S), 74);
  });

  it('campo breve già visibile sopra la tastiera: nessuno spostamento, mai verso l’alto', () => {
    assert.equal(spostamentoPerCampo(breve(200, { fondoContenitore: 400, altezzaContenitore: 200 }), S), 0);
    assert.equal(spostamentoPerCampo(breve(20), S), 0);
  });

  it('cambio di campo con la tastiera aperta: la seconda chiamata, con le posizioni già scorse, dà 0 (nessun doppio conteggio)', () => {
    const prima = spostamentoPerCampo(breve(500, { fondoContenitore: 700, altezzaContenitore: 200 }), S);
    assert.equal(prima, 178);
    const dopo = spostamentoPerCampo(breve(500 - prima, { fondoContenitore: 700 - prima, altezzaContenitore: 200 }), S);
    assert.equal(dopo, 0);
  });

  it('campo lungo: conta la riga del cursore, non il bordo del contenitore', () => {
    const lungo = breve(100, { altezzaTextInput: 900, fondoContenitore: 1000, altezzaContenitore: 900, cursore: { cima: 500, fondo: 522 } });
    // Riga del cursore a 600–622 nella finestra: 622 − 522 = 100.
    assert.equal(spostamentoPerCampo(lungo, S), 100);
    assert.equal(spostamentoPerCampo({ ...lungo, cursore: { cima: 100, fondo: 122 } }, S), 0);
  });

  it('campo non noto: 0', () => {
    assert.equal(spostamentoPerCampo(breve(-1), S), 0);
  });
});
