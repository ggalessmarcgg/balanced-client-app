// Andamento della settimana in corso (step 5, lotto 4; Figma Card andamento 479:334, schermate 479:1908 e 479:2100):
// tre grafici a colonne, Energia, Idratazione e Sport, da lunedì a domenica in ora italiana, a quattro gradini
// (30/60/90/120). Nessuna lettura nuova: i valori vengono dalla lettura della settimana già in memoria e, per oggi,
// dalla bozza in corso (anche non ancora salvata). Nessuna frase di sintesi, nessun periodo diverso dalla settimana.
import { confrontaDate, giorniDellaSettimana, INIZIALI_SETTIMANA } from './data.ts';
import { statoRiga } from './letture.ts';
import { DURATA_STORICA, tipoSportValido, type Diario, type DurataSport } from './modello.ts';

export const CATEGORIE_ANDAMENTO = ['energia', 'idratazione', 'sport'] as const;
export type CategoriaAndamento = (typeof CATEGORIE_ANDAMENTO)[number];

/** Gradini del grafico: 1 (il più basso, 30) … 4 (il più alto, 120). */
export const GRADINI = 4;
export type Gradino = 1 | 2 | 3 | 4;

/** Etichette dell'asse, dal gradino più alto al più basso (come sono disposte a sinistra del grafico). */
export const ETICHETTE_ASSE: Record<CategoriaAndamento, readonly [string, string, string, string]> = {
  energia: ['4', '3', '2', '1'],
  idratazione: ['+2,5L', '2L', '1,5L', '<1L'],
  sport: ['>1,5h', '1–1,5h', "30'–1h", "<30'"],
};

export const TITOLI_ANDAMENTO: Record<CategoriaAndamento, string> = { energia: 'Energia', idratazione: 'Idratazione', sport: 'Sport' };

/**
 * Stato di una colonna:
 * - valore: giorno condiviso con un valore (colonna piena alta quanto il gradino);
 * - daCondividere: oggi, non ancora condiviso, con un valore nella bozza (colonna tratteggiata alta quanto il gradino);
 * - riposo: giorno condiviso senza sport ("Oggi riposo": tipo e durata null; trattino pieno) — solo nel grafico Sport;
 * - riposoDaCondividere: oggi, non ancora condiviso, con "Oggi riposo" nella bozza (trattino tratteggiato nel colore della categoria);
 * - nonCondiviso: giorno passato senza una riga condivisa (trattino tratteggiato grigio; una bozza non conta);
 * - vuoto: giorno futuro, oggi senza valore, oppure giorno condiviso senza un valore per la categoria
 *   (anche una durata dello sport non riconosciuta).
 */
export type StatoColonna =
  | { tipo: 'valore'; gradino: Gradino }
  | { tipo: 'daCondividere'; gradino: Gradino }
  | { tipo: 'riposo' }
  | { tipo: 'riposoDaCondividere' }
  | { tipo: 'nonCondiviso' }
  | { tipo: 'vuoto' };

export type GiornoAndamento = { data: string; iniziale: string; futuro: boolean; colonna: StatoColonna };

export type AndamentoSettimana = {
  /** I sette giorni, da lunedì a domenica, per ogni categoria. */
  categorie: Record<CategoriaAndamento, GiornoAndamento[]>;
  /** Vero se nella settimana c'è almeno un valore (anche solo nella bozza di oggi): compaiono i tre grafici; altrimenti "Pochi dati". */
  conValori: boolean;
  /** Durate dello sport lette dal database e non riconosciute (nessuna colonna): da annotare, mai da tradurre. */
  durateNonRiconosciute: string[];
};

/** Colonne della settimana che servono all'andamento (sottoinsieme di RigaSettimana). */
export type RigaPerAndamento = {
  submission_date: string;
  status: string;
  energy_level: number | null;
  hydration_level: number | null;
  sport_type: string | null;
  sport_duration: string | null;
};

/** Oggi: la bozza in corso (o il diario condiviso) e se la giornata è già condivisa. */
export type OggiPerAndamento = { diario: Diario; condiviso: boolean };

/** Gradini dello sport: "<20m" (storico) e "<30m" stanno entrambi sul primo (chi ha fatto meno di 20 minuti ha fatto anche meno di 30). */
const GRADINO_DURATA: Record<DurataSport | typeof DURATA_STORICA, Gradino> = { [DURATA_STORICA]: 1, '<30m': 1, '30m-1h': 2, '1h-1.5h': 3, '>1.5h': 4 };

export function gradinoLivello(livello: number | null | undefined): Gradino | null {
  return livello === 1 || livello === 2 || livello === 3 || livello === 4 ? livello : null;
}

export function gradinoDurata(durata: string | null | undefined): Gradino | null {
  if (!durata) return null;
  return (GRADINO_DURATA as Record<string, Gradino | undefined>)[durata] ?? null;
}

