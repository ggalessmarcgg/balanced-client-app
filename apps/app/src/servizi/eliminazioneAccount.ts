// Richiesta di eliminazione dell'account (contratto eliminazione account v0.1 §2 e §4): chiamata POST
// /v1/account/eliminazione del server degli agenti con l'accesso Supabase del cliente e la password; il server verifica
// la password, registra la richiesta e manda le email. L'app non scrive mai sul database per questo percorso e non
// cambia lo stato del cliente: dopo l'esito positivo esegue "Esci" (rotta dell'Account).
import Constants from 'expo-constants';
import { fetch as fetchExpo } from 'expo/fetch';
import { Platform } from 'react-native';

import { corpoEliminazione, erroreEliminazioneApp, interpretaRispostaEliminazione, PERCORSO_ELIMINAZIONE, TEMPO_MASSIMO_ELIMINAZIONE_MS, type EsitoEliminazione } from '@/core/account/eliminazione';
import { nuovoIdRichiesta } from '@/core/racconta/server';
import { tokenAccesso, URL_AGENTI } from '@/servizi/agenti';

async function inviaRichiesta(token: string, corpo: string, richiestaId: string): Promise<EsitoEliminazione> {
  const controllo = new AbortController();
  const timer = setTimeout(() => controllo.abort(), TEMPO_MASSIMO_ELIMINAZIONE_MS);
  try {
    const risposta = await fetchExpo(`${URL_AGENTI}${PERCORSO_ELIMINAZIONE}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'X-Request-Id': richiestaId },
      body: corpo,
      signal: controllo.signal,
    });
    const idRisposta = risposta.headers.get('x-request-id') ?? richiestaId;
    let json: unknown = null;
    try {
      json = await risposta.json();
    } catch {
      json = null;
    }
    return interpretaRispostaEliminazione(risposta.status, json, idRisposta);
  } catch (e) {
    const nome = (e as { name?: string })?.name;
    return { tipo: 'errore', errore: erroreEliminazioneApp(nome === 'AbortError' ? 'tempo_scaduto' : 'rete', richiestaId) };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * "Elimina definitivamente": la password digitata nel pannello, la versione dell'app e la piattaforma. Con un token
 * rifiutato si rinnova la sessione e si ripete una volta. La password non viene conservata da nessuna parte.
 */
export async function richiediEliminazione(password: string): Promise<EsitoEliminazione> {
  const richiestaId = nuovoIdRichiesta();
  const token = await tokenAccesso();
  if (!token) return { tipo: 'errore', errore: erroreEliminazioneApp('sessione_assente', richiestaId) };
  const corpo = JSON.stringify(corpoEliminazione(password, Constants.expoConfig?.version ?? null, Platform.OS === 'android' ? 'android' : 'ios'));
  let esito = await inviaRichiesta(token, corpo, richiestaId);
  if (esito.tipo === 'errore' && esito.errore.esito === 'sessione' && esito.errore.httpStatus === 401) {
    const nuovoToken = await tokenAccesso(true);
    if (nuovoToken) esito = await inviaRichiesta(nuovoToken, corpo, richiestaId);
  }
  return esito;
}
