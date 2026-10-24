import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { componiPiano, etichettaAggiornamento, indicazioniVisibili } from './composizione.ts';
import type { PastoServer, PianoServer, RigaServer, SezioneServer } from './tipi.ts';

const riga = (position: number, name: string | null, parte: Partial<RigaServer> = {}): RigaServer => ({ position, name, quantity_type: 'libero', quantity: null, measure_type: null, practical_quantity: null, ...parte });
const sezione = (position: number, category: SezioneServer['category'], rows: RigaServer[]): SezioneServer => ({ position, category, rows });
const pasto = (position: number, name: string, sections: SezioneServer[]): PastoServer => ({ id: `p${position}-${name}`, position, name, sections });
const piano = (plan_type: PianoServer['plan_type'], days: PianoServer['days'], indications: PianoServer['indications'] = []): PianoServer => ({ id: 'piano', plan_type, sent_at: null, updated_at: '2026-10-12T09:00:00+00:00', days, indications });

const colazione = pasto(1, 'Colazione', [sezione(1, 'carboidrati', [riga(1, 'Brioche', { practical_quantity: '70 g · 1,5 brioche' })]), sezione(2, 'proteine', [riga(1, 'Latte', { practical_quantity: '280 ml' })])]);
const vuoto = pasto(2, 'Spuntino', [sezione(1, 'carboidrati', []), sezione(2, 'proteine', [])]);

describe('composizione del fisso', () => {
  it('nasconde sezioni, pasti e giorni vuoti; righe in ordine di sezione e di riga, senza categorie', () => {
    const p = piano('fisso', [
      { day_index: 2, name: 'Martedì', meals: [vuoto] },
      {
        day_index: 1,
        name: 'Lunedì',
        meals: [
          pasto(2, 'Pranzo', [sezione(4, 'fibre', [riga(1, 'Insalata', { quantity_type: 'a_piacere', measure_type: 'g' })]), sezione(1, 'carboidrati', [riga(2, 'Pane', { quantity_type: 'precisa', quantity: 50, measure_type: 'g' }), riga(1, 'Pasta', { quantity_type: 'precisa', quantity: 120, measure_type: 'g' })])]),
          colazione,
          vuoto,
        ],
      },
      { day_index: 3, name: 'Mercoledì', meals: [] },
    ]);
    const c = componiPiano(p);
    assert.ok(c && c.tipo === 'fisso');
    assert.deepEqual(c.giorni.map((g) => [g.indice, g.nome, g.iniziale]), [[1, 'Lunedì', 'L']]);
    const giorno = c.giorni[0]!;
    assert.deepEqual(giorno.pasti.map((m) => m.nome), ['Colazione', 'Pranzo']);
    assert.deepEqual(giorno.pasti[0]?.righe.map((r) => r.testo), ['Brioche · 70 g · 1,5 brioche', 'Latte · 280 ml']);
    assert.deepEqual(giorno.pasti[1]?.righe.map((r) => r.testo), ['Pasta · 120 g', 'Pane · 50 g', 'Insalata · a piacere']);
    assert.equal(giorno.pasti[1]?.nomeBreve, 'Pranzo');
    assert.equal(c.aggiornatoIl, 'Aggiornato il 12 ottobre');
    assert.deepEqual(c.indicazioni, []);
  });
  it('iniziali dei sette giorni da day_index; righe senza nome nascoste; piano senza righe → null', () => {
    const giorni = [1, 2, 3, 4, 5, 6, 7].map((i) => ({ day_index: i, name: `G${i}`, meals: [colazione] }));
    const c = componiPiano(piano('fisso', giorni));
    assert.ok(c && c.tipo === 'fisso');
    assert.deepEqual(c.giorni.map((g) => g.iniziale), ['L', 'M', 'M', 'G', 'V', 'S', 'D']);
    assert.equal(componiPiano(piano('fisso', [{ day_index: 1, name: 'Lunedì', meals: [vuoto, pasto(3, 'Cena', [sezione(1, 'proteine', [riga(1, '  '), riga(2, null)])])] }])), null);
    assert.equal(componiPiano(piano('fisso', [])), null);
  });
});

