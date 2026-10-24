import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { interpretaRisposta, parametriVersione } from './tipi.ts';

describe('risposta della funzione', () => {
  it('i tre esiti del contratto; forme sconosciute → null', () => {
    assert.deepEqual(interpretaRisposta({ esito: 'nessun_piano' }), { esito: 'nessun_piano' });
    assert.deepEqual(interpretaRisposta({ esito: 'invariato' }), { esito: 'invariato' });
    assert.equal(interpretaRisposta({ esito: 'altro' }), null);
    assert.equal(interpretaRisposta(null), null);
    assert.equal(interpretaRisposta('piano'), null);
    assert.equal(interpretaRisposta({ esito: 'piano', id: 'x', plan_type: 'settimanale', updated_at: 'u' }), null);
    assert.equal(interpretaRisposta({ esito: 'piano', plan_type: 'fisso', updated_at: 'u' }), null);
  });
  it('piano: scheletro verificato, valori fuori formato a null, elenchi mancanti vuoti', () => {
    const r = interpretaRisposta({
      esito: 'piano',
      id: 'p1',
      plan_type: 'variabile',
      sent_at: null,
      updated_at: '2026-10-24T19:30:28.318152+00:00',
      days: [
        {
          day_index: '1',
          name: 'Giornata tipo',
          meals: [
            { id: 'm1', position: 1, name: 'Pranzo', sections: [{ category: 'dolci', position: 1, rows: [{ position: 1, name: 'Pasta', quantity_type: 'esatta', quantity: '120', measure_type: 'kg', practical_quantity: 7 }] }] },
            { position: 2, name: 'senza id' },
            'non un pasto',
          ],
        },
      ],
      indications: 'nessuna',
    });
    assert.ok(r && r.esito === 'piano');
    const piano = r.piano;
    assert.equal(piano.sent_at, null);
    assert.equal(piano.days.length, 1);
    assert.equal(piano.days[0]?.day_index, 1);
    assert.equal(piano.days[0]?.meals.length, 1);
    const sezione = piano.days[0]?.meals[0]?.sections[0];
    assert.equal(sezione?.category, null);
    assert.deepEqual(sezione?.rows[0], { position: 1, name: 'Pasta', quantity_type: null, quantity: 120, measure_type: null, practical_quantity: null });
    assert.deepEqual(piano.indications, []);
  });
  it('parametri della versione nota solo con una copia', () => {
    assert.equal(parametriVersione(null), undefined);
    assert.deepEqual(parametriVersione({ id: 'p1', updated_at: '2026-10-24T19:30:28.318152+00:00' }), { p_known_plan_id: 'p1', p_known_updated_at: '2026-10-24T19:30:28.318152+00:00' });
  });
});
