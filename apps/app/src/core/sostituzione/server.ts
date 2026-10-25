// Chiamata "alternative" del server degli agenti dell'app (balanced-client-agents, docs/server-sostituzione.md §3):
// corpo della richiesta, lettura della risposta e traduzione dei codici d'errore stabili del server negli stati che il
// pannello sa mostrare (contratto di sostituzione v0.8 §3). Nessuna rete qui: chi chiama passa stato HTTP e corpo letti.

export const PERCORSO_ALTERNATIVE = '/v1/sostituzione/alternative';
/** Il server risponde entro 30 s complessivi (504 oltre): l'app aspetta al massimo 35 s, poi mostra l'errore con "Riprova". */
export const TEMPO_MASSIMO_SOSTITUZIONE_MS = 35_000;
/** Limite del server (e del campo) sul testo "Hai già qualcosa in casa?". */
export const CARATTERI_MASSIMI_IN_CASA = 200;

export type CorpoAlternative = { riga_id: string; in_casa: string | null };

/** Testo del campo pulito per il server: spazi ai lati tolti, vuoto → null, mai oltre i 200 caratteri. */
export function inCasaPerServer(testo: string): string | null {
  const pulito = testo.trim();
  if (pulito === '') return null;
  return Array.from(pulito).slice(0, CARATTERI_MASSIMI_IN_CASA).join('');
}

export function corpoAlternative(rigaId: string, inCasa: string): CorpoAlternative {
  return { riga_id: rigaId, in_casa: inCasaPerServer(inCasa) };
}

/** Un'alternativa come la mostra il pannello: `quantita` è il testo "nome · quantità" già composto dal server. */
export type Alternativa = { nome: string; quantita: string; aPiacere: boolean };
export type EsitoInCasa = 'inserita' | 'non_adatta' | 'non_riconosciuta';
export type VoceInCasa = { testo: string | null; esito: EsitoInCasa; motivo: string | null };

export type RispostaAlternative =
  | { esito: 'alternative'; alternative: Alternativa[]; spiegazione: string; inCasa: VoceInCasa[] }
  | { esito: 'nessuna_alternativa'; spiegazione: string | null }
  | { esito: 'non_riconosciuto' };

/**
 * Come l'app reagisce a un errore (tabella in docs/server-sostituzione.md §3):
 * - rete: nessuna risposta (offline) → pannello d'errore con "Riprova";
 * - riprovabile: timeout, sostituzione fallita, catalogo o piano non leggibili, errore interno → pannello d'errore con "Riprova";
 * - rigaNonDisponibile: la riga non è più nel piano corrente → chiudere il pannello, rileggere il piano, Notifica breve;
 * - inCasaTroppoLungo: il campo è limitato a 200 caratteri; se arriva, si accorcia e si ripete una volta;
 * - sessione: accesso scaduto e non rinnovabile (come il diario vocale);
 * - nonDisponibile: cliente non trovato o abbonamento non attivo (come il diario vocale);
 * - definitivo: richiesta che il server non può accettare (errori di sviluppo): pannello d'errore senza "Riprova".
 */
export type EsitoErroreSostituzione = 'rete' | 'riprovabile' | 'rigaNonDisponibile' | 'inCasaTroppoLungo' | 'sessione' | 'nonDisponibile' | 'definitivo';

export type ErroreSostituzione = {
  esito: EsitoErroreSostituzione;
  /** Codice stabile del server (o uno dell'app: `rete`, `tempo_scaduto`, `risposta_non_valida`, `sessione_assente`). */
  codice: string;
  messaggio: string;
  richiestaId: string | null;
  httpStatus: number | null;
};

export type EsitoSostituzione = { tipo: 'ok'; risposta: RispostaAlternative } | { tipo: 'errore'; errore: ErroreSostituzione };

const ESITO_PER_CODICE: Record<string, EsitoErroreSostituzione> = {
  token_mancante: 'sessione',
  token_non_valido: 'sessione',
  cliente_non_trovato: 'nonDisponibile',
  abbonamento_non_attivo: 'nonDisponibile',
  identita_non_verificabile: 'riprovabile',
  errore_interno: 'riprovabile',
  riga_non_disponibile: 'rigaNonDisponibile',
  in_casa_troppo_lungo: 'inCasaTroppoLungo',
  sostituzione_fallita: 'riprovabile',
  sostituzione_timeout: 'riprovabile',
  catalogo_non_disponibile: 'riprovabile',
  piano_non_leggibile: 'riprovabile',
};

function esitoPerStato(status: number): EsitoErroreSostituzione {
  if (status === 401) return 'sessione';
  if (status >= 500) return 'riprovabile';
  return 'definitivo';
}

/** Errori che nascono nell'app, prima di una risposta del server. */
export function erroreSostituzioneApp(codice: 'rete' | 'tempo_scaduto' | 'sessione_assente', richiestaId: string | null): ErroreSostituzione {
  const esito: EsitoErroreSostituzione = codice === 'rete' ? 'rete' : codice === 'tempo_scaduto' ? 'riprovabile' : 'sessione';
  const messaggio = codice === 'rete' ? 'Nessuna connessione' : codice === 'tempo_scaduto' ? 'Il server non ha risposto in tempo' : 'Sessione assente';
  return { esito, codice, messaggio, richiestaId, httpStatus: null };
}

