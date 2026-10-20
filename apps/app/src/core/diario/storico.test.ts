import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { etichettaCondivise, etichettaMese, giorniMese, intervalloMese, intervalloMeseFuoriSettimana, meseSuccessivo, mesiStorico, settimaneDelMese } from './storico.ts';

describe('mesi dello storico', () => {
  it('dal mese corrente indietro fino al mese del primo diario', () => {
    assert.deepEqual(mesiStorico('2026-06-14', '2026-10-09'), ['2026-10', '2026-09', '2026-08', '2026-07', '2026-06']);
    assert.deepEqual(mesiStorico('2025-11-30', '2026-02-01'), ['2026-02', '2026-01', '2025-12', '2025-11']);
  });
  it('senza diari, o con il primo diario nel mese corrente o nel futuro, solo il mese corrente', () => {
    assert.deepEqual(mesiStorico(null, '2026-10-09'), ['2026-10']);
    assert.deepEqual(mesiStorico('2026-10-03', '2026-10-09'), ['2026-10']);
    assert.deepEqual(mesiStorico('2026-11-03', '2026-10-09'), ['2026-10']);
  });
  it('intervalli dei mesi e mese successivo', () => {
    assert.deepEqual(intervalloMese('2026-02'), { da: '2026-02-01', a: '2026-02-28' });
    assert.deepEqual(intervalloMese('2024-02'), { da: '2024-02-01', a: '2024-02-29' });
    assert.deepEqual(intervalloMese('2026-12'), { da: '2026-12-01', a: '2026-12-31' });
    assert.equal(meseSuccessivo('2026-12'), '2027-01');
  });
  it('la parte del mese corrente prima della settimana corrente (già in cache)', () => {
    // venerdì 9 ottobre 2026: la settimana comincia lunedì 5 → da leggere 1–4
    assert.deepEqual(intervalloMeseFuoriSettimana('2026-10', '2026-10-09'), { da: '2026-10-01', a: '2026-10-04' });
    // giovedì 1 ottobre 2026: la settimana comincia il 28 settembre → nulla da leggere
    assert.equal(intervalloMeseFuoriSettimana('2026-10', '2026-10-01'), null);
    // lunedì 5 ottobre: da leggere 1–4
    assert.deepEqual(intervalloMeseFuoriSettimana('2026-10', '2026-10-05'), { da: '2026-10-01', a: '2026-10-04' });
  });
});

describe('settimane del mese allineate a sinistra', () => {
  it('ottobre 2026 comincia di giovedì: prima riga 1–4, poi righe di 7, ultima 26–31 (Figma 475:1917)', () => {
    const righe = settimaneDelMese('2026-10').map((r) => r.map((d) => Number(d.slice(8))));
    assert.deepEqual(righe, [
      [1, 2, 3, 4],
      [5, 6, 7, 8, 9, 10, 11],
      [12, 13, 14, 15, 16, 17, 18],
      [19, 20, 21, 22, 23, 24, 25],
      [26, 27, 28, 29, 30, 31],
    ]);
  });
  it('settembre 2026 comincia di martedì: prima riga 1–6; un mese che comincia di lunedì ha la prima riga piena', () => {
    assert.deepEqual(settimaneDelMese('2026-09')[0]?.map((d) => Number(d.slice(8))), [1, 2, 3, 4, 5, 6]);
    assert.deepEqual(settimaneDelMese('2026-06')[0]?.map((d) => Number(d.slice(8))), [1, 2, 3, 4, 5, 6, 7]);
    assert.equal(settimaneDelMese('2026-06').length, 5);
  });
});

describe('giorni del mese', () => {
  it('condiviso, non condiviso (una bozza non conta), oggi e futuro; conteggio delle condivise', () => {
    const righe = [
      { submission_date: '2026-10-01', status: 'submitted', review_status: 'positive' },
      { submission_date: '2026-10-02', status: 'submitted', review_status: 'needs_review' },
      { submission_date: '2026-10-04', status: 'draft', review_status: null },
      { submission_date: '2026-10-08', status: 'submitted', review_status: null },
      { submission_date: '2026-10-09', status: 'submitted', review_status: 'positive' },
      { submission_date: '2026-09-30', status: 'submitted', review_status: 'positive' }, // altro mese: ignorata
    ];
    const mese = giorniMese('2026-10', righe, '2026-10-09');
    const stati = mese.settimane.flat().map((g) => `${g.numero}:${g.stato}`);
    assert.deepEqual(stati.slice(0, 11), ['1:condiviso', '2:condiviso', '3:nonCondiviso', '4:nonCondiviso', '5:nonCondiviso', '6:nonCondiviso', '7:nonCondiviso', '8:condiviso', '9:oggi', '10:futuro', '11:futuro']);
    assert.equal(mese.condivise, 4);
    assert.equal(mese.settimane[1]?.[4]?.condiviso, true); // oggi condiviso: apribile
    assert.equal(mese.settimane[1]?.[5]?.condiviso, false);
    // valutazione: approvata (1), da rivedere (2), in attesa (8), oggi condiviso approvato (9), null per gli altri
    assert.deepEqual(
      mese.settimane.flat().slice(0, 9).map((g) => g.valutazione),
      ['approvata', 'daRivedere', null, null, null, null, null, 'inAttesa', 'approvata'],
    );
  });
  it('etichette', () => {
    assert.equal(etichettaMese('2026-10'), 'Ottobre 2026');
    assert.equal(etichettaMese('2025-01'), 'Gennaio 2025');
    assert.equal(etichettaCondivise(0), 'Nessuna giornata condivisa');
    assert.equal(etichettaCondivise(1), '1 giornata condivisa');
    assert.equal(etichettaCondivise(6), '6 giornate condivise');
  });
});
