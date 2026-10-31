// Richiesta di eliminazione dell'account (contratto eliminazione account v0.1 §2 e §4; server degli agenti
// docs/server-eliminazione-account.md): corpo della richiesta, lettura della risposta e traduzione dei codici d'errore
// stabili del server negli esiti che il pannello sa mostrare. Nessuna rete qui: chi chiama passa stato HTTP e corpo letti.

export const PERCORSO_ELIMINAZIONE = '/v1/account/eliminazione';
/** Il server risponde entro 25 s complessivi (504 oltre): l'app aspetta al massimo 30 s, poi mostra l'errore con "Riprova". */
export const TEMPO_MASSIMO_ELIMINAZIONE_MS = 30_000;
export const GIORNI_PER_ELIMINARE = 30;

export type PiattaformaRichiesta = 'android' | 'ios';
export type CorpoEliminazione = { password: string; versione_app: string | null; piattaforma: PiattaformaRichiesta };

export function corpoEliminazione(password: string, versioneApp: string | null, piattaforma: PiattaformaRichiesta): CorpoEliminazione {
  return { password, versione_app: versioneApp, piattaforma };
}

/**
 * Come l'app reagisce (contratto §2.5; tabella in docs/server-eliminazione-account.md §3):
 * - passwordErrata: si resta sul pannello con il messaggio sotto il campo;
 * - troppiTentativi: si resta sul pannello con il messaggio (5 password errate in 15 minuti, o limite di Supabase Auth);
 * - rete / riprovabile: nessuna risposta, servizio non disponibile, tempo scaduto → Notifica breve con "Riprova";
 * - sessione: accesso scaduto e non rinnovabile → messaggio sotto il campo "Esci e accedi di nuovo";
 * - nonDisponibile: cliente non trovato → messaggio sotto il campo (scrivere al supporto);
 * - definitivo: richiesta che il server non può accettare (errori di sviluppo) → messaggio sotto il campo.
 * La richiesta già registrata NON è un errore: è un esito positivo (stessa conferma, nessuna seconda richiesta).
 */
export type EsitoErroreEliminazione = 'passwordErrata' | 'troppiTentativi' | 'rete' | 'riprovabile' | 'sessione' | 'nonDisponibile' | 'definitivo';

export type ErroreEliminazione = {
  esito: EsitoErroreEliminazione;
  /** Codice stabile del server (o uno dell'app: `rete`, `tempo_scaduto`, `risposta_non_valida`, `sessione_assente`). */
  codice: string;
  messaggio: string;
  richiestaId: string | null;
  httpStatus: number | null;
};

export type EsitoEliminazione =
  | { tipo: 'registrata'; richiestaId: string | null; scadenza: string | null; giaRegistrata: false }
  | { tipo: 'registrata'; richiestaId: null; scadenza: null; giaRegistrata: true }
  | { tipo: 'errore'; errore: ErroreEliminazione };

const ESITO_PER_CODICE: Record<string, EsitoErroreEliminazione> = {
  token_mancante: 'sessione',
  token_non_valido: 'sessione',
  cliente_non_trovato: 'nonDisponibile',
  identita_non_verificabile: 'riprovabile',
  password_errata: 'passwordErrata',
  troppi_tentativi: 'troppiTentativi',
  servizio_non_disponibile: 'riprovabile',
  eliminazione_timeout: 'riprovabile',
  errore_interno: 'riprovabile',
};

function esitoPerStato(status: number): EsitoErroreEliminazione {
  if (status === 401) return 'sessione';
  if (status === 429) return 'troppiTentativi';
  if (status >= 500) return 'riprovabile';
  return 'definitivo';
}

