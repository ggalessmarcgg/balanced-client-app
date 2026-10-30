// Chiamata "trascrivi" del server degli agenti dell'app (balanced-client-agents, docs/server-diario-vocale.md §3):
// intestazioni della richiesta e lettura della risposta, con la traduzione dei codici d'errore stabili del server
// negli esiti che le schermate sanno mostrare. Nessuna rete qui: chi chiama passa stato HTTP e corpo già letti.
import { durataDichiarata, QUALITA_VOCE } from './audio.ts';

export const PERCORSO_TRASCRIVI = '/v1/diario-vocale/trascrivi';
/** Il server risponde alla trascrizione entro 45 s più il caricamento: oltre questo tempo la chiamata si interrompe. */
export const TEMPO_MASSIMO_TRASCRIZIONE_MS = 75_000;
const LUNGHEZZA_MASSIMA_ID = 64;

export type IntestazioniTrascrizione = {
  Authorization: string;
  'Content-Type': string;
  'X-Diary-Date': string;
  'X-Audio-Duration-Ms': string;
  'X-Request-Id': string;
};

export function intestazioniTrascrizione(token: string, data: string, durataMs: number, richiestaId: string): IntestazioniTrascrizione {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': QUALITA_VOCE.tipoMime,
    'X-Diary-Date': data,
    'X-Audio-Duration-Ms': String(durataDichiarata(durataMs)),
    'X-Request-Id': richiestaId.slice(0, LUNGHEZZA_MASSIMA_ID),
  };
}

/** Identificativo della richiesta (≤ 64 caratteri) da riportare nelle segnalazioni: istante più una parte casuale. */
export function nuovoIdRichiesta(adesso: Date = new Date(), casuale: number = Math.random()): string {
  return `app-${adesso.getTime().toString(36)}-${Math.floor(casuale * 0xffffffff).toString(16).padStart(8, '0')}`;
}

/**
 * Come l'app reagisce a un errore del server (tabella dei codici in docs/server-diario-vocale.md):
 * - rete: nessuna risposta (offline): l'audio resta sul telefono e si riprova da soli;
 * - riprovabile: il server o il fornitore non hanno risposto bene: schermata "Elaborazione non riuscita" con "Riprova";
 * - sessione: accesso scaduto e non rinnovabile: rifare l'accesso;
 * - nonDisponibile: percorso non attivo o cliente non trovato: la funzione non è disponibile;
 * - definitivo: richiesta che il server non può accettare (audio troppo lungo, formato, errore di sviluppo): si ricomincia.
 */
export type EsitoErrore = 'rete' | 'riprovabile' | 'sessione' | 'nonDisponibile' | 'consensoMancante' | 'definitivo';

export type ErroreTrascrizione = {
  esito: EsitoErrore;
  /** Codice stabile del server (o uno dell'app: `rete`, `tempo_scaduto`, `risposta_non_valida`, `sessione_assente`). */
  codice: string;
  messaggio: string;
  /** `x-request-id` della risposta, per le segnalazioni. */
  richiestaId: string | null;
  httpStatus: number | null;
};

export type EsitoTrascrizione = { tipo: 'ok'; testo: string; durataMs: number } | { tipo: 'errore'; errore: ErroreTrascrizione };

const ESITO_PER_CODICE: Record<string, EsitoErrore> = {
  token_mancante: 'sessione',
  token_non_valido: 'sessione',
  // Consenso alle funzioni AI (step 6, server-notifiche.md §8): l'app mostra il pannello del consenso e ripete.
  consenso_mancante: 'consensoMancante',
  consenso_non_verificabile: 'riprovabile',
  cliente_non_trovato: 'nonDisponibile',
  abbonamento_non_attivo: 'nonDisponibile',
  identita_non_verificabile: 'riprovabile',
  errore_interno: 'riprovabile',
  trascrizione_fallita: 'riprovabile',
  trascrizione_timeout: 'riprovabile',
};

function esitoPerStato(status: number): EsitoErrore {
  if (status === 401) return 'sessione';
  if (status >= 500) return 'riprovabile';
  return 'definitivo';
}

/** Errori che nascono nell'app, prima di una risposta del server. */
export function erroreApp(codice: 'rete' | 'tempo_scaduto' | 'sessione_assente' | 'audio_assente', richiestaId: string | null): ErroreTrascrizione {
  const esito: EsitoErrore = codice === 'rete' ? 'rete' : codice === 'tempo_scaduto' ? 'riprovabile' : codice === 'sessione_assente' ? 'sessione' : 'definitivo';
  const messaggio = codice === 'rete' ? 'Nessuna connessione' : codice === 'tempo_scaduto' ? 'Il server non ha risposto in tempo' : codice === 'sessione_assente' ? 'Sessione assente' : 'File audio non trovato';
  return { esito, codice, messaggio, richiestaId, httpStatus: null };
}