function oggetto(d: unknown): Record<string, unknown> | null {
  return d !== null && typeof d === 'object' && !Array.isArray(d) ? (d as Record<string, unknown>) : null;
}
function testo(d: unknown): string | null {
  return typeof d === 'string' && d.trim() !== '' ? d.trim() : null;
}

const ESITI_IN_CASA: readonly string[] = ['inserita', 'non_adatta', 'non_riconosciuta'];

function leggiAlternativa(d: unknown): Alternativa | null {
  const o = oggetto(d);
  if (!o) return null;
  const nome = testo(o.nome);
  // Il testo da mostrare è `quantita` (contratto del server); senza, si ripiega sul nome.
  const quantita = testo(o.quantita) ?? nome;
  if (!quantita) return null;
  return { nome: nome ?? quantita, quantita, aPiacere: o.a_piacere === true };
}

function leggiVoceInCasa(d: unknown): VoceInCasa | null {
  const o = oggetto(d);
  if (!o) return null;
  const esito = typeof o.esito === 'string' && ESITI_IN_CASA.includes(o.esito) ? (o.esito as EsitoInCasa) : null;
  if (!esito) return null;
  return { testo: testo(o.testo) ?? testo(o.alimento) ?? testo(o.nome), esito, motivo: testo(o.motivo) };
}

function elenco<T>(d: unknown, leggi: (voce: unknown) => T | null): T[] {
  if (!Array.isArray(d)) return [];
  const voci: T[] = [];
  for (const v of d) {
    const letta = leggi(v);
    if (letta) voci.push(letta);
  }
  return voci;
}

function erroreRisposta(richiestaId: string | null, status: number): EsitoSostituzione {
  return { tipo: 'errore', errore: { esito: 'riprovabile', codice: 'risposta_non_valida', messaggio: 'Risposta del server non riconosciuta', richiestaId, httpStatus: status } };
}

/**
 * Esito dalla risposta HTTP (stato e corpo JSON già letto, o null se non era JSON). Un 200 con `alternative` vuoto e
 * esito "alternative" vale come nessuna alternativa (il cliente non deve vedere un pannello vuoto). L'indicazione
 * `fuori_catalogo` non si legge: l'app mostra tutte le alternative uguali (contratto §2.8).
 */
export function interpretaRispostaAlternative(status: number, corpo: unknown, richiestaId: string | null): EsitoSostituzione {
  const c = oggetto(corpo) ?? {};
  if (status >= 200 && status < 300) {
    switch (c.esito) {
      case 'alternative': {
        const alternative = elenco(c.alternative, leggiAlternativa).slice(0, 3);
        const spiegazione = testo(c.spiegazione) ?? '';
        if (alternative.length === 0) return { tipo: 'ok', risposta: { esito: 'nessuna_alternativa', spiegazione: spiegazione || null } };
        return { tipo: 'ok', risposta: { esito: 'alternative', alternative, spiegazione, inCasa: elenco(c.in_casa, leggiVoceInCasa) } };
      }
      case 'nessuna_alternativa':
        return { tipo: 'ok', risposta: { esito: 'nessuna_alternativa', spiegazione: testo(c.spiegazione) } };
      case 'non_riconosciuto':
        return { tipo: 'ok', risposta: { esito: 'non_riconosciuto' } };
      default:
        return erroreRisposta(richiestaId, status);
    }
  }
  const errore = oggetto(c.errore) ?? {};
  const codice = testo(errore.codice) ?? `http_${status}`;
  const messaggio = testo(errore.messaggio) ?? 'Errore del server';
  return { tipo: 'errore', errore: { esito: ESITO_PER_CODICE[codice] ?? esitoPerStato(status), codice, messaggio, richiestaId, httpStatus: status } };
}

export type Spiegazione = { primo: string; secondo: string | null };

/** Un motivo del server come frase: iniziale maiuscola e punto finale (il server li scrive in minuscolo, senza punto). */
export function frase(testo: string): string {
  const pulito = testo.trim();
  if (!pulito) return pulito;
  const conIniziale = pulito.charAt(0).toLocaleUpperCase('it-IT') + pulito.slice(1);
  return /[.!?…]$/.test(conIniziale) ? conIniziale : `${conIniziale}.`;
}

/**
 * I paragrafi della Card spiegazione AI (Figma 532:3440): il primo è la spiegazione del server; il secondo compare solo
 * se il cliente ha scritto qualcosa nel campo e raccoglie i motivi degli alimenti in casa non adatti (uno per frase,
 * senza ripetere quelli che la spiegazione contiene già parola per parola), ciascuno come frase (iniziale maiuscola,
 * punto finale). Una voce non riconosciuta senza motivo non aggiunge nulla.
 */
export function paragrafiSpiegazione(spiegazione: string, inCasa: VoceInCasa[], haScrittoInCasa: boolean): Spiegazione {
  const primo = spiegazione.trim();
  if (!haScrittoInCasa) return { primo, secondo: null };
  const motivi: string[] = [];
  for (const voce of inCasa) {
    if (voce.esito === 'inserita' || !voce.motivo) continue;
    const motivo = frase(voce.motivo);
    if (!motivo || motivi.includes(motivo) || primo.includes(motivo)) continue;
    motivi.push(motivo);
  }
  return { primo, secondo: motivi.length > 0 ? motivi.join(' ') : null };
}
