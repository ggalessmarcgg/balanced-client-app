// Diario di oggi: letture mirate su daily_submissions, copia locale nel portachiavi finché il server non conferma,
// salvataggio della bozza senza status e condivisione in una sola modifica (logica pura in src/core/diario).
// client_id viene dallo stato letto una volta per sessione (statoCliente.ts); user_id dalla sessione locale.
import { classificaErrore } from '@/core/accesso/errori';
import {
  copiaValida,
  diarioLocaleIniziale,
  dopoCondivisione,
  dopoErrore,
  dopoSalvataggio,
  pianificaCondivisione,
  pianificaSalvataggio,
  rigaGiaCondivisa,
  type DiarioLocale,
  type StatoRiga,
} from '@/core/diario/bozza';
import { dataOggiRoma, intervalloLetture } from '@/core/diario/data';
import { SELEZIONE_OGGI, SELEZIONE_SETTIMANA, statoRiga, TABELLA_DIARIO, type RigaOggi, type RigaSettimana } from '@/core/diario/letture';
import { campiDaSalvare, DIARIO_VUOTO, diarioDaCampi } from '@/core/diario/modello';
import { leggi, rimuovi, scrivi } from '@/servizi/archivio';
import { supabase } from '@/servizi/supabase';

export type DatiOggi = { locale: DiarioLocale; settimana: RigaSettimana[] };
export type EsitoLetturaDiario = { tipo: 'ok'; dati: DatiOggi; daCache: boolean } | { tipo: 'nonAutenticato' } | { tipo: 'rete' } | { tipo: 'errore'; messaggio: string };
export type EsitoScrittura = { tipo: 'ok' } | { tipo: 'giaCondiviso' } | { tipo: 'errore'; errore: 'rete' | 'altro' };

type Cache = DatiOggi & { letto: string };
const PREFISSO_CACHE = 'balanced.diario';
/** Chiave con cliente e data italiana: a mezzanotte si passa al giorno nuovo. */
function chiaveCache(clientId: string, data: string): string {
  return `${PREFISSO_CACHE}.${clientId}.${data}`;
}

async function cacheDi(clientId: string, data: string): Promise<DatiOggi | null> {
  try {
    const testo = await leggi(chiaveCache(clientId, data));
    if (!testo) return null;
    const cache = JSON.parse(testo) as Cache;
    return copiaValida(cache.locale, clientId, data) ? { locale: cache.locale, settimana: cache.settimana ?? [] } : null;
  } catch {
    return null;
  }
}

/** Salva la copia locale (diario di oggi + settimana). Non blocca: gli errori del portachiavi si ignorano. */
export function salvaCache(dati: DatiOggi): void {
  const cache: Cache = { ...dati, letto: new Date().toISOString() };
  scrivi(chiaveCache(dati.locale.clientId, dati.locale.data), JSON.stringify(cache)).catch(() => {});
}

export async function svuotaCacheDiario(clientId: string, data: string): Promise<void> {
  await rimuovi(chiaveCache(clientId, data));
}

function erroreDiRete(error: { code?: string | null; message?: string | null; name?: string | null; status?: number | null }): boolean {
  return classificaErrore(error) === 'rete' || error.code === '' || /network|fetch|offline/i.test(error.message ?? '');
}

function tipoErroreScrittura(error: unknown): 'rete' | 'altro' {
  const e = (typeof error === 'object' && error !== null ? error : {}) as { code?: string | null; message?: string | null; name?: string | null };
  return erroreDiRete(e) ? 'rete' : 'altro';
}

