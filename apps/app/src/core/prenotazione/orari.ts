// Orari disponibili per la consulenza e selettore di giorno e ora (step 12). Logica estratta da
// ~/Desktop/onboarding-v2/src/ui/pages/SlotPage.tsx (funnel): raggruppamento per data con ore in ordine, due
// schede da 5 giorni feriali, una sola ripetizione dopo 300 ms su errore di lettura, azzeramento della scelta se
// l'orario sparisce dall'elenco, selezione singola che vale attraverso le schede (secondo tocco = deseleziona),
// guardia del doppio tocco in conferma. Differenza voluta rispetto al funnel: i giorni non si generano da `new Date()`
// (fuso del telefono) ma dalle date restituite dalla funzione del database, che lavora in UTC (censimento step 12,
// §3 e §4): la griglia parte dalla prima data dell'elenco e copre 10 giorni feriali.
import { aggiungiGiorni, dataValida } from '../diario/data.ts';

/** Una riga di get_nutritionist_available_slots_v2: data `YYYY-MM-DD`, ora `HH:MM` (ore intere), senza fuso. */
export type OrarioDisponibile = { date: string; time: string };

/** Giorno della griglia: chiave `YYYY-MM-DD`, abbreviazione (lun…ven) e `gg.mm`. */
export type GiornoGriglia = { data: string; giorno: string; etichetta: string };

export type StatoOrari = { tipo: 'caricamento' } | { tipo: 'errore' } | { tipo: 'pronto'; orari: OrarioDisponibile[] };

/** Giorni feriali per scheda e numero di schede ("Prossimi giorni", "Settimana successiva"), come nel funnel. */
export const GIORNI_PER_SCHEDA = 5;
export const SCHEDE = 2;
export const ETICHETTE_SCHEDE = ['Prossimi giorni', 'Settimana successiva'] as const;
/** Una sola ripetizione silenziosa dopo 300 ms su un errore di lettura (SlotPage.tsx, RETRY_DELAY_MS). */
export const RITARDO_RIPETIZIONE_MS = 300;
/** Testo fisso della nota sotto la griglia (il limite è quello della funzione: p_days_ahead = 14). */
export const GIORNI_DI_ANTICIPO = 14;

const ABBREVIAZIONI = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'] as const;
const DATA = /^(\d{4})-(\d{2})-(\d{2})$/;
const ORA = /^\d{2}:\d{2}$/;

function giornoDellaSettimana(data: string): number {
  const m = DATA.exec(data);
  if (!m) return -1;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))).getUTCDay();
}

function feriale(data: string): boolean {
  const g = giornoDellaSettimana(data);
  return g >= 1 && g <= 5;
}

/** Vero per le righe nel formato atteso dalla funzione: le altre si scartano senza bloccare l'elenco. */
export function orarioValido(riga: unknown): riga is OrarioDisponibile {
  if (typeof riga !== 'object' || riga === null) return false;
  const { date, time } = riga as Partial<OrarioDisponibile>;
  return typeof date === 'string' && dataValida(date) && typeof time === 'string' && ORA.test(time);
}

/** Normalizza la risposta della funzione: solo righe valide, senza doppioni, in ordine di giorno e ora. */
export function normalizzaOrari(risposta: unknown): OrarioDisponibile[] {
  if (!Array.isArray(risposta)) return [];
  const visti = new Set<string>();
  const orari: OrarioDisponibile[] = [];
  for (const riga of risposta) {
    if (!orarioValido(riga)) continue;
    const chiave = `${riga.date} ${riga.time}`;
    if (visti.has(chiave)) continue;
    visti.add(chiave);
    orari.push({ date: riga.date, time: riga.time });
  }
  return orari.sort((a, b) => (a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date)));
}

/** `Map<data, ore ordinate>` (SlotPage.tsx, slotsByDate). */
export function raggruppaPerData(orari: OrarioDisponibile[]): Map<string, string[]> {
  const perData = new Map<string, string[]>();
  for (const o of orari) {
    const ore = perData.get(o.date) ?? [];
    ore.push(o.time);
    perData.set(o.date, ore);
  }
  for (const ore of perData.values()) ore.sort();
  return perData;
}

