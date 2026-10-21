// Peso e misure (censimento step 11, §3): weight_logs e measurements per client_id (indici idx_*_client_date),
// altezza da clients.height. Unità implicite kg e cm. Solo lettura: scrive il CRM. Il BMI si calcola nell'app con
// l'ultimo peso e l'altezza; senza altezza la card non si mostra.
import { etichettaGiornoMese } from '../diario/data.ts';

export const SELEZIONE_MISURE = [
  'height',
  'weight_logs!weight_logs_client_id_fkey(log_date,weight)',
  'measurements!measurements_client_id_fkey(measurement_date,waist,hips,abdomen,arm,wrist,thigh)',
].join(',');
/** Limiti delle righe incorporate (massimo reale oggi: 40 pesi e 15 misurazioni per cliente). */
export const LIMITE_PESI = 60;
export const LIMITE_MISURAZIONI = 24;

export type RigaPeso = { log_date: string; weight: number | string | null };
export type RigaMisurazione = { measurement_date: string; waist: number | string | null; hips: number | string | null; abdomen: number | string | null; arm: number | string | null; wrist: number | string | null; thigh: number | string | null };
export type RigaMisure = { height: number | string | null; weight_logs: RigaPeso[] | null; measurements: RigaMisurazione[] | null };

export type Peso = { data: string; kg: number };
export type Circonferenze = { data: string; valori: Record<ChiaveCirconferenza, number | null> };

export const CIRCONFERENZE = ['waist', 'hips', 'abdomen', 'arm', 'wrist', 'thigh'] as const;
export type ChiaveCirconferenza = (typeof CIRCONFERENZE)[number];
/** Etichette nell'ordine del radar (Figma 525:2903, in senso orario da "Vita" in alto). */
export const ETICHETTE_CIRCONFERENZE: Record<ChiaveCirconferenza, string> = { waist: 'Vita', hips: 'Fianchi', abdomen: 'Addome', arm: 'Braccio', wrist: 'Polso', thigh: 'Coscia' };

/** Scala del BMI del design: 19 · 25 · 29 · 39 (sottopeso / normopeso / sovrappeso / obesità). */
export const SCALA_BMI = { minimo: 19, soglie: [25, 29] as const, massimo: 39 };

export type DatiMisure = {
  altezzaCm: number | null;
  /** Pesi in ordine cronologico crescente. */
  pesi: Peso[];
  /** Misurazioni in ordine cronologico decrescente (la più recente prima), solo le date con almeno un valore. */
  misurazioni: Circonferenze[];
  bmi: number | null;
};

function numero(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

export function calcolaBmi(pesoKg: number | null, altezzaCm: number | null): number | null {
  if (!pesoKg || !altezzaCm || altezzaCm <= 0) return null;
  const m = altezzaCm / 100;
  return Math.round((pesoKg / (m * m)) * 10) / 10;
}

/** Posizione del BMI sulla barra 19–39 (0–1), con i valori fuori scala agli estremi. */
export function posizioneBmi(bmi: number): number {
  return Math.min(1, Math.max(0, (bmi - SCALA_BMI.minimo) / (SCALA_BMI.massimo - SCALA_BMI.minimo)));
}

export function datiMisure(riga: RigaMisure | null): DatiMisure {
  const altezzaCm = numero(riga?.height);
  const pesi = (riga?.weight_logs ?? [])
    .flatMap((r) => {
      const kg = numero(r.weight);
      return kg !== null && r.log_date ? [{ data: r.log_date, kg }] : [];
    })
    .sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0));
  const misurazioni = (riga?.measurements ?? [])
    .map((r) => ({ data: r.measurement_date, valori: Object.fromEntries(CIRCONFERENZE.map((c) => [c, numero(r[c])])) as Record<ChiaveCirconferenza, number | null> }))
    .filter((m) => m.data && CIRCONFERENZE.some((c) => m.valori[c] !== null))
    .sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0));
  const ultimo = pesi[pesi.length - 1];
  return { altezzaCm, pesi, misurazioni, bmi: calcolaBmi(ultimo?.kg ?? null, altezzaCm) };
}

