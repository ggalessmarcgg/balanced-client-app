// Sostituzione degli alimenti (step 9, lotto 3): chiamata POST /v1/sostituzione/alternative del server degli agenti con
// l'accesso Supabase del cliente (docs/server-sostituzione.md §3, sullo stampo del diario vocale) e tutorial del Piano
// ricordato nel portachiavi per account. L'app non scrive mai sul database: il server registra da sé ogni chiamata.
import { fetch as fetchExpo } from 'expo/fetch';

import { nuovoIdRichiesta } from '@/core/racconta/server';
import { CARATTERI_MASSIMI_IN_CASA, corpoAlternative, erroreSostituzioneApp, inCasaPerServer, interpretaRispostaAlternative, PERCORSO_ALTERNATIVE, TEMPO_MASSIMO_SOSTITUZIONE_MS, type EsitoSostituzione } from '@/core/sostituzione/server';
import { tokenAccesso, URL_AGENTI } from '@/servizi/agenti';
import { leggi, scrivi } from '@/servizi/archivio';

async function inviaRichiesta(token: string, corpo: string, richiestaId: string): Promise<EsitoSostituzione> {
  const controllo = new AbortController();
  const timer = setTimeout(() => controllo.abort(), TEMPO_MASSIMO_SOSTITUZIONE_MS);
  try {
    const risposta = await fetchExpo(`${URL_AGENTI}${PERCORSO_ALTERNATIVE}`, {
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
    return interpretaRispostaAlternative(risposta.status, json, idRisposta);
  } catch (e) {
    const nome = (e as { name?: string })?.name;
    return { tipo: 'errore', errore: erroreSostituzioneApp(nome === 'AbortError' ? 'tempo_scaduto' : 'rete', richiestaId) };
  } finally {
    clearTimeout(timer);
  }
}

/** Se il server giudica il testo troppo lungo nonostante il limite del campo, si accorcia alla metà e si ripete una volta. */
const FRAZIONE_ACCORCIATA = 0.5;

/**
 * "Trova alternative": la riga toccata (id dal piano letto con get_my_current_nutrition_plan) e il testo del campo,
 * così com'è scritto (pulito per il server). Con un token rifiutato si rinnova la sessione e si ripete una volta;
 * con in_casa_troppo_lungo si accorcia il testo e si ripete una volta. Attesa massima 35 s.
 */
export async function trovaAlternative(rigaId: string, inCasa: string): Promise<EsitoSostituzione> {
  const richiestaId = nuovoIdRichiesta();
  const token = await tokenAccesso();
  if (!token) return { tipo: 'errore', errore: erroreSostituzioneApp('sessione_assente', richiestaId) };
  const corpo = JSON.stringify(corpoAlternative(rigaId, inCasa));
  let esito = await inviaRichiesta(token, corpo, richiestaId);
  if (esito.tipo === 'errore' && esito.errore.esito === 'sessione' && esito.errore.httpStatus === 401) {
    const nuovoToken = await tokenAccesso(true);
    if (nuovoToken) esito = await inviaRichiesta(nuovoToken, corpo, richiestaId);
  }
  if (esito.tipo === 'errore' && esito.errore.esito === 'inCasaTroppoLungo') {
    const accorciato = Array.from(inCasaPerServer(inCasa) ?? '')
      .slice(0, Math.floor(CARATTERI_MASSIMI_IN_CASA * FRAZIONE_ACCORCIATA))
      .join('');
    esito = await inviaRichiesta(token, JSON.stringify(corpoAlternative(rigaId, accorciato)), richiestaId);
  }
  return esito;
}

// ---- Tutorial del Piano (Figma Tutorial · 1 · Piano · sostituzione 586:5457): una volta per account ------------------

const PREFISSO_TUTORIAL = 'balanced.piano.tutorial';

/** Vero se il suggerimento della sostituzione è già stato chiuso con "Ho capito" su questo account. */
export async function tutorialPianoVisto(clientId: string): Promise<boolean> {
  try {
    return (await leggi(`${PREFISSO_TUTORIAL}.${clientId}`)) !== null;
  } catch {
    return false;
  }
}

export function segnaTutorialPianoVisto(clientId: string, adesso: Date = new Date()): void {
  scrivi(`${PREFISSO_TUTORIAL}.${clientId}`, adesso.toISOString()).catch(() => {});
}
