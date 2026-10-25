import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { nuovaCopia, pianoDallaCopia, VERSIONE_COPIA } from './copia.ts';
import type { PianoServer } from './tipi.ts';

const piano: PianoServer = {
  id: 'p1',
  plan_type: 'fisso',
  sent_at: null,
  updated_at: '2026-10-24T19:30:28.318152+00:00',
  days: [{ day_index: 1, name: 'Lunedì', meals: [{ id: 'm1', position: 1, name: 'Pranzo', sections: [{ category: 'carboidrati', position: 1, rows: [{ id: 'r1', position: 1, name: 'Pasta', quantity_type: 'libero', quantity: null, measure_type: null, practical_quantity: '120 g' }] }] }] }],
  indications: [],
};

describe('copia del piano sul telefono', () => {
  it('una copia della versione corrente, del cliente giusto, restituisce il piano con gli id delle righe', () => {
    const testo = JSON.stringify(nuovaCopia('c1', piano, new Date('2026-10-25T10:00:00Z')));
    const letto = pianoDallaCopia(testo, 'c1');
    assert.ok(letto);
    assert.equal(letto.id, 'p1');
    assert.equal(letto.days[0]?.meals[0]?.sections[0]?.rows[0]?.id, 'r1');
  });
  it('la copia salvata prima della v0.6 (senza versione, righe senza id) si scarta: prima lettura senza versione nota', () => {
    const { id: _id, ...rigaSenzaId } = piano.days[0]!.meals[0]!.sections[0]!.rows[0]!;
    const vecchia = { clientId: 'c1', letto: '2026-10-24T20:00:00Z', piano: { ...piano, days: [{ ...piano.days[0]!, meals: [{ ...piano.days[0]!.meals[0]!, sections: [{ category: 'carboidrati', position: 1, rows: [rigaSenzaId] }] }] }] } };
    assert.equal(pianoDallaCopia(JSON.stringify(vecchia), 'c1'), null);
  });
  it('versione diversa, altro cliente, testo assente o corrotto → null', () => {
    const copia = nuovaCopia('c1', piano, new Date());
    assert.equal(pianoDallaCopia(JSON.stringify({ ...copia, versione: VERSIONE_COPIA + 1 }), 'c1'), null);
    assert.equal(pianoDallaCopia(JSON.stringify(copia), 'c2'), null);
    assert.equal(pianoDallaCopia(null, 'c1'), null);
    assert.equal(pianoDallaCopia('{non json', 'c1'), null);
    assert.equal(pianoDallaCopia(JSON.stringify({ ...copia, piano: { esito: 'x' } }), 'c1'), null);
  });
});
