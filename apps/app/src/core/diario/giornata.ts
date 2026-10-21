// Giornata condivisa aperta nel pannello (step 5, lotto 2): riassunto per "La tua giornata" e modifica con gli
// stessi blocchi, formati e regole di salvataggio della bozza di oggi (salvataggi mirati dei soli campi del cliente,
// copia locale, uscita in secondo piano), ma su quella riga e senza mai toccare status, submitted_at,
// submission_date, submission_number né le colonne della nutrizionista: la giornata resta condivisa e la
// nutrizionista non riceve avvisi. Nessuna creazione di diari per giorni passati senza riga.
import type { RigaGiornata, RigaSettimana } from './letture.ts';
import {
  campiDaSalvare,
  diarioDaCampi,
  durataSportValida,
  ETICHETTE_DURATA,
  ETICHETTE_ENERGIA,
  ETICHETTE_IDRATAZIONE,
  ETICHETTE_PASTI,
  ETICHETTE_SPORT,
  PASTI,
  stessiCampi,
  tipoSportValido,
  type CampiDiarioDb,
  type Diario,
} from './modello.ts';

/** Copia locale di una giornata condivisa (persistita sul telefono con la settimana). */
export type GiornataLocale = {
  id: string;
  data: string;
  diario: Diario;
  /** Campi come li conosce il server (per non riscrivere una giornata invariata). */
  salvato: CampiDiarioDb;
  /** updated_at della riga sul server all'ultima lettura o modifica: se la settimana riletta ne porta uno diverso, la giornata si rilegge. */
  updatedAt: string | null;
  inAttesa: boolean;
  errore: 'rete' | 'altro' | null;
  modificatoAlle: string | null;
};

/** Modifica di una giornata condivisa: solo i campi del contenuto, filtrata su status = submitted. */
export type ModificaGiornata = { id: string; campi: CampiDiarioDb };
export type OperazioneGiornata = { tipo: 'nessuna' } | { tipo: 'modifica'; modifica: ModificaGiornata };

/**
 * Colonne che la modifica di una giornata non deve mai scrivere (la policy "edit meal content on submitted entries"
 * non le vieta: la protezione è solo nel codice). Usate dai test per verificare i campi di ogni scrittura.
 */
export const COLONNE_VIETATE_GIORNATA = [
  'id',
  'client_id',
  'user_id',
  'submission_date',
  'status',
  'submitted_at',
  'submission_number',
  'review_id',
  'reviewed_by_nutritionist',
  'review_status',
  'reviewed_at',
  'nutritionist_comment',
  'comment_author_id',
  'comment_updated_at',
  'comment_acknowledged',
  'archived',
  'created_at',
  'updated_at',
  'meal_recap',
] as const;

export function giornataDaRiga(riga: RigaGiornata): GiornataLocale {
  const diario = diarioDaCampi(riga);
  return { id: riga.id, data: riga.submission_date, diario, salvato: campiDaSalvare(diario), updatedAt: riga.updated_at, inAttesa: false, errore: null, modificatoAlle: null };
}

/** Nuovo contenuto locale: in attesa se i campi da salvare differiscono da quelli sul server. Chi la chiama la persiste subito. */
export function aggiornaGiornata(giornata: GiornataLocale, diario: Diario, adesso: string = new Date().toISOString()): GiornataLocale {
  const inAttesa = !stessiCampi(campiDaSalvare(diario), giornata.salvato);
  return { ...giornata, diario, inAttesa: inAttesa || giornata.inAttesa, modificatoAlle: adesso };
}

/** Quale scrittura serve adesso: nessuna se i campi sono quelli già sul server, altrimenti la modifica dei soli campi. */
export function pianificaModifica(giornata: GiornataLocale): OperazioneGiornata {
  const campi = campiDaSalvare(giornata.diario);
  if (stessiCampi(campi, giornata.salvato)) return { tipo: 'nessuna' };
  return { tipo: 'modifica', modifica: { id: giornata.id, campi } };
}

export function dopoModifica(giornata: GiornataLocale, campi: CampiDiarioDb, updatedAt: string | null): GiornataLocale {
  const inAttesa = !stessiCampi(campiDaSalvare(giornata.diario), campi);
  return { ...giornata, salvato: campi, updatedAt: updatedAt ?? giornata.updatedAt, inAttesa, errore: null };
}

export function dopoErroreModifica(giornata: GiornataLocale, errore: 'rete' | 'altro'): GiornataLocale {
  return { ...giornata, inAttesa: true, errore };
}

/**
 * All'apertura del pannello: la giornata in cache vale se esiste, è della stessa riga e il server non è cambiato nel
 * frattempo (updated_at della settimana uguale); una copia con modifiche in attesa vale sempre (si salva lei).
 */
export function giornataDaRileggere(giornata: GiornataLocale | undefined, riga: Pick<RigaSettimana, 'id' | 'updated_at'>): boolean {
  if (!giornata || giornata.id !== riga.id) return true;
  if (giornata.inAttesa) return false;
  return (giornata.updatedAt ?? null) !== (riga.updated_at ?? null);
}

/** Riassunto per "La tua giornata" (Figma 475:1337): una voce per pasto compilato, i valori come etichette, lo sport, la nota. */
export type SezioneRiassunto = { titolo: string; tipo: 'testo'; testo: string } | { titolo: string; tipo: 'valori'; valori: string[] };

export const TITOLI_RIASSUNTO = { valori: 'Valori', sport: 'Sport', commento: 'Commento personale' } as const;

/**
 * "Camminata · meno di 30 min": tipo e durata della giornata con le etichette del diario (iniziale minuscola dopo il
 * punto); la durata storica "<20m" diventa "meno di 20 min"; una durata non riconosciuta resta tale quale.
 */
export function etichettaSport(tipo: string | null, durata: string | null): string | null {
  if (!tipoSportValido(tipo)) return null;
  const nome = ETICHETTE_SPORT[tipo];
  if (!durata) return nome;
  const etichetta = durataSportValida(durata) ? ETICHETTE_DURATA[durata] : durata;
  return `${nome} · ${etichetta.charAt(0).toLowerCase()}${etichetta.slice(1)}`;
}

export function riassuntoGiornata(diario: Diario): SezioneRiassunto[] {
  const campi = campiDaSalvare(diario);
  const sezioni: SezioneRiassunto[] = [];
  for (const pasto of PASTI) {
    const testo = campi[pasto];
    if (testo) sezioni.push({ titolo: ETICHETTE_PASTI[pasto], tipo: 'testo', testo });
  }
  const valori: string[] = [];
  if (diario.energy_level !== null) valori.push(`Energia ${ETICHETTE_ENERGIA[diario.energy_level].toLowerCase()}`);
  if (campi.satiety_level !== null) valori.push(`Sazietà ${campi.satiety_level}`);
  if (diario.hydration_level !== null) valori.push(`Acqua ${ETICHETTE_IDRATAZIONE[diario.hydration_level]}`);
  if (valori.length > 0) sezioni.push({ titolo: TITOLI_RIASSUNTO.valori, tipo: 'valori', valori });
  const sport = etichettaSport(campi.sport_type, campi.sport_duration);
  if (sport) sezioni.push({ titolo: TITOLI_RIASSUNTO.sport, tipo: 'testo', testo: sport });
  if (campi.day_comment) sezioni.push({ titolo: TITOLI_RIASSUNTO.commento, tipo: 'testo', testo: campi.day_comment });
  return sezioni;
}
