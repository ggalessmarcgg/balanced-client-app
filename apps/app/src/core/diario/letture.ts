// Letture di daily_submissions per la pagina Oggi e il pannello della giornata: colonne esplicite, filtro per client_id
// (indice idx_daily_submissions_client_date), mai select *. All'avvio una lettura per la settimana corrente (colonne
// di stato e valori, più ciò che serve ai pallini del commento, senza i testi del cliente) e, se esiste, la riga di
// oggi completa; al tocco di un giorno condiviso, se non è già in cache, la riga completa di quel giorno.
import type { CampiDiarioDb } from './modello.ts';

export const TABELLA_DIARIO = 'daily_submissions';

/** Valori di daily_submissions.status (CHECK draft|submitted). */
export type StatoRigaDb = 'draft' | 'submitted';

/**
 * Colonne lette per ogni giorno della settimana: niente testi del cliente. Il commento della nutrizionista si legge
 * qui (serve al pallino e al pannello, e non esiste una colonna "ha un commento"); comment_acknowledged per il colore
 * del pallino; comment_author_id per la foto e il nome dell'autore; updated_at per sapere se la giornata in cache è
 * ancora quella del server.
 */
export const SELEZIONE_SETTIMANA = [
  'id',
  'submission_date',
  'status',
  'updated_at',
  'energy_level',
  'satiety_level',
  'hydration_level',
  'sport_type',
  'sport_duration',
  'nutritionist_comment',
  'comment_author_id',
  'comment_acknowledged',
].join(',');

export type RigaSettimana = {
  id: string;
  submission_date: string;
  status: string;
  updated_at: string | null;
  energy_level: number | null;
  satiety_level: number | null;
  hydration_level: number | null;
  sport_type: string | null;
  sport_duration: string | null;
  nutritionist_comment: string | null;
  comment_author_id: string | null;
  comment_acknowledged: boolean | null;
};

/** Colonne della riga completa di un giorno (oggi o una giornata aperta nel pannello): i campi scritti dal cliente più lo stato. */
export const SELEZIONE_GIORNATA = [
  'id',
  'submission_date',
  'status',
  'submitted_at',
  'updated_at',
  'breakfast',
  'lunch',
  'dinner',
  'snacks',
  'day_comment',
  'energy_level',
  'satiety_level',
  'hydration_level',
  'sport_type',
  'sport_duration',
].join(',');
/** Nome del lotto 1, mantenuto per la riga di oggi. */
export const SELEZIONE_OGGI = SELEZIONE_GIORNATA;

export type RigaGiornata = CampiDiarioDb & {
  id: string;
  submission_date: string;
  status: string;
  submitted_at: string | null;
  updated_at: string | null;
};
export type RigaOggi = RigaGiornata;

export function statoRiga(status: string): StatoRigaDb {
  return status === 'submitted' ? 'submitted' : 'draft';
}

/** Profilo dell'autore di un commento: nutritionist_profiles per id = comment_author_id (mai profile_image_url: è in base64). */
export const TABELLA_AUTORI = 'nutritionist_profiles';
export const SELEZIONE_AUTORE = ['id', 'full_name', 'title', 'app_square_photo_url'].join(',');
export type RigaAutore = { id: string; full_name: string | null; title: string | null; app_square_photo_url: string | null };
