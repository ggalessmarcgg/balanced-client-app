import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { pendenzeMonotone, percorsoCurva, puntoSuSegmento, segmentiCurva, type Punto } from './curva.ts';

const campiona = (punti: Punto[]) => {
  const segmenti = segmentiCurva(punti);
  const esiti: { i: number; y: number }[] = [];
  segmenti.forEach((s, i) => {
    for (let t = 0; t <= 1; t += 0.05) esiti.push({ i, y: puntoSuSegmento(punti[i] as Punto, s, t).y });
  });
  return esiti;
};

describe('curva morbida del peso', () => {
  it('passa per i punti e tra due misurazioni non supera mai i valori reali', () => {
    const punti: Punto[] = [
      { x: 0, y: 10 },
      { x: 50, y: 60 },
      { x: 100, y: 65 },
      { x: 150, y: 20 },
      { x: 200, y: 120 },
    ];
    for (const { i, y } of campiona(punti)) {
      const a = punti[i] as Punto;
      const b = punti[i + 1] as Punto;
      assert.ok(y >= Math.min(a.y, b.y) - 1e-6 && y <= Math.max(a.y, b.y) + 1e-6, `segmento ${i}: ${y} fuori da [${a.y}, ${b.y}]`);
    }
    const s = segmentiCurva(punti);
    assert.deepEqual(s[s.length - 1]?.a, punti[4]);
  });
  it('serie piatta → tangenti nulle e linea dritta; cambio di direzione → tangente nulla sul punto', () => {
    assert.deepEqual(
      pendenzeMonotone([
        { x: 0, y: 5 },
        { x: 10, y: 5 },
        { x: 20, y: 5 },
      ]),
      [0, 0, 0],
    );
    const m = pendenzeMonotone([
      { x: 0, y: 0 },
      { x: 10, y: 10 },
      { x: 20, y: 0 },
    ]);
    assert.equal(m[1], 0);
  });
  it('percorso SVG con M e un C per segmento; vuoto con meno di due punti', () => {
    const p = percorsoCurva([
      { x: 0, y: 0 },
      { x: 10, y: 5 },
      { x: 20, y: 7 },
    ]);
    assert.ok(p.startsWith('M 0.00 0.00 C '));
    assert.equal((p.match(/ C /g) ?? []).length, 2);
    assert.equal(percorsoCurva([{ x: 0, y: 0 }]), '');
  });
});
