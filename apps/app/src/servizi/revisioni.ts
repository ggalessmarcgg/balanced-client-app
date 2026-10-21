// Revisioni (step 7): letture mirate su client_reviews e le due sole scritture del cliente (apertura e lettura),
// con la logica pura di src/core/revisioni. Una lettura leggera dello stato per user_id (serve alla sezione e al
// pallino della barra; si ripete all'apertura della sezione, al ritorno in primo piano, all'avvio dell'app
// dell'abbonato e dopo la condivisione di un diario); una seconda lettura con il testo solo per le revisioni
// inviate (sent, opened, read) il cui testo non è già in memoria: il testo non cambia dopo l'invio.
import { classificaErrore } from '@/core/accesso/errori';
import { haTesto, SELEZIONE_STATO_REVISIONI, SELEZIONE_TESTO_REVISIONI, STATI_CON_TESTO, TABELLA_REVISIONI, type RigaRevisione, type RigaTestoRevisione } from '@/core/revisioni/letture';
import { applicaModifiche, pianificaApertura, pianificaLetta, statiDiPartenza, unisciConLocale, type ModificaRevisione } from '@/core/revisioni/lettura';
import { modificaDaCache } from '@/core/revisioni/memoria';
import { testoRevisione, type TestoRevisione } from '@/core/revisioni/testo';
import { precaricaAutori } from '@/servizi/diario';
import { aggiornaMemoriaRevisioni, cacheRevisioni, memoriaRevisioni, persistiRevisioni } from '@/servizi/memoriaRevisioni';
import { supabase } from '@/servizi/supabase';

export type EsitoRevisioni = { tipo: 'ok'; daCache: boolean } | { tipo: 'nonAutenticato' } | { tipo: 'rete' } | { tipo: 'errore'; messaggio: string };

function erroreDiRete(error: { code?: string | null; message?: string | null; name?: string | null; status?: number | null }): boolean {
  return classificaErrore(error) === 'rete' || error.code === '' || /network|fetch|offline/i.test(error.message ?? '');
}