/** "lun" e "20.07" per la testata di una colonna. */
export function giornoGriglia(data: string): GiornoGriglia {
  const m = DATA.exec(data);
  const giorno = ABBREVIAZIONI[giornoDellaSettimana(data)] ?? '';
  return { data, giorno, etichetta: m ? `${m[3]}.${m[2]}` : data };
}

/**
 * I 10 giorni feriali della griglia a partire dalla prima data dell'elenco (nessun calcolo con il fuso del
 * telefono). La funzione copre 14 giorni di calendario dalla data corrente del server, cioè al massimo 10 feriali,
 * quindi ogni data dell'elenco cade nella griglia; se non ci fosse (dato inatteso) la griglia si allunga fino a
 * includerla. Elenco vuoto → nessun giorno (variante "Nessun orario").
 */
export function giorniDagliOrari(orari: OrarioDisponibile[]): GiornoGriglia[] {
  if (orari.length === 0) return [];
  const date = orari.map((o) => o.date).sort();
  const prima = date[0] ?? '';
  const ultima = date[date.length - 1] ?? prima;
  const giorni: GiornoGriglia[] = [];
  let corrente = prima;
  // Se la prima data cade nel weekend (impossibile per la funzione, che li salta) si parte dal lunedì seguente.
  while (!feriale(corrente)) corrente = aggiungiGiorni(corrente, 1);
  const minimo = GIORNI_PER_SCHEDA * SCHEDE;
  while (giorni.length < minimo || corrente <= ultima) {
    if (feriale(corrente)) giorni.push(giornoGriglia(corrente));
    corrente = aggiungiGiorni(corrente, 1);
  }
  return giorni;
}

/** I giorni di una scheda (0 = primi 5, 1 = successivi 5); una scheda oltre la griglia è vuota. */
export function giorniDellaScheda(giorni: GiornoGriglia[], scheda: number): GiornoGriglia[] {
  return giorni.slice(scheda * GIORNI_PER_SCHEDA, scheda * GIORNI_PER_SCHEDA + GIORNI_PER_SCHEDA);
}

export function stessoOrario(a: OrarioDisponibile | null, b: OrarioDisponibile | null): boolean {
  return a !== null && b !== null && a.date === b.date && a.time === b.time;
}

/** Selezione singola: toccare l'orario scelto lo deseleziona, toccarne un altro lo sostituisce (anche in un'altra scheda). */
export function alternaScelta(scelta: OrarioDisponibile | null, orario: OrarioDisponibile): OrarioDisponibile | null {
  return stessoOrario(scelta, orario) ? null : orario;
}

/** Dopo una rilettura degli orari: la scelta resta solo se è ancora nell'elenco (SlotPage.tsx, load). */
export function sceltaAncoraValida(scelta: OrarioDisponibile | null, orari: OrarioDisponibile[]): OrarioDisponibile | null {
  if (!scelta) return null;
  return orari.some((o) => stessoOrario(o, scelta)) ? scelta : null;
}

/** Nota sotto la griglia (Figma 555:422): "Nota:" in grassetto, poi il testo. */
export const NOTA_ANTICIPO = { etichetta: 'Nota:', testo: ` non è possibile riservare con più di ${GIORNI_DI_ANTICIPO} giorni d'anticipo` } as const;

/**
 * Lettura con una sola ripetizione silenziosa dopo RITARDO_RIPETIZIONE_MS (come il funnel). `attendi` è iniettato
 * per i test; `leggi` lancia o rifiuta in caso di errore.
 */
export async function conUnaRipetizione<T>(leggi: () => Promise<T>, attendi: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms))): Promise<T> {
  try {
    return await leggi();
  } catch {
    await attendi(RITARDO_RIPETIZIONE_MS);
    return leggi();
  }
}
