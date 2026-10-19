import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { chiaveConteggio, chiavePezzo, conteggioValido, dividiInPezzi, unisciPezzi } from './pezzi.ts';

describe('pezzi di sessione', () => {
  it('divide e ricompone', () => {
    const valore = 'x'.repeat(4000) + 'fine';
    const pezzi = dividiInPezzi(valore, 1800);
    assert.equal(pezzi.length, 3);
    assert.equal(pezzi[0]?.length, 1800);
    assert.equal(unisciPezzi(pezzi), valore);
  });
  it('valore corto: un solo pezzo; valore vuoto: un pezzo vuoto', () => {
    assert.deepEqual(dividiInPezzi('abc'), ['abc']);
    assert.deepEqual(dividiInPezzi(''), ['']);
  });
  it('un pezzo mancante invalida tutto', () => {
    assert.equal(unisciPezzi(['a', null, 'c']), null);
    assert.equal(unisciPezzi(['a', undefined]), null);
  });
  it('chiavi e conteggio', () => {
    assert.equal(chiaveConteggio('sessione'), 'sessione.n');
    assert.equal(chiavePezzo('sessione', 2), 'sessione.2');
    assert.equal(conteggioValido('3'), 3);
    assert.equal(conteggioValido('0'), null);
    assert.equal(conteggioValido('tre'), null);
    assert.equal(conteggioValido(null), null);
  });
});