async function userIdSessione(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

/** Lettura leggera: stato di tutte le revisioni del cliente, senza testo. */
async function leggiStato(userId: string): Promise<{ tipo: 'ok'; righe: RigaRevisione[] } | { tipo: 'rete' } | { tipo: 'errore'; messaggio: string }> {
  const { data, error } = await supabase.from(TABELLA_REVISIONI).select(SELEZIONE_STATO_REVISIONI).eq('user_id', userId).order('review_number', { ascending: false }).returns<RigaRevisione[]>();
  if (error) return erroreDiRete(error) ? { tipo: 'rete' } : { tipo: 'errore', messaggio: error.message };
  return { tipo: 'ok', righe: data ?? [] };
}

/** Seconda lettura: i testi delle revisioni inviate indicate (mai di unlocked o draft, anche se l'id fosse noto). */
async function leggiTesti(userId: string, ids: string[]): Promise<{ tipo: 'ok'; testi: Record<string, TestoRevisione> } | { tipo: 'rete' } | { tipo: 'errore'; messaggio: string }> {
  if (ids.length === 0) return { tipo: 'ok', testi: {} };
  const { data, error } = await supabase
    .from(TABELLA_REVISIONI)
    .select(SELEZIONE_TESTO_REVISIONI)
    .eq('user_id', userId)
    .in('id', ids)
    .in('status', [...STATI_CON_TESTO])
    .returns<RigaTestoRevisione[]>();
  if (error) return erroreDiRete(error) ? { tipo: 'rete' } : { tipo: 'errore', messaggio: error.message };
  const testi: Record<string, TestoRevisione> = {};
  for (const r of data ?? []) testi[r.id] = testoRevisione(r.review_text);
  return { tipo: 'ok', testi };
}

/** Porta in memoria la copia su file, una volta per sessione e per cliente; con la copia vuota non tocca nulla. */
async function preparaMemoria(clientId: string): Promise<void> {
  const m = memoriaRevisioni();
  if (m.clientId === clientId && m.righe !== null) return;
  const cache = await cacheRevisioni(clientId);
  const modifica = modificaDaCache(memoriaRevisioni(), clientId, cache);
  if (modifica) aggiornaMemoriaRevisioni(modifica);
}

/** Id delle revisioni inviate senza testo in memoria. */
function idsSenzaTesto(righe: RigaRevisione[], testi: Record<string, TestoRevisione>): string[] {
  return righe.filter((r) => haTesto(r.status) && !testi[r.id]).map((r) => r.id);
}

/**
 * Lettura della sezione: stato leggero, poi i testi mancanti delle revisioni inviate, con le aperture e letture in
 * attesa riapplicate sopra le righe del server. Senza rete si usa la copia locale se c'è. Con `soloStato` si legge
 * soltanto lo stato (avvio dell'app dell'abbonato, dopo la condivisione di un diario): nessun testo.
 */
export async function caricaRevisioni(clientId: string, nutrizionistaFoto: string | null = null, { soloStato = false } = {}): Promise<EsitoRevisioni> {
  const userId = await userIdSessione();
  if (!userId) return { tipo: 'nonAutenticato' };
  await preparaMemoria(clientId);
  const esitoStato = await leggiStato(userId);
  if (esitoStato.tipo !== 'ok') {
    if (esitoStato.tipo === 'rete' && memoriaRevisioni().righe) return { tipo: 'ok', daCache: true };
    return esitoStato;
  }
  const m = memoriaRevisioni();
  // Le aperture e letture decise in locale (in attesa o confermate durante questa lettura) non tornano indietro.
  const righe = applicaModifiche(unisciConLocale(esitoStato.righe, m.righe ?? []), m.scrittureInAttesa);
  // I testi di revisioni che non esistono più (0 casi noti) non restano in memoria.
  const idNoti = new Set(righe.map((r) => r.id));
  const testi = Object.fromEntries(Object.entries(m.testi).filter(([id]) => idNoti.has(id)));
  aggiornaMemoriaRevisioni({ clientId, righe, testi });
  persistiRevisioni();
  void riprovaScritture();
  if (soloStato) return { tipo: 'ok', daCache: false };

  const esitoTesti = await leggiTesti(userId, idsSenzaTesto(righe, testi));
  if (esitoTesti.tipo === 'ok' && Object.keys(esitoTesti.testi).length > 0) {
    aggiornaMemoriaRevisioni({ testi: { ...memoriaRevisioni().testi, ...esitoTesti.testi } });
    persistiRevisioni();
  }
  // Autrici delle Nuove (e foto) pronte prima che si apra una card o la lettura.
  void precaricaAutori(
    righe.filter((r) => r.status === 'sent' && r.review_author_id).map((r) => r.review_author_id as string),
    [nutrizionistaFoto],
  );
  if (esitoTesti.tipo !== 'ok') return esitoTesti.tipo === 'rete' ? { tipo: 'ok', daCache: true } : esitoTesti;
  return { tipo: 'ok', daCache: false };
}

// Una sola lettura leggera alla volta: chi la chiede mentre è in corso riusa quella (Oggi e Account all'avvio).
let letturaStatoInCorso: { clientId: string; promessa: Promise<unknown> } | null = null;

/** Solo lo stato leggero (pallino della barra, contatore dell'Account): all'avvio dell'app dell'abbonato, al rientro, dopo la condivisione di un diario. */
export function aggiornaStatoRevisioni(clientId: string): void {
  if (letturaStatoInCorso?.clientId === clientId) return;
  const promessa = caricaRevisioni(clientId, null, { soloStato: true })
    .catch(() => {})
    .finally(() => {
      if (letturaStatoInCorso?.promessa === promessa) letturaStatoInCorso = null;
    });
  letturaStatoInCorso = { clientId, promessa };
}

/** Il testo di una sola revisione (rotta diretta su una revisione non ancora in memoria). */
export async function caricaTestoRevisione(id: string): Promise<EsitoRevisioni> {
  const userId = await userIdSessione();
  if (!userId) return { tipo: 'nonAutenticato' };
  const esito = await leggiTesti(userId, [id]);
  if (esito.tipo !== 'ok') return esito;
  if (esito.testi[id]) {
    aggiornaMemoriaRevisioni({ testi: { ...memoriaRevisioni().testi, ...esito.testi } });
    persistiRevisioni();
  }
  return { tipo: 'ok', daCache: false };
}

// ---- Le due scritture --------------------------------------------------------------------------------------------

/**
 * Esegue una modifica: solo status e la data, filtrata sugli stati di partenza ammessi. Vero se è andata a buon fine
 * o se non c'era più nulla da scrivere (0 righe: già aperta/letta altrove); falso se va riprovata.
 */
async function scriviModifica(modifica: ModificaRevisione): Promise<boolean> {
  try {
    const { error } = await supabase
      .from(TABELLA_REVISIONI)
      .update(modifica.campi)
      .eq('id', modifica.id)
      .in('status', [...statiDiPartenza(modifica)])
      .select('id')
      .returns<{ id: string }[]>();
    return !error;
  } catch {
    return false;
  }
}

function togliScritturaInAttesa(modifica: ModificaRevisione): void {
  aggiornaMemoriaRevisioni({ scrittureInAttesa: memoriaRevisioni().scrittureInAttesa.filter((m) => m !== modifica) });
  persistiRevisioni();
}

/** Aggiorna subito la cache, mette la scrittura in attesa e la esegue; se fallisce resta in attesa (si riprova in silenzio). */
function applicaEScrivi(modifica: ModificaRevisione): void {
  const m = memoriaRevisioni();
  if (!m.righe) return;
  aggiornaMemoriaRevisioni({ righe: applicaModifiche(m.righe, [modifica]), scrittureInAttesa: [...m.scrittureInAttesa, modifica] });
  persistiRevisioni();
  void scriviModifica(modifica).then((ok) => {
    if (ok) togliScritturaInAttesa(modifica);
  });
}

/** Apertura della lettura: segna 'opened' se la revisione è ancora 'sent' (smette subito di essere Nuova). */
export function segnaAperta(id: string, adesso: Date = new Date()): void {
  const riga = memoriaRevisioni().righe?.find((r) => r.id === id);
  if (!riga) return;
  const op = pianificaApertura(riga, adesso);
  if (op.tipo === 'scrivi') applicaEScrivi(op.modifica);
}

/** Regola del letto soddisfatta: segna 'read' se la revisione è 'opened' o 'sent'. */
export function segnaLetta(id: string, adesso: Date = new Date()): void {
  const riga = memoriaRevisioni().righe?.find((r) => r.id === id);
  if (!riga) return;
  const op = pianificaLetta(riga, adesso);
  if (op.tipo === 'scrivi') applicaEScrivi(op.modifica);
}

let ritentativoInCorso = false;
/** Scritture in attesa: si riprovano in silenzio (apertura della sezione, ritorno in primo piano, dopo una lettura). */
export async function riprovaScritture(): Promise<void> {
  if (ritentativoInCorso) return;
  ritentativoInCorso = true;
  try {
    for (const modifica of [...memoriaRevisioni().scrittureInAttesa]) {
      if (await scriviModifica(modifica)) togliScritturaInAttesa(modifica);
    }
  } finally {
    ritentativoInCorso = false;
  }
}
