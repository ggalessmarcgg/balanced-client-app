// Peso e misure: una richiesta sulla riga clients per user_id con altezza, pesi e misurazioni incorporate (dalle più
// recenti, con limite; indici idx_weight_logs_client_date e idx_measurements_client_date), riletta all'apertura e al
// ritorno in primo piano (i dati cambiano solo alle visite), copia su file per ripartire senza rete. Nessuna scrittura.
import { classificaErrore } from '@/core/accesso/errori';
import { LIMITE_MISURAZIONI, LIMITE_PESI, SELEZIONE_MISURE, type RigaMisure } from '@/core/misure/misure';
import { leggiFile, scriviFile } from '@/servizi/archivioFile';
import { supabase } from '@/servizi/supabase';

export type EsitoMisure = { tipo: 'ok'; riga: RigaMisure | null; daCache: boolean } | { tipo: 'nonAutenticato' } | { tipo: 'rete' } | { tipo: 'errore'; messaggio: string };

const PREFISSO_CACHE = 'balanced.misure';
type Cache = { riga: RigaMisure | null; letto: string };

function erroreDiRete(error: { code?: string | null; message?: string | null; name?: string | null; status?: number | null }): boolean {
  return classificaErrore(error) === 'rete' || error.code === '' || /network|fetch|offline/i.test(error.message ?? '');
}

export async function leggiMisure(clientId: string): Promise<EsitoMisure> {
  const { data: sessione } = await supabase.auth.getSession();
  const userId = sessione.session?.user.id;
  if (!userId) return { tipo: 'nonAutenticato' };
  const chiave = `${PREFISSO_CACHE}.${clientId}`;
  const { data, error } = await supabase
    .from('clients')
    .select(SELEZIONE_MISURE)
    .eq('user_id', userId)
    .order('log_date', { referencedTable: 'weight_logs', ascending: false })
    .limit(LIMITE_PESI, { referencedTable: 'weight_logs' })
    .order('measurement_date', { referencedTable: 'measurements', ascending: false })
    .limit(LIMITE_MISURAZIONI, { referencedTable: 'measurements' })
    .maybeSingle<RigaMisure>();
  if (error) {
    if (erroreDiRete(error)) {
      try {
        const testo = await leggiFile(chiave);
        if (testo) return { tipo: 'ok', riga: (JSON.parse(testo) as Cache).riga, daCache: true };
      } catch {
        // cache illeggibile
      }
      return { tipo: 'rete' };
    }
    return { tipo: 'errore', messaggio: error.message };
  }
  scriviFile(chiave, JSON.stringify({ riga: data, letto: new Date().toISOString() } satisfies Cache)).catch(() => {});
  return { tipo: 'ok', riga: data, daCache: false };
}
