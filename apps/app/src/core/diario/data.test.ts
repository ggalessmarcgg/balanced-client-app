import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { aggiungiGiorni, dataOggiRoma, dataValida, etichettaData, giorniDellaSettimana, intervalloLetture, lunediDellaSettimana } from './data.ts';

describe('dataOggiRoma', () => {
  it('a mezzanotte italiana si passa al giorno nuovo anche se in UTC è ancora il giorno prima (ora legale)', () => {
    assert.equal(dataOggiRoma(new Date('2026-10-19T21:59:59.000Z')), '2026-10-19');
    assert.equal(dataOggiRoma(new Date('2026-10-19T22:00:00.000Z')), '2026-10-20');
  });
  it("con l'ora solare il confine è alle 23:00 UTC", () => {
    assert.equal(dataOggiRoma(new Date('2026-12-01T22:59:59.000Z')), '2026-12-01');
    assert.equal(dataOggiRoma(new Date('2026-12-01T23:00:00.000Z')), '2026-12-02');
  });
  it("l'invio automatico delle 23:50 italiane vede lo stesso giorno dell'app", () => {
    // cron 50 21 * * * UTC = 23:50 con l'ora legale
    assert.equal(dataOggiRoma(new Date('2026-10-19T21:50:00.000Z')), '2026-10-19');
  });
});

describe('settimana e intervallo', () => {
  it('lunedì della settimana (settimana lunedì–domenica)', () => {
    assert.equal(lunediDellaSettimana('2026-10-19'), '2026-10-19'); // lunedì
    assert.equal(lunediDellaSettimana('2026-10-22'), '2026-10-19'); // giovedì
    assert.equal(lunediDellaSettimana('2026-10-25'), '2026-10-19'); // domenica
  });
  it('i sette giorni da lunedì a domenica', () => {
    assert.deepEqual(giorniDellaSettimana('2026-10-21'), ['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25']);
  });
  it("l'intervallo copre la settimana corrente e gli ultimi 7 giorni", () => {
    // mercoledì: oggi − 6 = giovedì scorso, prima del lunedì
    assert.deepEqual(intervalloLetture('2026-10-21'), { da: '2026-10-15', a: '2026-10-25' });
    // domenica: oggi − 6 = lunedì stesso
    assert.deepEqual(intervalloLetture('2026-10-25'), { da: '2026-10-19', a: '2026-10-25' });
    // lunedì: 6 giorni indietro
    assert.deepEqual(intervalloLetture('2026-10-19'), { da: '2026-10-13', a: '2026-10-25' });
  });
  it('aggiungiGiorni attraversa mesi e anni', () => {
    assert.equal(aggiungiGiorni('2026-12-30', 3), '2027-01-02');
    assert.equal(aggiungiGiorni('2026-03-01', -1), '2026-02-28');
  });
});

describe('etichettaData e dataValida', () => {
  it('"Venerdì 9 ottobre" come in Figma', () => {
    assert.equal(etichettaData('2026-10-09'), 'Venerdì 9 ottobre');
    assert.equal(etichettaData('2026-01-01'), 'Giovedì 1 gennaio');
  });
  it('riconosce le date valide', () => {
    assert.equal(dataValida('2026-02-29'), false);
    assert.equal(dataValida('2024-02-29'), true);
    assert.equal(dataValida('2026-10-9'), false);
  });
});
