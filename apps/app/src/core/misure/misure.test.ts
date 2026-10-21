import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { calcolaBmi, confrontoCirconferenze, datiMisure, etichettaBmi, etichettaCm, etichettaDataBreve, etichettaKg, posizioneBmi, puntiPeso, raggiRadar } from './misure.ts';

const misurazione = (measurement_date: string, waist: number | null, hips: number | null = null) => ({ measurement_date, waist, hips, abdomen: null, arm: null, wrist: null, thigh: null });

describe('peso e misure', () => {
  it('pesi in ordine cronologico, numeri anche da stringhe con la virgola, BMI dall\'ultimo peso e dall\'altezza', () => {
    const d = datiMisure({ height: '170', weight_logs: [{ log_date: '2026-10-02', weight: '69,2' }, { log_date: '2026-05-03', weight: 72.4 }, { log_date: '2026-07-10', weight: null }], measurements: [] });
    assert.deepEqual(d.pesi, [
      { data: '2026-05-03', kg: 72.4 },
      { data: '2026-10-02', kg: 69.2 },
    ]);
    assert.equal(d.bmi, 23.9);
    assert.equal(calcolaBmi(69.2, null), null);
    assert.equal(calcolaBmi(null, 170), null);
    assert.equal(datiMisure(null).bmi, null);
  });
  it('misurazioni dalla più recente, solo le date con almeno un valore; confronto prima/ultima solo con due o più', () => {
    const d = datiMisure({ height: null, weight_logs: null, measurements: [misurazione('2026-05-03', 82, 102), misurazione('2026-10-02', 78, 99), misurazione('2026-07-01', null)] });
    assert.deepEqual(
      d.misurazioni.map((m) => m.data),
      ['2026-10-02', '2026-05-03'],
    );
    const c = confrontoCirconferenze(d.misurazioni);
    assert.equal(c?.prima.data, '2026-05-03');
    assert.equal(c?.ultima.data, '2026-10-02');
    assert.equal(confrontoCirconferenze(d.misurazioni.slice(0, 1)), null);
    // Scala da 78 − 10 % = 70,2 a 82: il più alto sul bordo, il più basso a (78 − 70,2) / (82 − 70,2).
    const vita = raggiRadar(c!.prima, c!.ultima).waist;
    assert.equal(vita.prima, 1);
    assert.ok(Math.abs(vita.ultima - (78 - 70.2) / (82 - 70.2)) < 1e-9);
    assert.deepEqual(raggiRadar(c!.prima, c!.ultima).arm, { prima: 0, ultima: 0 });
    // Valori uguali: entrambi sul bordo.
    const uguali = raggiRadar({ data: 'a', valori: { ...c!.prima.valori, wrist: 16 } }, { data: 'b', valori: { ...c!.ultima.valori, wrist: 16 } });
    assert.deepEqual(uguali.wrist, { prima: 1, ultima: 1 });
  });
  it('scala del BMI 19–39 e etichette italiane', () => {
    assert.equal(posizioneBmi(19), 0);
    assert.equal(posizioneBmi(29), 0.5);
    assert.equal(posizioneBmi(45), 1);
    assert.equal(etichettaBmi(25.4), '25,4');
    assert.equal(etichettaKg(72.4), '72,4 kg');
    assert.equal(etichettaKg(71), '71,0 kg');
    assert.equal(etichettaCm(78), '78 cm');
    assert.equal(etichettaCm(78.5), '78,5 cm');
    assert.equal(etichettaDataBreve('2026-05-03'), '3 mag');
  });
  it('punti del grafico del peso normalizzati: primo a sinistra, ultimo a destra, valore più alto in alto', () => {
    const punti = puntiPeso([
      { data: '2026-05-03', kg: 72.4 },
      { data: '2026-07-10', kg: 71 },
      { data: '2026-10-02', kg: 69.2 },
    ]);
    assert.deepEqual(punti[0], { x: 0, y: 0 });
    assert.equal(punti[2]?.x, 1);
    assert.equal(punti[2]?.y, 1);
    assert.deepEqual(puntiPeso([{ data: 'x', kg: 70 }]), [{ x: 0.5, y: 0.5 }]);
    assert.deepEqual(
      puntiPeso([
        { data: 'a', kg: 70 },
        { data: 'b', kg: 70 },
      ]).map((p) => p.y),
      [0.5, 0.5],
    );
  });
});
