import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { formattaNumero, nomeBreve, quantitaRiga, testoRiga } from './riga.ts';

const riga = (parte: Partial<Parameters<typeof quantitaRiga>[0]>) => ({ quantity_type: 'libero' as const, quantity: null, measure_type: null, practical_quantity: null, ...parte });

describe('quantità della riga', () => {
  it('a_piacere vince su tutto', () => {
    assert.equal(quantitaRiga(riga({ quantity_type: 'a_piacere', measure_type: 'g', quantity: 100, practical_quantity: '2 pezzi' })), 'a piacere');
    // Caso reale del censimento: a_piacere con measure_type valorizzato e nulla di più → mai "g" da solo.
    assert.equal(quantitaRiga(riga({ quantity_type: 'a_piacere', measure_type: 'g' })), 'a piacere');
  });
  it('practical_quantity così com\'è, prima di quantity + measure_type', () => {
    assert.equal(quantitaRiga(riga({ practical_quantity: '70 g · 1,5 brioche', quantity: 70, measure_type: 'g' })), '70 g · 1,5 brioche');
    assert.equal(quantitaRiga(riga({ quantity_type: 'precisa', practical_quantity: '  5 fette ' })), '5 fette');
  });
  it('quantity + measure_type con i numeri all\'italiana; senza unità solo il numero', () => {
    assert.equal(quantitaRiga(riga({ quantity_type: 'precisa', quantity: 120, measure_type: 'g' })), '120 g');
    assert.equal(quantitaRiga(riga({ quantity_type: 'precisa', quantity: 200, measure_type: 'ml' })), '200 ml');
    assert.equal(quantitaRiga(riga({ quantity_type: 'precisa', quantity: 12.5, measure_type: 'g' })), '12,5 g');
    assert.equal(quantitaRiga(riga({ quantity_type: 'precisa', quantity: 2 })), '2');
    assert.equal(quantitaRiga(riga({ practical_quantity: '   ', quantity: 0.333, measure_type: 'ml' })), '0,33 ml');
  });
  it('senza nulla → null (solo il nome, senza separatore); measure_type da solo non si mostra', () => {
    assert.equal(quantitaRiga(riga({})), null);
    assert.equal(quantitaRiga(riga({ measure_type: 'g' })), null);
    assert.equal(testoRiga('Insalata', null), 'Insalata');
    assert.equal(testoRiga('Pasta di semola', '120 g'), 'Pasta di semola · 120 g');
  });
  it('formattaNumero: virgola, due decimali al massimo, senza zeri finali', () => {
    assert.equal(formattaNumero(120), '120');
    assert.equal(formattaNumero(1.5), '1,5');
    assert.equal(formattaNumero(1.256), '1,26');
    assert.equal(formattaNumero(1.1), '1,1');
  });
});

describe('nome breve del pasto', () => {
  it('oltre i 6 caratteri i primi 5 più il punto; fino a 6 intero; maiuscole come arrivano', () => {
    assert.equal(nomeBreve('Colazione'), 'Colaz.');
    assert.equal(nomeBreve('Spuntini'), 'Spunt.');
    assert.equal(nomeBreve('Pranzo'), 'Pranzo');
    assert.equal(nomeBreve('Cena'), 'Cena');
    assert.equal(nomeBreve('Merenda'), 'Meren.');
    assert.equal(nomeBreve('colazione salata o dolce semplice'), 'colaz.');
    assert.equal(nomeBreve('Spuntino delle 17 (pre-allenamento nei giorni di palestra)'), 'Spunt.');
  });
  it('spazi ai lati ignorati; uno spazio al taglio non resta prima del punto', () => {
    assert.equal(nomeBreve('  Pranzo  '), 'Pranzo');
    assert.equal(nomeBreve('Pre a cena'), 'Pre a.');
    assert.equal(nomeBreve('Cena leggera'), 'Cena.');
  });
});