/** Valori di un giorno nei tre grafici: null = nessun valore; per lo sport anche "riposo" (tipo null) e la durata grezza se non riconosciuta. */
type ValoriGiorno = { energia: Gradino | null; idratazione: Gradino | null; sport: Gradino | 'riposo' | null; durataNonRiconosciuta: string | null };

function valoriDaRiga(r: Pick<RigaPerAndamento, 'energy_level' | 'hydration_level' | 'sport_type' | 'sport_duration'>): ValoriGiorno {
  const base = { energia: gradinoLivello(r.energy_level), idratazione: gradinoLivello(r.hydration_level) };
  // Il CRM nasconde la durata se il tipo è nullo: senza tipo il giorno è "riposo", qualunque cosa ci sia nella durata.
  if (!tipoSportValido(r.sport_type)) return { ...base, sport: 'riposo', durataNonRiconosciuta: null };
  const gradino = gradinoDurata(r.sport_duration);
  if (gradino === null) return { ...base, sport: null, durataNonRiconosciuta: r.sport_duration };
  return { ...base, sport: gradino, durataNonRiconosciuta: null };
}

function valoriDaDiario(d: Diario): ValoriGiorno {
  const base = { energia: gradinoLivello(d.energy_level), idratazione: gradinoLivello(d.hydration_level), durataNonRiconosciuta: null };
  if (d.riposo) return { ...base, sport: 'riposo' };
  if (!tipoSportValido(d.sport_type)) return { ...base, sport: null };
  return { ...base, sport: gradinoDurata(d.sport_duration) };
}

function colonna(valore: Gradino | 'riposo' | null, condiviso: boolean): StatoColonna {
  if (valore === null) return { tipo: 'vuoto' };
  if (valore === 'riposo') return condiviso ? { tipo: 'riposo' } : { tipo: 'riposoDaCondividere' };
  return condiviso ? { tipo: 'valore', gradino: valore } : { tipo: 'daCondividere', gradino: valore };
}

/**
 * Andamento della settimana che contiene `oggi` (lunedì–domenica, ora italiana: il grafico cambia settimana il lunedì).
 * Giorni passati: la riga condivisa (una bozza non conta) → valore, riposo o vuoto; senza riga → non condiviso.
 * Oggi: se condiviso, la riga della settimana (aggiornata dalle modifiche del pannello) o, in sua assenza, il diario;
 * se non condiviso, la bozza in corso → colonna o trattino tratteggiati. Giorni futuri: vuoti.
 */
export function andamentoSettimana(oggi: string, righe: RigaPerAndamento[], oggiDiario: OggiPerAndamento | null): AndamentoSettimana {
  const condivise = new Map(righe.filter((r) => statoRiga(r.status) === 'submitted').map((r) => [r.submission_date, r] as const));
  const durateNonRiconosciute = new Set<string>();
  const categorie: Record<CategoriaAndamento, GiornoAndamento[]> = { energia: [], idratazione: [], sport: [] };
  let conValori = false;

  giorniDellaSettimana(oggi).forEach((data, i) => {
    const iniziale = INIZIALI_SETTIMANA[i] ?? '';
    const c = confrontaDate(data, oggi);
    const futuro = c > 0;
    let colonne: Record<CategoriaAndamento, StatoColonna>;
    if (futuro) {
      colonne = { energia: { tipo: 'vuoto' }, idratazione: { tipo: 'vuoto' }, sport: { tipo: 'vuoto' } };
    } else {
      const riga = condivise.get(data);
      let valori: ValoriGiorno | null = null;
      let condiviso = riga !== undefined;
      if (c === 0 && oggiDiario) {
        condiviso = oggiDiario.condiviso || riga !== undefined;
        valori = condiviso && riga ? valoriDaRiga(riga) : valoriDaDiario(oggiDiario.diario);
      } else if (riga) {
        valori = valoriDaRiga(riga);
      }
      if (valori === null) {
        const vuoto: StatoColonna = c === 0 ? { tipo: 'vuoto' } : { tipo: 'nonCondiviso' };
        colonne = { energia: vuoto, idratazione: vuoto, sport: vuoto };
      } else {
        if (valori.durataNonRiconosciuta) durateNonRiconosciute.add(valori.durataNonRiconosciuta);
        colonne = { energia: colonna(valori.energia, condiviso), idratazione: colonna(valori.idratazione, condiviso), sport: colonna(valori.sport, condiviso) };
        if (valori.energia !== null || valori.idratazione !== null || (valori.sport !== null && valori.sport !== 'riposo')) conValori = true;
      }
    }
    for (const categoria of CATEGORIE_ANDAMENTO) categorie[categoria].push({ data, iniziale, futuro, colonna: colonne[categoria] });
  });

  return { categorie, conValori, durateNonRiconosciute: [...durateNonRiconosciute] };
}
