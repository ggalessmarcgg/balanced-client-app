import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { percorsoDiVoce, voceDaPercorso } from './voci.ts';

describe('voci della barra e percorsi', () => {
  it('ogni scheda ha il suo percorso e viceversa', () => {
    assert.equal(voceDaPercorso('/abbonato'), 'oggi');
    assert.equal(voceDaPercorso('/piano'), 'piano');
    assert.equal(voceDaPercorso('/revisioni'), 'revisioni');
    assert.equal(voceDaPercorso('/account'), 'account');
    assert.equal(voceDaPercorso('/abbonato?giornata=2026-10-20'), 'oggi');
    assert.equal(percorsoDiVoce('revisioni', '/abbonato'), '/revisioni');
  });
  it('le pagine fuori dalle schede non hanno una voce attiva', () => {
    assert.equal(voceDaPercorso('/revisione/abc'), null);
    assert.equal(voceDaPercorso('/storico'), null);
    assert.equal(voceDaPercorso('/accesso'), null);
  });
  it('nelle rotte di sviluppo la voce viene dal segmento e il cambio resta nello sviluppo', () => {
    assert.equal(voceDaPercorso('/sviluppo/schede/piano'), 'piano');
    assert.equal(voceDaPercorso('/sviluppo/schede/account?ciclo=1'), 'account');
    assert.equal(voceDaPercorso('/sviluppo/schede/altro'), null);
    assert.equal(percorsoDiVoce('oggi', '/sviluppo/schede/piano'), '/sviluppo/schede/oggi');
  });
});
