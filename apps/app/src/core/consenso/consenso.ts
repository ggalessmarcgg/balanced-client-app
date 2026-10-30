// Consenso alle funzioni AI (step 6, contratto notifiche v0.2 §8; tabella client_consents, migrazione 20261029224353
// del repo degli agenti): storico in sola aggiunta, una riga per azione; il consenso è valido se l'ultima riga del
// cliente per il tipo è "granted". Vale su tutti i telefoni. Logica pura: le chiamate stanno in servizi/consenso.ts.

export const TABELLA_CONSENSI = 'client_consents';
export const TIPO_CONSENSO_AI = 'ai_features';
/** Versione del testo mostrato (carosello pagina 4 e pannello al primo uso, testi di Alessandro del 30/10/2026). */
export const VERSIONE_TESTO_AI = 'v1';
/** Colonne lette per conoscere l'ultima riga (mai select *). */
export const SELEZIONE_CONSENSO = ['id', 'action', 'text_version', 'created_at'].join(',');

export type AzioneConsenso = 'granted' | 'revoked';
export type RigaConsenso = { id: string; action: AzioneConsenso; text_version: string; created_at: string };

/** Valido se l'ultima riga è "granted" (nessuna riga o "revoked" → non valido). */
export function consensoValido(ultima: RigaConsenso | null): boolean {
  return ultima?.action === 'granted';
}

/** Riga da inserire ("Accetto" → granted, interruttore spento → revoked) con versione del testo, dell'app e piattaforma. */
export function rigaConsenso(action: AzioneConsenso, clientId: string, userId: string, appVersion: string | null, platform: 'android' | 'ios'): Record<string, unknown> {
  return { client_id: clientId, user_id: userId, kind: TIPO_CONSENSO_AI, action, text_version: VERSIONE_TESTO_AI, app_version: appVersion, platform };
}

/** Funzioni che chiedono il consenso al primo uso (pannello 831:8486) con il testo adattato. */
export type FunzioneAI = 'sostituzione' | 'ricette' | 'racconta';

/** Testi del contratto §8 (carosello) e del pannello al primo uso (Figma 831:8486, "Prima di iniziare"). */
export const TESTI_CONSENSO = {
  carosello: {
    nota: 'Per farlo alcuni tuoi dati e informazioni sono elaborati da servizi di AI esterni. ',
    informativa: 'Informativa',
    accetto: 'Accetto',
    nonOra: 'Non ora',
  },
  pannello: {
    titolo: 'Prima di iniziare',
    informativa: 'Informativa',
    accetto: 'Accetto',
    nonOra: 'Non ora',
    testo: {
      sostituzione: 'Per proporti le alternative, il tuo piano e le tue allergie vengono elaborati da servizi di AI esterni.',
      ricette: 'Per proporti le ricette, il tuo piano e le tue allergie vengono elaborati da servizi di AI esterni.',
      racconta: 'Per creare il diario dal tuo racconto, l’audio viene trascritto e il testo elaborato da servizi di AI esterni. L’audio non viene conservato.',
    } satisfies Record<FunzioneAI, string>,
    /** Testata (Etichetta AI) e titolo del pannello per funzione. */
    testata: { sostituzione: 'Sostituisci', ricette: 'Ricetta', racconta: 'Racconta' } satisfies Record<FunzioneAI, string>,
  },
  /** Interruttore in Account → Privacy e dati (Figma 831:8330). */
  interruttore: 'Funzioni con intelligenza artificiale',
} as const;

/** Consenso dentro un pannello del Piano (Sostituisci, Ricetta): quando è richiesto il pannello mostra la card al posto del contenuto. */
export type ConsensoPannello = { richiesto: boolean; inCorso: boolean; accetta: () => void; nonOra: () => void; informativa: () => void };

/** Codice del server quando manca il consenso (server §8): l'app mostra il pannello e, dopo "Accetto", ripete la chiamata. */
export const CODICE_CONSENSO_MANCANTE = 'consenso_mancante';
export const CODICE_CONSENSO_NON_VERIFICABILE = 'consenso_non_verificabile';
