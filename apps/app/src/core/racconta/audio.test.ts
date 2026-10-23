import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { aggiungiLivello, altezzeBarrette, dimensioneMassimaByte, durataDichiarata, etichettaTimer, formattaDurata, limiteRaggiunto, LIMITE_REGISTRAZIONE_MS, livelloDaDecibel, SOGLIA_ARRESTO_MS, titoloRacconto } from './audio.ts';

describe('audio: durate e limite', () => {
  it('formatta i minuti e i secondi troncati', () => {
    assert.equal(formattaDurata(0), '0:00');
    assert.equal(formattaDurata(42_999), '0:42');
    assert.equal(formattaDurata(88_000), '1:28');
    assert.equal(formattaDurata(LIMITE_REGISTRAZIONE_MS), '3:00');
    assert.equal(formattaDurata(-5), '0:00');
  });

  it('compone il timer e il titolo della card', () => {
    assert.equal(etichettaTimer(42_000), '0:42 / 3:00');
    assert.equal(titoloRacconto(88_000), 'Il tuo racconto · 1:28');
  });

  it('il limite scatta un passo di lettura prima dei 3 minuti', () => {
    assert.equal(limiteRaggiunto(SOGLIA_ARRESTO_MS - 1), false);
    assert.equal(limiteRaggiunto(SOGLIA_ARRESTO_MS), true);
    assert.equal(limiteRaggiunto(LIMITE_REGISTRAZIONE_MS + 500), true);
  });

  it('la durata dichiarata al server non supera mai il limite', () => {
    assert.equal(durataDichiarata(44_970.4), 44_970);
    assert.equal(durataDichiarata(LIMITE_REGISTRAZIONE_MS + 600), LIMITE_REGISTRAZIONE_MS);
    assert.equal(durataDichiarata(-3), 0);
  });

  it('un racconto di 3 minuti a 48 kbit/s mono pesa poco più di 1 MB', () => {
    const byte = dimensioneMassimaByte();
    assert.equal(byte, 1_080_000 + 64 * 1024);
    assert.ok(byte < 6 * 1024 * 1024, 'sotto il limite di 6 MB del server');
  });
});

describe('audio: livello voce', () => {
  it('traduce i decibel in 0–1', () => {
    assert.equal(livelloDaDecibel(undefined), 0);
    assert.equal(livelloDaDecibel(-160), 0);
    assert.equal(livelloDaDecibel(-50), 0);
    assert.equal(livelloDaDecibel(-25), 0.5);
    assert.equal(livelloDaDecibel(0), 1);
    assert.equal(livelloDaDecibel(5), 1);
  });

  it('tiene gli ultimi otto livelli e li rende come altezze da 4 a 16', () => {
    let storia: number[] = [];
    for (let i = 0; i < 10; i++) storia = aggiungiLivello(storia, i / 9);
    assert.equal(storia.length, 8);
    const altezze = altezzeBarrette(storia);
    assert.equal(altezze.length, 8);
    assert.equal(altezze[7], 16);
    assert.equal(altezze[0], Math.round(4 + 12 * (2 / 9)));
    assert.deepEqual(altezzeBarrette([]), [4, 4, 4, 4, 4, 4, 4, 4]);
    assert.deepEqual(altezzeBarrette([1]), [4, 4, 4, 4, 4, 4, 4, 16]);
  });
});