/** "72,4 kg" con la virgola italiana e una cifra decimale. */
export function etichettaKg(kg: number): string {
  return `${kg.toFixed(1).replace('.', ',')} kg`;
}
/** "78 cm" (misure intere; se decimali, una cifra). */
export function etichettaCm(cm: number): string {
  const testo = Number.isInteger(cm) ? String(cm) : cm.toFixed(1).replace('.', ',');
  return `${testo} cm`;
}
/** "25,4". */
export function etichettaBmi(bmi: number): string {
  return bmi.toFixed(1).replace('.', ',');
}
/** "3 maggio" (data per esteso senza giorno della settimana). */
export function etichettaDataMisura(data: string): string {
  return etichettaGiornoMese(data);
}
/** "3 mag" (legenda e intestazione delle tabelle). */
export function etichettaDataBreve(data: string): string {
  const [giorno, mese] = etichettaGiornoMese(data).split(' ');
  return `${giorno} ${(mese ?? '').slice(0, 3)}`;
}

/** Punti del grafico del peso: x e y normalizzati 0–1 (y = 0 in alto), con un margine verticale se i valori sono tutti uguali. */
export function puntiPeso(pesi: Peso[]): { x: number; y: number }[] {
  if (pesi.length === 0) return [];
  if (pesi.length === 1) return [{ x: 0.5, y: 0.5 }];
  const kg = pesi.map((p) => p.kg);
  const minimo = Math.min(...kg);
  const massimo = Math.max(...kg);
  const ampiezza = massimo - minimo || 1;
  return pesi.map((p, i) => ({ x: i / (pesi.length - 1), y: massimo === minimo ? 0.5 : (massimo - p.kg) / ampiezza }));
}

/** Prima e ultima misurazione per il radar; null se ce n'è una sola (il confronto non ha senso) o nessuna. */
export function confrontoCirconferenze(misurazioni: Circonferenze[]): { prima: Circonferenze; ultima: Circonferenze } | null {
  if (misurazioni.length < 2) return null;
  const ultima = misurazioni[0];
  const prima = misurazioni[misurazioni.length - 1];
  return ultima && prima ? { prima, ultima } : null;
}

/** La scala di ogni asse del radar parte da questa frazione sotto il valore più basso (decisione del 21/10/2026): così il cambiamento si vede. */
export const MARGINE_SCALA_RADAR = 0.1;

/**
 * Raggio relativo (0–1) di ogni asse del radar: scala da (valore più basso tra prima e ultima − 10 %) al valore più
 * alto, uguale per tutti gli assi; il più alto sta sul bordo, il più basso poco dentro; valori uguali → entrambi sul
 * bordo; misura assente → 0.
 */
export function raggiRadar(prima: Circonferenze, ultima: Circonferenze): Record<ChiaveCirconferenza, { prima: number; ultima: number }> {
  const raggi = {} as Record<ChiaveCirconferenza, { prima: number; ultima: number }>;
  for (const c of CIRCONFERENZE) {
    const p = prima.valori[c];
    const u = ultima.valori[c];
    const presenti = [p, u].filter((v): v is number => v !== null && v > 0);
    if (presenti.length === 0) {
      raggi[c] = { prima: 0, ultima: 0 };
      continue;
    }
    const minimo = Math.min(...presenti);
    const massimo = Math.max(...presenti);
    const base = minimo * (1 - MARGINE_SCALA_RADAR);
    const r = (v: number | null) => (v === null || v <= 0 ? 0 : massimo === base ? 1 : Math.min(1, Math.max(0, (v - base) / (massimo - base))));
    raggi[c] = { prima: r(p), ultima: r(u) };
  }
  return raggi;
}
