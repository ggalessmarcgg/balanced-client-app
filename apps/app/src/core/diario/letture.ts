// Letture di daily_submissions per la pagina Oggi: colonne esplicite, filtro per client_id (indice
// idx_daily_submissions_client_date), mai select *. Due letture al massimo: l'intervallo della settimana (colonne
// di stato e valori, senza i testi) e, se esiste, la riga di oggi completa.
import type { CampiDiarioDb } from './modello.ts';

export const TABELLA_DIARIO = 'daily_submissions';

/** Valori di daily_submissions.status (CHECK draft|submitted). */
export type StatoRigaDb = 'draft' | 'submitted';

/** Colonne lette per ogni giorno dell'intervallo (Card settimana oggi, Andamento al lotto 2): niente testi. */
export const SELEZIONE_SETTIMANA = ['id', 'submission_date', 'status', 'energy_level', 'satiety_level', 'hydration_level', 'sport_type', 'sport_duration'].join(',');

export type RigaSettimana = {
  id: string;
  submission_date: string;
  status: string;
  energy_level: number | null;
  satiety_level: number | null;
  hydration_level: number | null;
  sport_type: string | null;
  sport_duration: string | null;
};

/** Colonne della riga di oggi: i campi scritti dal cliente più lo stato (mai le colonne della nutrizionista). */
export const SELEZIONE_OGGI = [
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

export type RigaOggi = CampiDiarioDb & {
  id: string;
  submission_date: string;
  status: string;
  submitted_at: string | null;
  updated_at: string | null;
};

export function statoRiga(status: string): StatoRigaDb {
  return status === 'submitted' ? 'submitted' : 'draft';
}
