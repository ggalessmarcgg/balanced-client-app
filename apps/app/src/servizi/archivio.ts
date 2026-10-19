// Archivio sicuro a pezzi sopra expo-secure-store (portachiavi iOS / keystore Android). Un valore del
// portachiavi dovrebbe restare sotto i 2 KB: la sessione Supabase (token di accesso, di rinnovo e utente)
// è più grande, quindi ogni valore si salva in pezzi da 1,8 KB sotto chiavi numerate più il conteggio
// (logica pura in src/core/sessione/pezzi.ts).
import * as SecureStore from 'expo-secure-store';

import { chiaveConteggio, chiavePezzo, conteggioValido, dividiInPezzi, unisciPezzi } from '@/core/sessione/pezzi';

// Leggibile anche a telefono bloccato dopo il primo sblocco: serve al rinnovo automatico della sessione.
const OPZIONI: SecureStore.SecureStoreOptions = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK };

export async function leggi(chiave: string): Promise<string | null> {
  const n = conteggioValido(await SecureStore.getItemAsync(chiaveConteggio(chiave), OPZIONI));
  if (!n) return null;
  const pezzi = await Promise.all(Array.from({ length: n }, (_, i) => SecureStore.getItemAsync(chiavePezzo(chiave, i), OPZIONI)));
  return unisciPezzi(pezzi);
}

export async function scrivi(chiave: string, valore: string): Promise<void> {
  await rimuovi(chiave);
  const pezzi = dividiInPezzi(valore);
  for (const [i, pezzo] of pezzi.entries()) await SecureStore.setItemAsync(chiavePezzo(chiave, i), pezzo, OPZIONI);
  // Il conteggio per ultimo: finché manca, la lettura considera il valore assente (mai una sessione a metà).
  await SecureStore.setItemAsync(chiaveConteggio(chiave), String(pezzi.length), OPZIONI);
}

export async function rimuovi(chiave: string): Promise<void> {
  const n = conteggioValido(await SecureStore.getItemAsync(chiaveConteggio(chiave), OPZIONI)) ?? 0;
  await SecureStore.deleteItemAsync(chiaveConteggio(chiave), OPZIONI);
  for (let i = 0; i < n; i++) await SecureStore.deleteItemAsync(chiavePezzo(chiave, i), OPZIONI);
}