describe('composizione del variabile', () => {
  it('un solo giorno; righe per categoria nell\'ordine fisso, sezioni della stessa categoria unite', () => {
    const pranzo = pasto(2, 'Pranzo', [
      sezione(1, 'fibre', [riga(1, 'Verdure', { quantity_type: 'a_piacere' })]),
      sezione(2, 'carboidrati', [riga(1, 'Pasta', { quantity_type: 'precisa', quantity: 70, measure_type: 'g' })]),
      sezione(3, 'proteine', [riga(2, 'Carne bianca', { quantity_type: 'precisa', quantity: 120, measure_type: 'g' }), riga(1, 'Legumi', { quantity_type: 'precisa', quantity: 120, measure_type: 'g' })]),
      sezione(4, 'carboidrati', [riga(1, 'Pane integrale', { practical_quantity: '2 fette' })]),
      sezione(5, 'zuccheri', [riga(1, 'Cioccolato fondente', { practical_quantity: '2 quadretti' })]),
      sezione(6, 'grassi', []),
      sezione(7, null, [riga(1, 'Senza categoria')]),
    ]);
    const c = componiPiano(piano('variabile', [{ day_index: 1, name: 'Giornata tipo', meals: [pranzo, vuoto, pasto(1, 'colazione semplice', [sezione(1, 'grassi', [riga(1, 'Olio', { practical_quantity: '1 cucchiaio' })])])] }]));
    assert.ok(c && c.tipo === 'variabile');
    assert.deepEqual(c.pasti.map((m) => [m.nome, m.nomeBreve]), [['colazione semplice', 'colaz.'], ['Pranzo', 'Pranzo']]);
    const gruppi = c.pasti[1]!.gruppi;
    assert.deepEqual(gruppi.map((g) => g.etichetta), ['Carboidrati', 'Proteine', 'Fibre', 'Zuccheri']);
    assert.deepEqual(gruppi[0]?.righe.map((r) => r.testo), ['Pasta · 70 g', 'Pane integrale · 2 fette']);
    assert.deepEqual(gruppi[1]?.righe.map((r) => r.testo), ['Legumi · 120 g', 'Carne bianca · 120 g']);
    assert.deepEqual(gruppi[2]?.righe.map((r) => r.testo), ['Verdure · a piacere']);
  });
  it('variabile senza righe → null; con più giorni si usa il primo con pasti visibili', () => {
    assert.equal(componiPiano(piano('variabile', [{ day_index: 1, name: 'Giornata tipo', meals: [vuoto] }])), null);
    const c = componiPiano(piano('variabile', [{ day_index: 2, name: 'B', meals: [colazione] }, { day_index: 1, name: 'A', meals: [vuoto] }]));
    assert.ok(c && c.tipo === 'variabile');
    assert.equal(c.pasti[0]?.nome, 'Colazione');
  });
});

describe('indicazioni e aggiornamento', () => {
  it('indicazioni in ordine di position; vuote nascoste; nessuna → elenco vuoto (nessun pulsante)', () => {
    assert.deepEqual(indicazioniVisibili([{ position: 2, title: 'Due', body: 'b' }, { position: 1, title: null, body: 'solo testo' }, { position: 3, title: ' ', body: '' }, { position: 4, title: 'Solo titolo', body: null }]), [
      { titolo: '', testo: 'solo testo' },
      { titolo: 'Due', testo: 'b' },
      { titolo: 'Solo titolo', testo: '' },
    ]);
    assert.deepEqual(indicazioniVisibili([]), []);
  });
  it('"Aggiornato il" in ora italiana: le 23:30 UTC del 12 sono già il 13 a Roma; data illeggibile → null', () => {
    assert.equal(etichettaAggiornamento('2026-10-12T23:30:00+00:00'), 'Aggiornato il 13 ottobre');
    assert.equal(etichettaAggiornamento('2026-10-24T19:30:28.318152+00:00'), 'Aggiornato il 24 ottobre');
    assert.equal(etichettaAggiornamento('non una data'), null);
  });
});
