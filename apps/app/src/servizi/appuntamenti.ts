// Appuntamenti: una richiesta sulla riga clients per user_id con prime visite (appointments) e visite di controllo
// (control_visits, dalla più recente, con limite) incorporate; riletta all'apertura e al ritorno in primo piano,
// copia in cache su file per ripartire senza rete. Nessuna scrittura.
import { classificaErrore } from '@/core/accesso/errori';
import { LIMITE_VISITE, SELEZIONE_APPUNTAMENTI, type RigaAppuntamenti } from '@/core/appuntamenti/appuntamenti';
import { leggiFile, scriviFile } from '@/servizi/archivioFile';
import { supabase } from '@/servizi/supabase';

export type EsitoAppuntamenti = { tipo: 'ok'; riga: RigaAppuntamenti | null; daCache: boolean } | { tipo: 'nonAutenticato' } | { tipo: 'rete' } | { tipo: 'errore'; messaggio: string };

const PREFISSO_CACHE = 'balanced.appuntamenti';
type Cache = { riga: RigaAppuntamenti | null; letto: string };

function erroreDiRete(error: { code?: string | null; message?: string | null; name?: string | null; status?: number | null }): boolean {
  return classificaErrore(error) === 'rete' || error.code === '' || /network|fetch|offline/i.test(error.message ?? '');
}

async function cacheDi(clientId: string): Promise<Cache | null> {
  try {
    const testo = await leggiFile(`${PREFISSO_CACHE}.${clientId}`);
    return testo ? (JSON.parse(testo) as Cache) : null;
  } catch {
    return null;
  }
}

export async function leggiAppuntamenti(clientId: string): Promise<EsitoAppuntamenti> {
  const { data: sessione } = await supabase.auth.getSession();
  const userId = sessione.session?.user.id;
  if (!userId) return { tipo: 'nonAutenticato' };
  const { data, error } = await supabase
    .from('clients')
    .select(SELEZIONE_APPUNTAMENTI)
    .eq('user_id', userId)
    .order('scheduled_date', { referencedTable: 'control_visits', ascending: false })
    .limit(LIMITE_VISITE, { referencedTable: 'control_visits' })
    .maybeSingle<RigaAppuntamenti>();
  if (error) {
    if (erroreDiRete(error)) {
      const cache = await cacheDi(clientId);
      return cache ? { tipo: 'ok', riga: cache.riga, daCache: true } : { tipo: 'rete' };
    }
    return { tipo: 'errore', messaggio: error.message };
  }
  scriviFile(`${PREFISSO_CACHE}.${clientId}`, JSON.stringify({ riga: data, letto: new Date().toISOString() } satisfies Cache)).catch(() => {});
  return { tipo: 'ok', riga: data, daCache: false };
}
