// Curva morbida del grafico del peso (Figma 525:2878): interpolazione cubica monotona (Fritsch–Carlson), che passa per
// i punti senza mai superare i valori reali tra due misurazioni consecutive. Restituisce i segmenti di Bézier cubica
// per un percorso SVG, in coordinate già proiettate.

export type Punto = { x: number; y: number };
export type SegmentoCubico = { c1: Punto; c2: Punto; a: Punto };

/** Pendenze per punto secondo Fritsch–Carlson: tangenti nulle dove la serie cambia direzione o è piatta, così la curva non oscilla. */
export function pendenzeMonotone(punti: Punto[]): number[] {
  const n = punti.length;
  if (n < 2) return punti.map(() => 0);
  const delta: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const a = punti[i] as Punto;
    const b = punti[i + 1] as Punto;
    const dx = b.x - a.x;
    delta.push(dx === 0 ? 0 : (b.y - a.y) / dx);
  }
  const m: number[] = new Array(n).fill(0);
  m[0] = delta[0] ?? 0;
  m[n - 1] = delta[n - 2] ?? 0;
  for (let i = 1; i < n - 1; i++) {
    const d0 = delta[i - 1] ?? 0;
    const d1 = delta[i] ?? 0;
    m[i] = d0 * d1 <= 0 ? 0 : (d0 + d1) / 2;
  }
  for (let i = 0; i < n - 1; i++) {
    const d = delta[i] ?? 0;
    if (d === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const alfa = (m[i] ?? 0) / d;
    const beta = (m[i + 1] ?? 0) / d;
    const tau = alfa * alfa + beta * beta;
    if (tau > 9) {
      const t = 3 / Math.sqrt(tau);
      m[i] = t * alfa * d;
      m[i + 1] = t * beta * d;
    }
  }
  return m;
}

/** Segmenti cubici tra punti consecutivi (coordinate di schermo: x crescente, y verso il basso). */
export function segmentiCurva(punti: Punto[]): SegmentoCubico[] {
  const m = pendenzeMonotone(punti);
  const segmenti: SegmentoCubico[] = [];
  for (let i = 0; i < punti.length - 1; i++) {
    const p0 = punti[i] as Punto;
    const p1 = punti[i + 1] as Punto;
    const dx = (p1.x - p0.x) / 3;
    segmenti.push({ c1: { x: p0.x + dx, y: p0.y + dx * (m[i] ?? 0) }, c2: { x: p1.x - dx, y: p1.y - dx * (m[i + 1] ?? 0) }, a: p1 });
  }
  return segmenti;
}

/** Percorso SVG ("M … C …") della curva per i punti dati; stringa vuota con meno di due punti. */
export function percorsoCurva(punti: Punto[]): string {
  const p0 = punti[0];
  if (!p0 || punti.length < 2) return '';
  const f = (n: number) => n.toFixed(2);
  return `M ${f(p0.x)} ${f(p0.y)} ` + segmentiCurva(punti).map((s) => `C ${f(s.c1.x)} ${f(s.c1.y)}, ${f(s.c2.x)} ${f(s.c2.y)}, ${f(s.a.x)} ${f(s.a.y)}`).join(' ');
}

/** Valore della curva al parametro t (0–1) di un segmento: per i test dei limiti. */
export function puntoSuSegmento(p0: Punto, s: SegmentoCubico, t: number): Punto {
  const u = 1 - t;
  const x = u * u * u * p0.x + 3 * u * u * t * s.c1.x + 3 * u * t * t * s.c2.x + t * t * t * s.a.x;
  const y = u * u * u * p0.y + 3 * u * u * t * s.c1.y + 3 * u * t * t * s.c2.y + t * t * t * s.a.y;
  return { x, y };
}
