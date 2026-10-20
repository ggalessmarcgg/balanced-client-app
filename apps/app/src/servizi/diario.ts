// Diario di oggi e giornate della settimana: letture mirate su daily_submissions, copia locale nel portachiavi
// finché il server non conferma, salvataggio della bozza senza status e condivisione in una sola modifica (logica
// pura in src/core/diario). Lotto 2: la settimana corrente (lunedì–domenica) porta anche commento e "letto" per i
// pallini; la giornata completa si legge al tocco (o viene dalla cache); "letto" e modifica di una giornata
// condivisa scrivono solo le colonne del cliente. client_id viene dallo stato letto una volta per sessione
// (statoCliente.ts); user_id dalla sessione locale.
import { classificaErrore } from '@/core/accesso/errori';
import {
  copiaLocalePiuRecente,
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
import { applicaLettureInAttesa, type ModificaLetto } from '@/core/diario/commento';
import { dataOggiRoma, intervalloSettimana } from '@/core/diario/data';
import { dopoErroreModifica, dopoModifica, pianificaModifica, type GiornataLocale } from '@/core/diario/giornata';
import {
  SELEZIONE_AUTORE,
  SELEZIONE_GIORNATA,
  SELEZIONE_OGGI,
  SELEZIONE_SETTIMANA,
  statoRiga,
  TABELLA_AUTORI,
  TABELLA_DIARIO,
  type RigaAutore,
  type RigaGiornata,
  type RigaOggi,
  type RigaSettimana,
} from '@/core/diario/letture';
import { campiDaSalvare, DIARIO_VUOTO, diarioDaCampi } from '@/core/diario/modello';
import { leggi, rimuovi, scrivi } from '@/servizi/archivio';
import { precaricaFoto } from '@/servizi/foto';
import { supabase } from '@/servizi/supabase';

export type DatiOggi = {
  locale: DiarioLocale;
  /** Righe della settimana corrente (lunedì–domenica), senza i testi del cliente. */
  settimana: RigaSettimana[];
  /** Giornate complete già lette (chiave: data YYYY-MM-DD), con le eventuali modifiche in attesa. */
  giornate: Record<string, GiornataLocale>;
  /** Righe il cui "letto" è stato mostrato ma non ancora confermato dal server: si riprova alla prossima apertura. */
  lettureInAttesa: string[];
};
export const DATI_VUOTI: Pick<DatiOggi, 'giornate' | 'lettureInAttesa'> = { giornate: {}, lettureInAttesa: [] };
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
    const cache = JSON.parse(testo) as Partial<Cache>;
    if (!copiaValida(cache.locale, clientId, data)) return null;
    return { locale: cache.locale, settimana: cache.settimana ?? [], giornate: cache.giornate ?? {}, lettureInAttesa: cache.lettureInAttesa ?? [] };
  } catch {
    return null;
  }
}

// La copia locale si aggiorna a ogni modifica (tasto, tocco, trascinamento): le scritture nel portachiavi sono
// serializzate e, se ne arrivano molte mentre una è in corso, si scrive solo l'ultima.
let scritturaCache: Promise<void> = Promise.resolve();
let cacheInCoda: Cache | null = null;