/** Errori che nascono nell'app, prima di una risposta del server. */
export function erroreEliminazioneApp(codice: 'rete' | 'tempo_scaduto' | 'sessione_assente', richiestaId: string | null): ErroreEliminazione {
  const esito: EsitoErroreEliminazione = codice === 'rete' ? 'rete' : codice === 'tempo_scaduto' ? 'riprovabile' : 'sessione';
  const messaggio = codice === 'rete' ? 'Nessuna connessione' : codice === 'tempo_scaduto' ? 'Il server non ha risposto in tempo' : 'Sessione assente';
  return { esito, codice, messaggio, richiestaId, httpStatus: null };
}

function oggetto(d: unknown): Record<string, unknown> | null {
  return d !== null && typeof d === 'object' && !Array.isArray(d) ? (d as Record<string, unknown>) : null;
}
function testo(d: unknown): string | null {
  return typeof d === 'string' && d.trim() !== '' ? d.trim() : null;
}

/**
 * Esito dalla risposta HTTP (stato e corpo JSON già letto, o null se non era JSON). `409 gia_registrata` vale come
 * registrata (contratto §2.5: stessa conferma, nessuna seconda richiesta).
 */
export function interpretaRispostaEliminazione(status: number, corpo: unknown, richiestaId: string | null): EsitoEliminazione {
  const c = oggetto(corpo) ?? {};
  if (status >= 200 && status < 300) {
    if (c.esito !== 'registrata') {
      return { tipo: 'errore', errore: { esito: 'riprovabile', codice: 'risposta_non_valida', messaggio: 'Risposta del server non riconosciuta', richiestaId, httpStatus: status } };
    }
    return { tipo: 'registrata', richiestaId: testo(c.richiesta_id), scadenza: testo(c.scadenza), giaRegistrata: false };
  }
  const errore = oggetto(c.errore) ?? {};
  const codice = testo(errore.codice) ?? `http_${status}`;
  if (status === 409 && codice === 'gia_registrata') return { tipo: 'registrata', richiestaId: null, scadenza: null, giaRegistrata: true };
  const messaggio = testo(errore.messaggio) ?? 'Errore del server';
  return { tipo: 'errore', errore: { esito: ESITO_PER_CODICE[codice] ?? esitoPerStato(status), codice, messaggio, richiestaId, httpStatus: status } };
}

/** Messaggi del pannello e della Notifica breve per esito (testi del contratto §2.5). */
export const MESSAGGI_ELIMINAZIONE = {
  passwordErrata: 'La password non è corretta.',
  troppiTentativi: 'Hai fatto troppi tentativi. Aspetta qualche minuto e riprova.',
  rete: 'Sembra che tu sia offline. Controlla la connessione e riprova.',
  riprovabile: 'Non siamo riusciti a inviare la richiesta. Riprova tra poco.',
  sessione: 'La sessione è scaduta. Esci e accedi di nuovo per chiedere l’eliminazione.',
  nonDisponibile: 'Non riusciamo a riconoscere il tuo account. Scrivi a supporto@joinbalanced.it.',
  definitivo: 'Non siamo riusciti a inviare la richiesta. Se succede ancora, scrivi a supporto@joinbalanced.it.',
} as const;

/**
 * Dove mostrare l'errore: sotto il campo password (si resta sul pannello) oppure nella Notifica breve d'errore, che nel
 * design ha sempre "Riprova" (Trasversali): quindi solo rete e servizio non disponibile, dove ripetere ha senso.
 */
export type PresentazioneErrore = { dove: 'campo'; testo: string } | { dove: 'notifica'; testo: string };

export function presentaErrore(errore: ErroreEliminazione): PresentazioneErrore {
  switch (errore.esito) {
    case 'rete':
    case 'riprovabile':
      return { dove: 'notifica', testo: MESSAGGI_ELIMINAZIONE[errore.esito] };
    case 'passwordErrata':
    case 'troppiTentativi':
    case 'sessione':
    case 'nonDisponibile':
    case 'definitivo':
      return { dove: 'campo', testo: MESSAGGI_ELIMINAZIONE[errore.esito] };
  }
}
