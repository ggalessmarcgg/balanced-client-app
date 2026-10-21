// "La tua nutrizionista": due richieste in parallelo (profilo incorporato nella riga clients per user_id; sostituzione
// in corso da holiday_replacements per client_id con le ferie incorporate e filtrate su oggi in ora italiana), in
// cache su file per un giorno (il profilo cambia di rado; "oggi" delle ferie cambia a mezzanotte). Nessuna scrittura.
import { classificaErrore } from '@/core/accesso/errori';
import { ferieInCorso, FILTRO_FERIE, profiloNutrizionista, SELEZIONE_PROFILO_NUTRIZIONISTA, SELEZIONE_SOSTITUZIONE, TABELLA_CLIENTI, TABELLA_SOSTITUZIONI, type Ferie, type ProfiloNutrizionista, type RigaClienteConProfilo, type RigaSostituzione } from '@/core/nutrizionista/profilo';
import { dataOraRoma } from '@/core/stato/orarioRoma';
import { leggiFile, scriviFile } from '@/servizi/archivioFile';
import { supabase } from '@/servizi/supabase';

export type DatiNutrizionista = { profilo: ProfiloNutrizionista | null; ferie: Ferie | null };
export type EsitoNutrizionista = { tipo: 'ok'; dati: DatiNutrizionista; daCache: boolean } | { tipo: 'nonAutenticato' } | { tipo: 'rete' } | { tipo: 'errore'; messaggio: string };

type Cache = { riga: RigaClienteConProfilo | null; sostituzioni: RigaSostituzione[]; oggi: string; letto: string };
const PREFISSO_CACHE = 'balanced.nutrizionista';
const DURATA_CACHE_MS = 24 * 60 * 60 * 1000;

function chiave(clientId: string): string {
  return `${PREFISSO_CACHE}.${clientId}`;
}

function erroreDiRete(error: { code?: string | null; message?: string | null; name?: string | null; status?: number | null }): boolean {
  return classificaErrore(error) === 'rete' || error.code === '' || /network|fetch|offline/i.test(error.message ?? '');
}

async function cacheDi(clientId: string): Promise<Cache | null> {
  try {
    const testo = await leggiFile(chiave(clientId));
    return testo ? (JSON.parse(testo) as Cache) : null;
  } catch {
    return null;
  }
}

function datiDa(riga: RigaClienteConProfilo | null, sostituzioni: RigaSostituzione[]): DatiNutrizionista {
  const profilo = riga?.nutritionist_profiles ? profiloNutrizionista(riga.nutritionist_profiles) : null;
  return { profilo, ferie: ferieInCorso(sostituzioni, profilo?.nome ?? '') };
}

/** Lettura della schermata: dalla cache se ha meno di un giorno ed è di oggi; altrimenti dal server (cache anche scaduta senza rete). */
export async function leggiNutrizionista(clientId: string, adesso: Date = new Date()): Promise<EsitoNutrizionista> {
  const { data: sessione } = await supabase.auth.getSession();
  const userId = sessione.session?.user.id;
  if (!userId) return { tipo: 'nonAutenticato' };
  const oggi = dataOraRoma(adesso).data;
  const cache = await cacheDi(clientId);
  if (cache && cache.oggi === oggi && adesso.getTime() - Date.parse(cache.letto) < DURATA_CACHE_MS) return { tipo: 'ok', dati: datiDa(cache.riga, cache.sostituzioni), daCache: true };

  const [profilo, sostituzioni] = await Promise.all([
    supabase.from(TABELLA_CLIENTI).select(SELEZIONE_PROFILO_NUTRIZIONISTA).eq('user_id', userId).maybeSingle<RigaClienteConProfilo>(),
    supabase.from(TABELLA_SOSTITUZIONI).select(SELEZIONE_SOSTITUZIONE).eq('client_id', clientId).lte(FILTRO_FERIE.inizio, oggi).gte(FILTRO_FERIE.fine, oggi).returns<RigaSostituzione[]>(),
  ]);
  const errore = profilo.error ?? sostituzioni.error;
  if (errore) {
    if (erroreDiRete(errore) && cache) return { tipo: 'ok', dati: datiDa(cache.riga, cache.sostituzioni), daCache: true };
    return erroreDiRete(errore) ? { tipo: 'rete' } : { tipo: 'errore', messaggio: errore.message };
  }
  const nuova: Cache = { riga: profilo.data, sostituzioni: sostituzioni.data ?? [], oggi, letto: adesso.toISOString() };
  scriviFile(chiave(clientId), JSON.stringify(nuova)).catch(() => {});
  return { tipo: 'ok', dati: datiDa(nuova.riga, nuova.sostituzioni), daCache: false };
}
