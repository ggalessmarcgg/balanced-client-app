// Collegamento comune al server degli agenti dell'app (balanced-client-agents su Railway): indirizzo pubblico da
// EXPO_PUBLIC_AGENTI_URL e access token della sessione Supabase del cliente, rinnovato se sta per scadere. Ogni
// chiamata porta `Authorization: Bearer <access_token>`; l'app non passa mai il proprio client_id.
import { supabase } from '@/servizi/supabase';

const url = process.env.EXPO_PUBLIC_AGENTI_URL;
if (!url) {
  throw new Error('Manca EXPO_PUBLIC_AGENTI_URL: copiare .env.example in .env e compilarlo.');
}
export const URL_AGENTI: string = url;

const MARGINE_SCADENZA_TOKEN_S = 60;

/** L'access token della sessione, rinnovato se sta per scadere (o se `forza`). null senza sessione. */
export async function tokenAccesso(forza = false): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  const sessione = data.session;
  if (!sessione) return null;
  const inScadenza = sessione.expires_at !== undefined && sessione.expires_at - Date.now() / 1000 < MARGINE_SCADENZA_TOKEN_S;
  if (!forza && !inScadenza) return sessione.access_token;
  const rinnovo = await supabase.auth.refreshSession().catch(() => null);
  return rinnovo?.data.session?.access_token ?? (forza ? null : sessione.access_token);
}
