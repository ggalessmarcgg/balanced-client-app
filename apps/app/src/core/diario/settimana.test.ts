import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { giorniSettimana, type RigaPerSettimana } from './settimana.ts';

const riga = (submission_date: string, status: string, commento: string | null = null, letto: boolean | null = null): RigaPerSettimana => ({
  submission_date,
  status,
  nutritionist_comment: commento,
  comment_acknowledged: letto,
});

describe('giorniSettimana', () => {
  it('condiviso, non condiviso (anche con una bozza), oggi e futuro, da lunedì a domenica', () => {
    const giorni = giorniSettimana('2026-10-23', [
      riga('2026-10-19', 'submitted'),
      riga('2026-10-20', 'submitted'),
      riga('2026-10-21', 'draft'),
      riga('2026-10-22', 'submitted'),
      riga('2026-10-23', 'submitted'),
      riga('2026-10-15', 'submitted'), // settimana scorsa: ignorata
    ]);
    assert.deepEqual(
      giorni.map((g) => `${g.iniziale}:${g.stato}`),
      ['L:condiviso', 'M:condiviso', 'M:nonCondiviso', 'G:condiviso', 'V:oggi', 'S:futuro', 'D:futuro'],
    );
    assert.equal(giorni[0]?.data, '2026-10-19');
  });

  it('pallino rosso con un commento da leggere, verde scuro con un commento letto (Figma 474:1328)', () => {
    const giorni = giorniSettimana('2026-10-09', [
      riga('2026-10-05', 'submitted', 'Ottima giornata!', true),
      riga('2026-10-06', 'submitted'),
      riga('2026-10-08', 'submitted', 'Bene la colazione proteica.', false),
      riga('2026-10-07', 'submitted', '   ', false), // commento vuoto: nessun pallino
    ]);
    assert.deepEqual(
      giorni.map((g) => `${g.iniziale}:${g.stato}:${g.commento}`),
      ['L:condivisoLetto:letto', 'M:condiviso:nessuno', 'M:condiviso:nessuno', 'G:condivisoDaLeggere:daLeggere', 'V:oggi:nessuno', 'S:futuro:nessuno', 'D:futuro:nessuno'],
    );
  });

  it('solo i giorni con una riga condivisa si possono aprire; oggi con un commento ha la variante "oggi con commento" (704:436, 704:442)', () => {
    const giorni = giorniSettimana('2026-10-09', [riga('2026-10-05', 'submitted'), riga('2026-10-06', 'draft'), riga('2026-10-09', 'submitted', 'Bravo', false)]);
    assert.deepEqual(
      giorni.map((g) => `${g.iniziale}:${g.condiviso}`),
      ['L:true', 'M:false', 'M:false', 'G:false', 'V:true', 'S:false', 'D:false'],
    );
    assert.equal(giorni[4]?.stato, 'oggiDaLeggere');
    assert.equal(giorni[4]?.commento, 'daLeggere');
    const letto = giorniSettimana('2026-10-09', [riga('2026-10-09', 'submitted', 'Bravo', true)]);
    assert.equal(letto[4]?.stato, 'oggiLetto');
    const senzaCommento = giorniSettimana('2026-10-09', [riga('2026-10-09', 'submitted')]);
    assert.equal(senzaCommento[4]?.stato, 'oggi');
  });
});