/** Salva la copia locale (diario di oggi, settimana, giornate aperte, letture in attesa). Non blocca: gli errori del portachiavi si ignorano. */
export function salvaCache(dati: DatiOggi): void {
  const cache: Cache = { ...dati, letto: new Date().toISOString() };
  const primaInCoda = cacheInCoda === null;
  cacheInCoda = cache;
  if (!primaInCoda) return;
  scritturaCache = scritturaCache.then(async () => {
    while (cacheInCoda) {
      const daScrivere = cacheInCoda;
      cacheInCoda = null;
      await scrivi(chiaveCache(daScrivere.locale.clientId, daScrivere.locale.data), JSON.stringify(daScrivere)).catch(() => {});
    }
  });
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
 * Lettura della pagina Oggi: una query per la settimana corrente (lunedì–domenica, per client_id, senza i testi del
 * cliente ma con commento e "letto") e, se oggi ha già una riga, una seconda per la riga completa. Il contenuto locale in attesa vince sul
 * server se è più recente di updated_at (app chiusa in modo improvviso prima del salvataggio: la bozza riparte dalla
 * copia locale e viene salvata); lo stato della riga (bozza/condivisa) viene sempre dal server.
 * Senza rete si usa la copia locale se c'è.
 */
export async function leggiDiarioOggi(clientId: string, adesso: Date = new Date()): Promise<EsitoLetturaDiario> {
  const data = dataOggiRoma(adesso);
  const userId = await userIdSessione();
  if (!userId) return { tipo: 'nonAutenticato' };

  const cache = await cacheDi(clientId, data);
  const { da, a } = intervalloSettimana(data);
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
  // I "letto" non ancora confermati restano letti in locale (si riprovano alla prossima apertura del pannello).
  const lettureInAttesa = cache?.lettureInAttesa ?? [];
  const settimana = applicaLettureInAttesa(lettura.data ?? [], lettureInAttesa);
  const oggiInElenco = settimana.find((r) => r.submission_date === data);

  let locale: DiarioLocale;
  try {
    const rigaOggi = oggiInElenco ? await leggiRigaOggi(oggiInElenco.id) : null;
    const inAttesa = cache && copiaLocalePiuRecente(cache.locale, rigaOggi?.updated_at) ? cache.locale : null;
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

  const dati: DatiOggi = { locale, settimana, giornate: cache?.giornate ?? {}, lettureInAttesa };
  salvaCache(dati);
  return { tipo: 'ok', dati, daCache: false };
}

/** La riga di un giorno letta per (client_id, data): oggi, quando un inserimento trova la riga già creata altrove; una giornata fuori settimana aperta dalla rotta. */
export async function leggiRigaPerData(clientId: string, data: string): Promise<RigaOggi | null> {
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

// ---- Lotto 2: pannello della giornata ---------------------------------------------------------------------------

export type EsitoLettura<T> = { tipo: 'ok'; dati: T } | { tipo: 'rete' } | { tipo: 'errore'; messaggio: string };

/** La riga completa di una giornata (colonne esplicite). null se non esiste o non è leggibile. */
export async function leggiGiornata(id: string): Promise<EsitoLettura<RigaGiornata | null>> {
  const { data, error } = await supabase.from(TABELLA_DIARIO).select(SELEZIONE_GIORNATA).eq('id', id).maybeSingle<RigaGiornata>();
  if (error) return erroreDiRete(error) ? { tipo: 'rete' } : { tipo: 'errore', messaggio: error.message };
  return { tipo: 'ok', dati: data };
}

/**
 * Segna letto il commento: una sola modifica comment_acknowledged = true su quella riga (policy "acknowledge comments
 * on submitted entries"); nessun'altra colonna. Decidere se scriverla spetta a pianificaLetto (core/diario/commento).
 * Restituisce false se la scrittura non è andata a buon fine (si riprova in silenzio alla prossima apertura).
 */
export async function scriviCommentoLetto(modifica: ModificaLetto): Promise<boolean> {
  try {
    const { data, error } = await supabase.from(TABELLA_DIARIO).update(modifica.campi).eq('id', modifica.id).select('id').returns<{ id: string }[]>();
    if (error) return false;
    return Boolean(data && data.length > 0);
  } catch {
    return false;
  }
}

/** Una giornata fuori dalla settimana corrente (rotta diretta, step 6): riga completa più commento e "letto", per (client_id, data). */
export type RigaGiornataConCommento = RigaGiornata & Pick<RigaSettimana, 'nutritionist_comment' | 'comment_author_id' | 'comment_acknowledged'>;
const SELEZIONE_GIORNATA_CON_COMMENTO = `${SELEZIONE_GIORNATA},nutritionist_comment,comment_author_id,comment_acknowledged`;
export async function leggiGiornataPerData(clientId: string, data: string): Promise<EsitoLettura<RigaGiornataConCommento | null>> {
  const { data: riga, error } = await supabase
    .from(TABELLA_DIARIO)
    .select(SELEZIONE_GIORNATA_CON_COMMENTO)
    .eq('client_id', clientId)
    .eq('submission_date', data)
    .maybeSingle<RigaGiornataConCommento>();
  if (error) return erroreDiRete(error) ? { tipo: 'rete' } : { tipo: 'errore', messaggio: error.message };
  return { tipo: 'ok', dati: riga };
}

/**
 * Salva le modifiche di una giornata condivisa secondo pianificaModifica: niente se i campi sono quelli del server;
 * altrimenti una modifica dei soli dieci campi del cliente, filtrata su status = submitted (la giornata resta condivisa;
 * status, submitted_at, submission_date, submission_number e le colonne della nutrizionista non si toccano mai).
 */
export async function salvaGiornata(giornata: GiornataLocale): Promise<{ giornata: GiornataLocale; esito: EsitoScrittura }> {
  const op = pianificaModifica(giornata);
  if (op.tipo === 'nessuna') return { giornata: { ...giornata, inAttesa: false, errore: null }, esito: { tipo: 'ok' } };
  try {
    const { data, error } = await supabase
      .from(TABELLA_DIARIO)
      .update(op.modifica.campi)
      .eq('id', op.modifica.id)
      .eq('status', 'submitted')
      .select('id,updated_at')
      .returns<{ id: string; updated_at: string | null }[]>();
    if (error) throw error;
    const riga = data?.[0];
    if (!riga) return { giornata: dopoErroreModifica(giornata, 'altro'), esito: { tipo: 'errore', errore: 'altro' } };
    return { giornata: dopoModifica(giornata, op.modifica.campi, riga.updated_at), esito: { tipo: 'ok' } };
  } catch (e) {
    const errore = tipoErroreScrittura(e);
    return { giornata: dopoErroreModifica(giornata, errore), esito: { tipo: 'errore', errore } };
  }
}

// Profilo dell'autore del commento: una lettura per autore, tenuta in memoria per la sessione e nel portachiavi a
// lungo (i profili cambiano di rado). I profili inattivi non sono leggibili dal cliente: si ripiega sulla
// nutrizionista assegnata (core/diario/commento.ts, autoreCommento).
const PREFISSO_AUTORE = 'balanced.autore';
const DURATA_CACHE_AUTORE_MS = 30 * 24 * 60 * 60 * 1000;
type CacheAutore = { riga: RigaAutore | null; letto: string };
const autoriInMemoria = new Map<string, RigaAutore | null>();

export async function leggiAutore(id: string): Promise<RigaAutore | null> {
  const inMemoria = autoriInMemoria.get(id);
  if (inMemoria !== undefined) return inMemoria;
  const chiave = `${PREFISSO_AUTORE}.${id}`;
  try {
    const testo = await leggi(chiave);
    if (testo) {
      const cache = JSON.parse(testo) as CacheAutore;
      if (Date.now() - Date.parse(cache.letto) < DURATA_CACHE_AUTORE_MS) {
        autoriInMemoria.set(id, cache.riga);
        return cache.riga;
      }
    }
  } catch {
    // cache illeggibile: si rilegge dal server
  }
  const { data, error } = await supabase.from(TABELLA_AUTORI).select(SELEZIONE_AUTORE).eq('id', id).maybeSingle<RigaAutore>();
  if (error) return null; // senza rete o non leggibile: ripiego sulla nutrizionista del cliente, niente in cache
  autoriInMemoria.set(id, data);
  scrivi(chiave, JSON.stringify({ riga: data, letto: new Date().toISOString() } satisfies CacheAutore)).catch(() => {});
  return data;
}

/**
 * Dopo la lettura della settimana: porta in memoria i profili degli autori dei commenti (una lettura per autore, la
 * prima volta) e precarica le loro foto e quella della nutrizionista del cliente, così il pannello non aspetta nulla.
 */
export async function precaricaAutori(autoriId: string[], altreFoto: (string | null | undefined)[]): Promise<void> {
  const profili = await Promise.all([...new Set(autoriId)].map((id) => leggiAutore(id)));
  const foto = new Set<string>();
  for (const p of profili) if (p?.app_square_photo_url) foto.add(p.app_square_photo_url);
  for (const f of altreFoto) if (f) foto.add(f);
  await Promise.all([...foto].map((f) => precaricaFoto(f)));
}

/** All'uscita: dimentica i profili letti (la cache nel portachiavi resta: non contiene dati del cliente). */
export function svuotaAutoriInMemoria(): void {
  autoriInMemoria.clear();
}
