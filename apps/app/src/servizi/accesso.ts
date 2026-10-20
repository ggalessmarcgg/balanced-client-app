// Accesso con email e password, reinvio del link di conferma, recupero password e uscita. Gli errori di
// GoTrue vengono classificati in src/core/accesso/errori.ts: le schermate mostrano messaggi dedicati.
import { ATTESA_REINVIO_SECONDI, URL_CONFERMA_EMAIL, URL_RECUPERO_PASSWORD } from '@/core/accesso/costanti';
import { classificaErrore, normalizzaEmail, type TipoErroreAccesso } from '@/core/accesso/errori';
import { svuotaAutoriInMemoria } from '@/servizi/diario';
import { svuotaMemoriaDiario } from '@/servizi/memoriaDiario';
import { svuotaCacheStato, svuotaStatoInMemoria } from '@/servizi/statoCliente';
import { supabase } from '@/servizi/supabase';

export type Esito = { ok: true } | { ok: false; errore: TipoErroreAccesso };

function esitoDi(error: unknown): Esito {
  return error ? { ok: false, errore: classificaErrore(error) } : { ok: true };
}

/** signInWithPassword con la chiave pubblica: stessa sessione della web app (che passa da client-login). */
export async function accedi(email: string, password: string): Promise<Esito> {
  svuotaStatoInMemoria();
  try {
    const { error } = await supabase.auth.signInWithPassword({ email: normalizzaEmail(email), password });
    return esitoDi(error);
  } catch (e) {
    return esitoDi(e);
  }
}

/** Reinvio del link di conferma (tipo signup, stesso redirect del funnel e della web app). Risponde 200 anche per email già confermate o inesistenti. */
export async function reinviaConferma(email: string): Promise<Esito> {
  try {
    const { error } = await supabase.auth.resend({ type: 'signup', email: normalizzaEmail(email), options: { emailRedirectTo: URL_CONFERMA_EMAIL } });
    return esitoDi(error);
  } catch (e) {
    return esitoDi(e);
  }
}

/** Link di recupero verso la pagina web /auth?mode=reset (nessuna schermata di nuova password nell'app). */
export async function richiediRecupero(email: string): Promise<Esito> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(normalizzaEmail(email), { redirectTo: URL_RECUPERO_PASSWORD });
    return esitoDi(error);
  } catch (e) {
    return esitoDi(e);
  }
}

/**
 * Esci: chiude la sessione su tutti i dispositivi (signOut globale, come la web app) e svuota cache e dati
 * locali. Se la revoca globale non riesce (es. offline), la sessione locale viene comunque chiusa.
 */
export async function esci(): Promise<{ revocaGlobale: boolean }> {
  let revocaGlobale = true;
  try {
    const { error } = await supabase.auth.signOut({ scope: 'global' });
    if (error) revocaGlobale = false;
  } catch {
    revocaGlobale = false;
  }
  if (!revocaGlobale) await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
  await svuotaCacheStato();
  svuotaAutoriInMemoria();
  svuotaMemoriaDiario();
  return { revocaGlobale };
}

export { ATTESA_REINVIO_SECONDI };
