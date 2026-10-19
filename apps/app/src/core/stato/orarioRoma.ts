// Ora italiana senza dipendenze: date e orari degli appuntamenti sono "naive" (date + time) e vanno letti
// in Europe/Rome, come fanno le funzioni del database (AT TIME ZONE 'Europe/Rome'). Regola dell'Unione
// Europea: ora legale dall'ultima domenica di marzo (01:00 UTC) all'ultima domenica di ottobre (01:00 UTC).

const MINUTO_MS = 60_000;
const SCOSTAMENTO_SOLARE = 60;
const SCOSTAMENTO_LEGALE = 120;

function ultimaDomenica(anno: number, mese: number): number {
  const ultimoGiorno = new Date(Date.UTC(anno, mese + 1, 0));
  return ultimoGiorno.getUTCDate() - ultimoGiorno.getUTCDay();
}

function inizioOraLegaleUtc(anno: number): number {
  return Date.UTC(anno, 2, ultimaDomenica(anno, 2), 1, 0, 0);
}

function fineOraLegaleUtc(anno: number): number {
  return Date.UTC(anno, 9, ultimaDomenica(anno, 9), 1, 0, 0);
}

/** Vero se nell'istante UTC dato a Roma vige l'ora legale (CEST, UTC+2). */
export function oraLegaleAttiva(istanteUtcMs: number): boolean {
  const anno = new Date(istanteUtcMs).getUTCFullYear();
  return istanteUtcMs >= inizioOraLegaleUtc(anno) && istanteUtcMs < fineOraLegaleUtc(anno);
}

/** Scostamento di Roma da UTC, in minuti, nell'istante dato. */
export function scostamentoRomaMinuti(istanteUtcMs: number): number {
  return oraLegaleAttiva(istanteUtcMs) ? SCOSTAMENTO_LEGALE : SCOSTAMENTO_SOLARE;
}

const DATA = /^(\d{4})-(\d{2})-(\d{2})$/;
const ORA = /^(\d{2}):(\d{2})(?::(\d{2}))?/;

/**
 * Istante UTC di una data e un'ora espresse in ora italiana (`YYYY-MM-DD`, `HH:MM[:SS]`, i formati di
 * `appointments.appointment_date`/`start_time` e dello slot desiderato del lead). `null` se il formato non è valido.
 */
export function istanteRoma(data: string | null | undefined, ora: string | null | undefined): Date | null {
  const d = data ? DATA.exec(data) : null;
  const o = ora ? ORA.exec(ora) : null;
  if (!d || !o) return null;
  const locale = Date.UTC(Number(d[1]), Number(d[2]) - 1, Number(d[3]), Number(o[1]), Number(o[2]), Number(o[3] ?? '0'));
  if (Number.isNaN(locale)) return null;
  // Prima si prova con l'ora legale: se in quell'istante è in vigore, è la lettura giusta; altrimenti ora solare.
  const conLegale = locale - SCOSTAMENTO_LEGALE * MINUTO_MS;
  if (oraLegaleAttiva(conLegale)) return new Date(conLegale);
  return new Date(locale - SCOSTAMENTO_SOLARE * MINUTO_MS);
}

/** Data e ora italiane (`YYYY-MM-DD`, `HH:MM`) di un istante: l'inverso di istanteRoma, per mostrare orari. */
export function dataOraRoma(istante: Date): { data: string; ora: string } {
  const locale = new Date(istante.getTime() + scostamentoRomaMinuti(istante.getTime()) * MINUTO_MS);
  const due = (n: number) => String(n).padStart(2, '0');
  return {
    data: `${locale.getUTCFullYear()}-${due(locale.getUTCMonth() + 1)}-${due(locale.getUTCDate())}`,
    ora: `${due(locale.getUTCHours())}:${due(locale.getUTCMinutes())}`,
  };
}