async function userIdSessione(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

function rigaDaOggi(riga: RigaOggi): StatoRiga {
  if (statoRiga(riga.status) === 'submitted') return { tipo: 'condiviso', id: riga.id, condivisoAlle: riga.submitted_at };
  return { tipo: 'bozza', id: riga.id, salvato: campiDaSalvare(diarioDaCampi(riga)) };
}

/** Lettura 2 (solo se la riga di oggi esiste): la riga completa per id, colonne esplicite. */
async function leggiRigaOggi(id: string): Promise<RigaOggi | null> {
  const { data, error } = await supabase.from(TABELLA_DIARIO).select(SELEZIONE_OGGI).eq('id', id).maybeSingle<RigaOggi>();
  if (error) throw error;
  return data;
}

/**
 * Lettura della pagina Oggi: una query per l'intervallo (settimana corrente + ultimi 7 giorni, per client_id, senza
 * testi) e, se oggi ha già una riga, una seconda per la riga completa. Il contenuto locale in attesa vince sul
 * server (è la copia più recente); lo stato della riga (bozza/condivisa) viene sempre dal server.
 * Senza rete si usa la copia locale se c'è.
 */
export async function leggiDiarioOggi(clientId: string, adesso: Date = new Date()): Promise<EsitoLetturaDiario> {
  const data = dataOggiRoma(adesso);
  const userId = await userIdSessione();
  if (!userId) return { tipo: 'nonAutenticato' };

  const cache = await cacheDi(clientId, data);
  const { da, a } = intervalloLetture(data);
  const lettura = await supabase
    .from(TABELLA_DIARIO)
    .select(SELEZIONE_SETTIMANA)
    .eq('client_id', clientId)
    .gte('submission_date', da)
    .lte('submission_date', a)
    .order('submission_date', { ascending: true })
    .returns<RigaSettimana[]>();
  if (lettura.error) {
    if (erroreDiRete(lettura.error)) return cache ? { tipo: 'ok', dati: cache, daCache: true } : { tipo: 'rete' };
    return { tipo: 'errore', messaggio: lettura.error.message };
  }
  const settimana = lettura.data ?? [];
  const oggiInElenco = settimana.find((r) => r.submission_date === data);

  let locale: DiarioLocale;
  try {
    const rigaOggi = oggiInElenco ? await leggiRigaOggi(oggiInElenco.id) : null;
    const inAttesa = cache?.locale.inAttesa ? cache.locale : null;
    if (!rigaOggi) {
      locale = inAttesa ?? diarioLocaleIniziale(clientId, data, DIARIO_VUOTO, { tipo: 'assente' });
    } else {
      const riga = rigaDaOggi(rigaOggi);
      const dalServer = diarioDaCampi(rigaOggi);
      if (riga.tipo === 'condiviso') locale = rigaGiaCondivisa(inAttesa ?? diarioLocaleIniziale(clientId, data, dalServer, riga), riga.id, riga.condivisoAlle, dalServer);
      else locale = inAttesa ? { ...inAttesa, riga } : diarioLocaleIniziale(clientId, data, dalServer, riga);
    }
  } catch (e) {
    const err = e as { message?: string };
    if (tipoErroreScrittura(e) === 'rete') return cache ? { tipo: 'ok', dati: cache, daCache: true } : { tipo: 'rete' };
    return { tipo: 'errore', messaggio: err.message ?? 'Errore di lettura' };
  }

  const dati = { locale, settimana };
  salvaCache(dati);
  return { tipo: 'ok', dati, daCache: false };
}

/** La riga di oggi letta per (client_id, data) quando un inserimento trova la riga già creata altrove. */
async function leggiRigaPerData(clientId: string, data: string): Promise<RigaOggi | null> {
  const { data: riga, error } = await supabase.from(TABELLA_DIARIO).select(SELEZIONE_OGGI).eq('client_id', clientId).eq('submission_date', data).maybeSingle<RigaOggi>();
  if (error) throw error;
  return riga;
}

const CODICE_DUPLICATO = '23505';

/**
 * Salva la bozza secondo pianificaSalvataggio: niente se non serve; inserimento senza status (nasce draft) al primo
 * contenuto; altrimenti modifica dei soli campi, filtrata su status = draft. Se la riga risulta già condivisa
 * (0 righe modificate) non si riscrive nulla e la copia locale passa a condiviso. Restituisce la copia locale aggiornata.
 */
export async function salvaBozza(locale: DiarioLocale): Promise<{ locale: DiarioLocale; esito: EsitoScrittura }> {
  const userId = await userIdSessione();
  if (!userId) return { locale, esito: { tipo: 'errore', errore: 'altro' } };
  const op = pianificaSalvataggio(locale, userId);
  if (op.tipo === 'nessuna') return { locale, esito: { tipo: 'ok' } };
  try {
    if (op.tipo === 'inserisci') {
      const { data, error } = await supabase.from(TABELLA_DIARIO).insert(op.riga).select('id').single<{ id: string }>();
      if (error) {
        if (error.code !== CODICE_DUPLICATO) throw error;
        // Riga già creata da un altro dispositivo: ci si allinea e, se è ancora una bozza, si riprova con la modifica.
        const esistente = await leggiRigaPerData(locale.clientId, locale.data);
        if (!esistente) throw error;
        const riga = rigaDaOggi(esistente);
        if (riga.tipo === 'condiviso') return giaCondivisa(locale, esistente);
        return salvaBozza({ ...locale, riga });
      }
      const { client_id: _c, user_id: _u, submission_date: _d, ...campi } = op.riga;
      return { locale: dopoSalvataggio(locale, data.id, campi), esito: { tipo: 'ok' } };
    }
    const { data, error } = await supabase.from(TABELLA_DIARIO).update(op.modifica.campi).eq('id', op.modifica.id).eq('status', 'draft').select('id').returns<{ id: string }[]>();
    if (error) throw error;
    if (!data || data.length === 0) {
      const attuale = await leggiRigaOggi(op.modifica.id);
      if (attuale && statoRiga(attuale.status) === 'submitted') return giaCondivisa(locale, attuale);
      return { locale: dopoErrore(locale, 'altro'), esito: { tipo: 'errore', errore: 'altro' } };
    }
    return { locale: dopoSalvataggio(locale, op.modifica.id, op.modifica.campi), esito: { tipo: 'ok' } };
  } catch (e) {
    const errore = tipoErroreScrittura(e);
    return { locale: dopoErrore(locale, errore), esito: { tipo: 'errore', errore } };
  }
}

function giaCondivisa(locale: DiarioLocale, riga: RigaOggi): { locale: DiarioLocale; esito: EsitoScrittura } {
  return { locale: rigaGiaCondivisa(locale, riga.id, riga.submitted_at, diarioDaCampi(riga)), esito: { tipo: 'giaCondiviso' } };
}

/**
 * Condivide secondo pianificaCondivisione: inserimento già submitted se la riga non esiste; altrimenti una sola
 * modifica (campi + status + submitted_at) filtrata su status = draft. Numero, revisione e sblocco li fa il trigger.
 */
export async function condividiDiario(locale: DiarioLocale, adesso: Date = new Date()): Promise<{ locale: DiarioLocale; esito: EsitoScrittura }> {
  const userId = await userIdSessione();
  if (!userId) return { locale, esito: { tipo: 'errore', errore: 'altro' } };
  const op = pianificaCondivisione(locale, userId, adesso.toISOString());
  if (op.tipo === 'giaCondiviso') return { locale, esito: { tipo: 'giaCondiviso' } };
  try {
    if (op.tipo === 'inserisciCondiviso') {
      const { data, error } = await supabase.from(TABELLA_DIARIO).insert(op.riga).select('id').single<{ id: string }>();
      if (error) {
        if (error.code !== CODICE_DUPLICATO) throw error;
        const esistente = await leggiRigaPerData(locale.clientId, locale.data);
        if (!esistente) throw error;
        const riga = rigaDaOggi(esistente);
        if (riga.tipo === 'condiviso') return giaCondivisa(locale, esistente);
        return condividiDiario({ ...locale, riga }, adesso);
      }
      return { locale: dopoCondivisione(locale, data.id, op.riga.submitted_at), esito: { tipo: 'ok' } };
    }
    const { data, error } = await supabase.from(TABELLA_DIARIO).update(op.modifica.campi).eq('id', op.modifica.id).eq('status', 'draft').select('id').returns<{ id: string }[]>();
    if (error) throw error;
    if (!data || data.length === 0) {
      const attuale = await leggiRigaOggi(op.modifica.id);
      if (attuale && statoRiga(attuale.status) === 'submitted') return giaCondivisa(locale, attuale);
      return { locale: dopoErrore(locale, 'altro'), esito: { tipo: 'errore', errore: 'altro' } };
    }
    return { locale: dopoCondivisione(locale, op.modifica.id, op.modifica.campi.submitted_at), esito: { tipo: 'ok' } };
  } catch (e) {
    const errore = tipoErroreScrittura(e);
    return { locale: dopoErrore(locale, errore), esito: { tipo: 'errore', errore } };
  }
}
