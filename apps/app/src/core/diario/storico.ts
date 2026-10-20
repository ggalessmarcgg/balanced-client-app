// Storico delle giornate (Figma 475:1917, componenti Mese storico 477:1875 e Giorno calendario 474:1326): i mesi dal
// primo diario del cliente al mese corrente, ogni mese a righe di settimana lunedì–domenica con i giorni allineati a
// sinistra (nessuna intestazione dei giorni, nessuna cella vuota), stati come nella Card settimana ma senza commenti.
// Date sempre in ora italiana, nel formato YYYY-MM-DD di submission_date.
import { aggiungiGiorni, confrontaDate, lunediDellaSettimana } from './data.ts';
import { statoRiga } from './letture.ts';
import { valutazioneDi, type Valutazione } from './valutazione.ts';

/** Colonne lette per lo storico: data, stato e valutazione della nutrizionista. */
export const SELEZIONE_STORICO = ['submission_date', 'status', 'review_status'].join(',');
export type RigaStorico = { submission_date: string; status: string; review_status: string | null };

/** Mese nel formato YYYY-MM. */
export type Mese = string;

const MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'] as const;

export function meseDi(data: string): Mese {
  return data.slice(0, 7);
}

function parti(mese: Mese): { anno: number; mese: number } {
  return { anno: Number(mese.slice(0, 4)), mese: Number(mese.slice(5, 7)) };
}

function giorniNelMese(mese: Mese): number {
  const { anno, mese: m } = parti(mese);
  return new Date(Date.UTC(anno, m, 0)).getUTCDate();
}

function dataDelGiorno(mese: Mese, giorno: number): string {
  return `${mese}-${String(giorno).padStart(2, '0')}`;
}

export function meseSuccessivo(mese: Mese): Mese {
  const { anno, mese: m } = parti(mese);
  return m === 12 ? `${anno + 1}-01` : `${anno}-${String(m + 1).padStart(2, '0')}`;
}

/** Primo e ultimo giorno del mese. */
export function intervalloMese(mese: Mese): { da: string; a: string } {
  return { da: dataDelGiorno(mese, 1), a: dataDelGiorno(mese, giorniNelMese(mese)) };
}

/**
 * I mesi dello storico, dal mese corrente all'indietro fino al mese del primo diario. Senza diari (primoDiario null)
 * solo il mese corrente; un primo diario nel futuro o nel mese corrente dà ugualmente il solo mese corrente.
 */
export function mesiStorico(primoDiario: string | null, oggi: string): Mese[] {
  const corrente = meseDi(oggi);
  const primo = primoDiario && primoDiario < oggi ? meseDi(primoDiario) : corrente;
  const mesi: Mese[] = [];
  for (let m = primo; m <= corrente; m = meseSuccessivo(m)) mesi.unshift(m);
  return mesi;
}

/**
 * Per il mese corrente: la parte del mese che precede la settimana corrente (già in cache dalla pagina Oggi), da
 * leggere a parte; null se la settimana corrente comincia nel mese o prima (nulla da leggere).
 */
export function intervalloMeseFuoriSettimana(mese: Mese, oggi: string): { da: string; a: string } | null {
  const { da } = intervalloMese(mese);
  const lunedi = lunediDellaSettimana(oggi);
  if (confrontaDate(lunedi, da) <= 0) return null;
  return { da, a: aggiungiGiorni(lunedi, -1) };
}

/** Le righe del mese: una per settimana lunedì–domenica, con i soli giorni del mese (la prima e l'ultima possono essere corte). */
export function settimaneDelMese(mese: Mese): string[][] {
  const righe: string[][] = [];
  let riga: string[] = [];
  const n = giorniNelMese(mese);
  for (let g = 1; g <= n; g++) {
    const data = dataDelGiorno(mese, g);
    if (riga.length > 0 && lunediDellaSettimana(data) === data) {
      righe.push(riga);
      riga = [];
    }
    riga.push(data);
  }
  if (riga.length > 0) righe.push(riga);
  return righe;
}

export type StatoGiornoCalendario = 'condiviso' | 'nonCondiviso' | 'oggi' | 'futuro';
export type GiornoCalendario = {
  data: string;
  numero: number;
  stato: StatoGiornoCalendario;
  /** Riga condivisa: si può aprire il pannello (anche oggi). */
  condiviso: boolean;
  /** Valutazione della nutrizionista, solo per i giorni condivisi (Giorno calendario 710:7507 da rivedere, 710:7509 in attesa). */
  valutazione: Valutazione | null;
};
export type MeseCalendario = { settimane: GiornoCalendario[][]; condivise: number };

/**
 * Giorni del mese con lo stato: condiviso (riga submitted, con la valutazione), oggi, futuro, altrimenti non
 * condiviso (una bozza non conta). Oggi resta "oggi" anche se condiviso.
 */
export function giorniMese(mese: Mese, righe: RigaStorico[], oggi: string): MeseCalendario {
  const condivise = new Map(righe.filter((r) => statoRiga(r.status) === 'submitted' && meseDi(r.submission_date) === mese).map((r) => [r.submission_date, r] as const));
  const settimane = settimaneDelMese(mese).map((settimana) =>
    settimana.map((data) => {
      const c = confrontaDate(data, oggi);
      const riga = condivise.get(data);
      const stato: StatoGiornoCalendario = c === 0 ? 'oggi' : c > 0 ? 'futuro' : riga ? 'condiviso' : 'nonCondiviso';
      return { data, numero: Number(data.slice(8, 10)), stato, condiviso: riga !== undefined, valutazione: riga ? valutazioneDi(riga.review_status) : null };
    }),
  );
  return { settimane, condivise: condivise.size };
}

/** "Ottobre 2026" */
export function etichettaMese(mese: Mese): string {
  const { anno, mese: m } = parti(mese);
  return `${MESI[m - 1] ?? ''} ${anno}`;
}

/** "6 giornate condivise", "1 giornata condivisa", "Nessuna giornata condivisa". */
export function etichettaCondivise(n: number): string {
  if (n === 0) return 'Nessuna giornata condivisa';
  if (n === 1) return '1 giornata condivisa';
  return `${n} giornate condivise`;
}
