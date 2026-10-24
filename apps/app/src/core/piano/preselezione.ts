// Giorno e pasto preselezionati all'apertura del Piano (step 8, lotto 1), sempre in ora italiana.
import { dataOraRoma } from '../stato/orarioRoma.ts';
import type { GiornoPiano } from './composizione.ts';

export type Fascia = 'colazione' | 'pranzo' | 'spuntin' | 'cena';

const DATA = /^(\d{4})-(\d{2})-(\d{2})$/;
/** Confini delle fasce in minuti dalla mezzanotte: il confine appartiene alla fascia che inizia. */
const FINE_COLAZIONE = 10 * 60 + 30;
const FINE_PRANZO = 15 * 60;
const FINE_SPUNTINO = 18 * 60 + 30;

/** Giorno della settimana a Roma: 1 = lunedì … 7 = domenica. */
export function giornoSettimanaRoma(adesso: Date): number {
  const m = DATA.exec(dataOraRoma(adesso).data);
  if (!m) return 1;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return ((d.getUTCDay() + 6) % 7) + 1;
}

/** Fisso: il giorno di oggi se è tra quelli visibili, altrimenti il primo visibile; null senza giorni. */
export function giornoPreselezionato(giorni: GiornoPiano[], adesso: Date): GiornoPiano | null {
  const oggi = giornoSettimanaRoma(adesso);
  return giorni.find((g) => g.indice === oggi) ?? giorni[0] ?? null;
}

/** Fascia oraria da "HH:MM": fino alle 10:30 colazione, 10:30–15:00 pranzo, 15:00–18:30 spuntino, dalle 18:30 cena. */
export function fasciaOraria(oraRoma: string): Fascia {
  const [h, m] = oraRoma.split(':').map(Number);
  const minuti = (h ?? 0) * 60 + (m ?? 0);
  if (minuti < FINE_COLAZIONE) return 'colazione';
  if (minuti < FINE_PRANZO) return 'pranzo';
  if (minuti < FINE_SPUNTINO) return 'spuntin';
  return 'cena';
}

function nomeNormalizzato(nome: string): string {
  return nome.trim().toLowerCase();
}

/**
 * Variabile: il primo pasto il cui nome (senza maiuscole e spazi ai lati) inizia con il nome predefinito della fascia
 * corrente; se nessuno corrisponde, il primo pasto. null senza pasti.
 */
export function pastoPreselezionato<P extends { nome: string }>(pasti: P[], adesso: Date): P | null {
  const fascia = fasciaOraria(dataOraRoma(adesso).ora);
  return pasti.find((p) => nomeNormalizzato(p.nome).startsWith(fascia)) ?? pasti[0] ?? null;
}
