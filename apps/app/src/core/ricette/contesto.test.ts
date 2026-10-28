import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { PianoComposto } from '../piano/composizione.ts';
import { contestoRicetta, nomeGiorno, pastoIniziale } from './contesto.ts';

const riga = { id: 'r', nome: 'Riso', quantita: '70 g', testo: 'Riso · 70 g' };
const fisso: PianoComposto = {
  id: 'piano-f',
  updatedAt: '2026-10-12T10:00:00Z',
  aggiornatoIl: 'Aggiornato il 12 ottobre',
  indicazioni: [],
  tipo: 'fisso',
  giorni: [
    { indice: 1, nome: 'Lunedì', iniziale: 'L', pasti: [{ id: 'c', nome: 'Colazione', nomeBreve: 'Colaz.', righe: [riga] }] },
    { indice: 4, nome: 'Giovedì', iniziale: 'G', pasti: [{ id: 'c4', nome: 'Colazione', nomeBreve: 'Colaz.', righe: [riga] }, { id: 's4', nome: 'Spuntino', nomeBreve: 'Spunt.', righe: [riga] }, { id: 'p4', nome: 'Pranzo', nomeBreve: 'Pranzo', righe: [riga] }, { id: 's4b', nome: 'Spuntino', nomeBreve: 'Spunt.', righe: [riga] }, { id: 'ce4', nome: 'Cena', nomeBreve: 'Cena', righe: [riga] }] },
  ],
};
const variabile: PianoComposto = {
  id: 'piano-v',
  updatedAt: '2026-10-12T10:00:00Z',
  aggiornatoIl: null,
  indicazioni: [],
  tipo: 'variabile',
  pasti: [{ id: 'col', nome: 'Colazione', nomeBreve: 'Colaz.', gruppi: [] }, { id: 'pr', nome: 'Pranzo', nomeBreve: 'Pranzo', gruppi: [] }],
};

describe('contesto della ricetta', () => {
  it('fisso: i pasti del giorno selezionato con il loro nome e nell\'ordine del giorno, anche con nomi uguali; nessuna preselezione', () => {
    const c = contestoRicetta(fisso, 1);
    assert.ok(c && c.tipo === 'fisso');
    assert.deepEqual(c.giorno, { indice: 4, nome: 'Giovedì' });
    assert.deepEqual(c.pasti.map((p) => p.nome), ['Colazione', 'Spuntino', 'Pranzo', 'Spuntino', 'Cena']);
    assert.deepEqual(c.pasti.map((p) => p.id), ['c4', 's4', 'p4', 's4b', 'ce4']);
    assert.equal(c.pianoId, 'piano-f');
    assert.equal(pastoIniziale(c), null);
    assert.equal(nomeGiorno(c), 'Giovedì');
  });
  it('variabile: il pasto del selettore è già scelto; senza giorno', () => {
    const c = contestoRicetta(variabile, 1);
    assert.ok(c && c.tipo === 'variabile');
    assert.deepEqual(c.pasto, { id: 'pr', nome: 'Pranzo' });
    assert.deepEqual(pastoIniziale(c), { id: 'pr', nome: 'Pranzo' });
    assert.equal(nomeGiorno(c), null);
  });
  it('pagina inesistente → null', () => {
    assert.equal(contestoRicetta(fisso, 7), null);
    assert.equal(contestoRicetta(variabile, -1), null);
  });
});
