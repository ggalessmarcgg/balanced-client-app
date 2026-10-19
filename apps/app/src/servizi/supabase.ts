// Client Supabase dell'app: chiave pubblica "default" (publishable) e URL dal .env (EXPO_PUBLIC_*), sessione
// persistita nel portachiavi (archivio a pezzi) e rinnovata in automatico mentre l'app è in primo piano.
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import { leggi, rimuovi, scrivi } from '@/servizi/archivio';

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const CHIAVE = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!URL || !CHIAVE) {
  throw new Error('Mancano EXPO_PUBLIC_SUPABASE_URL o EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: copiare .env.example in .env e compilarlo.');
}

export const supabase = createClient(URL, CHIAVE, {
  auth: {
    storage: { getItem: leggi, setItem: scrivi, removeItem: rimuovi },
    persistSession: true,
    autoRefreshToken: true,
    // Nessun accesso da link nella v1: niente lettura della sessione dagli URL aperti dall'app.
    detectSessionInUrl: false,
  },
});

// Rinnovo del token solo con l'app attiva (indicazione di Supabase per React Native).
AppState.addEventListener('change', (stato) => {
  if (stato === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});
