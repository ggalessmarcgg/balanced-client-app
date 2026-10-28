// Ricette (step 9, lotto 3): le due chiamate del server degli agenti (POST /v1/ricette/idee e /v1/ricette/ricetta,
// docs/server-ricette.md §3 e §4) con l'accesso Supabase del cliente, sullo stampo della sostituzione, e la memoria
// della ricetta pronta per la pagina (5.4 / 5.5). Il server registra da sé ogni chiamata in recipe_generation_events.
import { fetch as fetchExpo } from 'expo/fetch';
import { useSyncExternalStore } from 'react';

import { nuovoIdRichiesta } from '@/core/racconta/server';
import type { RicettaPronta } from '@/core/ricette/pannello';
import {
  campoPerServer,
  CARATTERI_MASSIMI_CAMPO,
  corpoIdee,
  corpoRicetta,
  erroreRicetteApp,
  interpretaRispostaIdee,
  interpretaRispostaRicetta,
  PERCORSO_IDEE,
  PERCORSO_RICETTA,
  TEMPO_MASSIMO_IDEE_MS,
  TEMPO_MASSIMO_RICETTA_MS,
  type EsitoIdee,
  type EsitoRicetta,
  type Idea,
  type Stima,
} from '@/core/ricette/server';
import { tokenAccesso, URL_AGENTI } from '@/servizi/agenti';

type Interprete<T> = (status: number, corpo: unknown, richiestaId: string | null) => T;

async function inviaRichiesta<T extends EsitoIdee | EsitoRicetta>(percorso: string, tempoMassimoMs: number, interpreta: Interprete<T>, token: string, corpo: string, richiestaId: string): Promise<T> {
  const controllo = new AbortController();
  const timer = setTimeout(() => controllo.abort(), tempoMassimoMs);
  try {
    const risposta = await fetchExpo(`${URL_AGENTI}${percorso}`, {
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
    return interpreta(risposta.status, json, idRisposta);
  } catch (e) {
    const nome = (e as { name?: string })?.name;
    return { tipo: 'errore', errore: erroreRicetteApp(nome === 'AbortError' ? 'tempo_scaduto' : 'rete', richiestaId) } as T;
  } finally {
    clearTimeout(timer);
  }
}

/** Con un token rifiutato (401) si rinnova la sessione e si ripete una volta. */
async function conRinnovoToken<T extends EsitoIdee | EsitoRicetta>(chiama: (token: string) => Promise<T>, richiestaId: string): Promise<T> {
  const token = await tokenAccesso();
  if (!token) return { tipo: 'errore', errore: erroreRicetteApp('sessione_assente', richiestaId) } as T;
  let esito = await chiama(token);
  if (esito.tipo === 'errore' && esito.errore.esito === 'sessione' && esito.errore.httpStatus === 401) {
    const nuovoToken = await tokenAccesso(true);
    if (nuovoToken) esito = await chiama(nuovoToken);
  }
  return esito;
}

/** Se il server giudica il testo troppo lungo nonostante il limite del campo, si accorcia alla metà e si ripete una volta. */
const FRAZIONE_ACCORCIATA = 0.5;
function campoAccorciato(campo: string): string {
  return Array.from(campoPerServer(campo) ?? '')
    .slice(0, Math.floor(CARATTERI_MASSIMI_CAMPO * FRAZIONE_ACCORCIATA))
    .join('');
}

/** "Trova idee": il pasto (id dal piano letto con get_my_current_nutrition_plan) e il testo del campo. Attesa massima 65 s. */
export async function trovaIdee(pastoId: string, campo: string): Promise<EsitoIdee> {
  const richiestaId = nuovoIdRichiesta();
  const invia = (token: string, testo: string) => inviaRichiesta(PERCORSO_IDEE, TEMPO_MASSIMO_IDEE_MS, interpretaRispostaIdee, token, JSON.stringify(corpoIdee(pastoId, testo)), richiestaId);
  let esito = await conRinnovoToken((token) => invia(token, campo), richiestaId);
  if (esito.tipo === 'errore' && esito.errore.esito === 'campoTroppoLungo') esito = await conRinnovoToken((token) => invia(token, campoAccorciato(campo)), richiestaId);
  return esito;
}

/** "Vedi la ricetta": identificativo, stima e idea rimandati tali e quali alla seconda chiamata. Attesa massima 95 s. */
export async function preparaRicetta(pastoId: string, richiestaIdServer: string, stima: Stima, idea: Idea, campo: string): Promise<EsitoRicetta> {
  const richiestaId = nuovoIdRichiesta();
  const invia = (token: string, testo: string) => inviaRichiesta(PERCORSO_RICETTA, TEMPO_MASSIMO_RICETTA_MS, interpretaRispostaRicetta, token, JSON.stringify(corpoRicetta(pastoId, richiestaIdServer, stima, idea, testo)), richiestaId);
  let esito = await conRinnovoToken((token) => invia(token, campo), richiestaId);
  if (esito.tipo === 'errore' && esito.errore.esito === 'campoTroppoLungo') esito = await conRinnovoToken((token) => invia(token, campoAccorciato(campo)), richiestaId);
  return esito;
}

// ---- Memoria della ricetta pronta (pagina 5.4 / 5.5, rotta /ricetta) -------------------------------------------------

let ricettaPronta: RicettaPronta | null = null;
const ascoltatori = new Set<() => void>();

function notifica(): void {
  for (const a of ascoltatori) a();
}
function iscriviti(a: () => void): () => void {
  ascoltatori.add(a);
  return () => {
    ascoltatori.delete(a);
  };
}

/** La ricetta appena preparata, letta dalla pagina senza richieste; null se non ce n'è una (la pagina torna al Piano). */
export function memoriaRicettaPronta(): RicettaPronta | null {
  return ricettaPronta;
}
export function useRicettaPronta(): RicettaPronta | null {
  return useSyncExternalStore(iscriviti, memoriaRicettaPronta);
}
export function impostaRicettaPronta(ricetta: RicettaPronta | null): void {
  ricettaPronta = ricetta;
  notifica();
}

/** All'uscita. */
export function svuotaRicette(): void {
  impostaRicettaPronta(null);
}
