import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { durata, rigaPorzioni, sottotitoloElenco, sottotitoloRicetta, testoIngrediente } from './tempo.ts';

describe('tempo della ricetta', () => {
  it('sottotitolo: "20 minuti · Pranzo"; con il riposo "30 minuti · più 3 ore di riposo · Spuntino"', () => {
    assert.equal(sottotitoloRicetta(20, null, 'Pranzo'), '20 minuti · Pranzo');
    assert.equal(sottotitoloRicetta(30, 180, 'Spuntino'), '30 minuti · più 3 ore di riposo · Spuntino');
    assert.equal(sottotitoloRicetta(30, 90, 'Spuntino'), '30 minuti · più 1 ora e 30 minuti di riposo · Spuntino');
    assert.equal(sottotitoloRicetta(30, 45, 'Cena'), '30 minuti · più 45 minuti di riposo · Cena');
    assert.equal(sottotitoloRicetta(1, 60, 'Cena'), '1 minuto · più 1 ora di riposo · Cena');
    assert.equal(sottotitoloRicetta(null, null, 'Cena'), 'Cena');
    assert.equal(sottotitoloRicetta(0, 0, ' Pranzo '), 'Pranzo');
  });
  it('durata e riga dell\'elenco', () => {
    assert.equal(durata(0), '0 minuti');
    assert.equal(durata(61), '1 ora e 1 minuto');
    assert.equal(sottotitoloElenco('Pranzo', 20), 'Pranzo · 20 min');
    assert.equal(sottotitoloElenco('Pranzo', null), 'Pranzo');
  });
  it('ingrediente e porzioni', () => {
    assert.equal(testoIngrediente('Sale e pepe', 'q.b.'), 'Sale e pepe · q.b.');
    assert.equal(testoIngrediente('Sale', null), 'Sale');
    assert.equal(rigaPorzioni(null), null);
    assert.equal(rigaPorzioni({ numero: 8, laTuaPorzione: 'una fetta, circa 110 g' }), 'Per 8 porzioni · La tua porzione: una fetta, circa 110 g');
    assert.equal(rigaPorzioni({ numero: null, laTuaPorzione: 'una fetta' }), 'La tua porzione: una fetta');
    assert.equal(rigaPorzioni({ numero: 1, laTuaPorzione: null }), 'Per 1 porzione');
  });
});
