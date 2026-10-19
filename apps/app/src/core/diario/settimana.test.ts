import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { giorniSettimana } from './settimana.ts';

describe('giorniSettimana', () => {
  it('condiviso, non condiviso (anche con una bozza), oggi e futuro, da lunedì a domenica', () => {
    const giorni = giorniSettimana('2026-10-23', [
      { submission_date: '2026-10-19', status: 'submitted' },
      { submission_date: '2026-10-20', status: 'submitted' },
      { submission_date: '2026-10-21', status: 'draft' },
      { submission_date: '2026-10-22', status: 'submitted' },
      { submission_date: '2026-10-23', status: 'submitted' },
      { submission_date: '2026-10-15', status: 'submitted' }, // settimana scorsa: ignorata
    ]);
    assert.deepEqual(
      giorni.map((g) => `${g.iniziale}:${g.stato}`),
      ['L:condiviso', 'M:condiviso', 'M:nonCondiviso', 'G:condiviso', 'V:oggi', 'S:futuro', 'D:futuro'],
    );
    assert.equal(giorni[0]?.data, '2026-10-19');
  });
});