/**
 * Esito dalla risposta HTTP (stato e corpo JSON già letto, o null se non era JSON). Un 200 con `testo` vuoto è un
 * esito valido (silenzio: il server lo dice, l'app mostra comunque "Il tuo racconto").
 */
export function interpretaRispostaTrascrizione(status: number, corpo: unknown, richiestaId: string | null, durataDichiarataMs: number): EsitoTrascrizione {
  const c = (typeof corpo === 'object' && corpo !== null ? corpo : {}) as { testo?: unknown; durata_audio_ms?: unknown; errore?: { codice?: unknown; messaggio?: unknown } };
  if (status >= 200 && status < 300) {
    if (typeof c.testo !== 'string') {
      return { tipo: 'errore', errore: { esito: 'riprovabile', codice: 'risposta_non_valida', messaggio: 'Risposta del server non riconosciuta', richiestaId, httpStatus: status } };
    }
    const durata = typeof c.durata_audio_ms === 'number' && Number.isFinite(c.durata_audio_ms) && c.durata_audio_ms > 0 ? c.durata_audio_ms : durataDichiarataMs;
    return { tipo: 'ok', testo: c.testo, durataMs: durata };
  }
  const codice = typeof c.errore?.codice === 'string' && c.errore.codice ? c.errore.codice : `http_${status}`;
  const messaggio = typeof c.errore?.messaggio === 'string' && c.errore.messaggio ? c.errore.messaggio : 'Errore del server';
  return { tipo: 'errore', errore: { esito: ESITO_PER_CODICE[codice] ?? esitoPerStato(status), codice, messaggio, richiestaId, httpStatus: status } };
}

/** Testi delle schermate d'errore per esito (Messaggio in alto e corpo), con il riferimento per l'assistenza. */
export function testiErrore(errore: ErroreTrascrizione): { messaggio: string; corpo: string; riferimento: string | null } {
  const riferimento = errore.richiestaId ? `Riferimento: ${errore.richiestaId}` : null;
  switch (errore.esito) {
    case 'riprovabile':
      return { messaggio: 'Qualcosa non ha funzionato nel trascrivere il racconto. La registrazione è salvata.', corpo: 'La registrazione è al sicuro sul telefono. Riprova tra poco.', riferimento };
    case 'sessione':
      return { messaggio: 'La sessione è scaduta.', corpo: 'Esci e accedi di nuovo per raccontare la tua giornata. Nel frattempo puoi sempre scrivere il tuo diario.', riferimento };
    case 'nonDisponibile':
      return {
        messaggio: errore.codice === 'abbonamento_non_attivo' ? 'Il diario vocale è disponibile solo con il percorso attivo.' : 'Non riusciamo a riconoscere il tuo account.',
        corpo: errore.codice === 'abbonamento_non_attivo' ? 'Puoi sempre scrivere il tuo diario.' : 'Scrivi all’assistenza indicando il riferimento qui sotto. Nel frattempo puoi sempre scrivere il tuo diario.',
        riferimento,
      };
    case 'definitivo':
      return {
        messaggio: errore.codice === 'audio_troppo_lungo' || errore.codice === 'audio_troppo_grande' ? 'Il racconto è troppo lungo per essere trascritto.' : 'Non siamo riusciti a trascrivere il racconto.',
        corpo: errore.codice === 'audio_troppo_lungo' || errore.codice === 'audio_troppo_grande' ? 'Ricomincia e resta entro i 3 minuti.' : 'Ricomincia la registrazione. Se succede ancora, scrivi all’assistenza indicando il riferimento qui sotto.',
        riferimento,
      };
    case 'rete':
      return { messaggio: 'Sei offline: il tuo racconto è salvato e lo prepariamo appena torni online.', corpo: 'La registrazione è al sicuro sul telefono. Il testo comparirà appena torni online.', riferimento: null };
    case 'consensoMancante':
      // Di norma non si vede: la schermata mostra il pannello del consenso e, dopo "Accetto", ripete la trascrizione.
      return { messaggio: 'Serve il tuo consenso alle funzioni con intelligenza artificiale.', corpo: 'La registrazione è al sicuro sul telefono. Accetta e riprova.', riferimento };
  }
}
