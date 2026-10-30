// Chiamate "idee" e "ricetta" del server degli agenti (balanced-client-agents, docs/server-ricette.md §3 e §4):
// corpi delle richieste, lettura delle risposte e traduzione dei codici d'errore stabili del server negli stati che
// il pannello sa mostrare (contratto ricette v0.2 §5). Nessuna rete qui: chi chiama passa stato HTTP e corpo letti.

export const PERCORSO_IDEE = '/v1/ricette/idee';
export const PERCORSO_RICETTA = '/v1/ricette/ricetta';
/** Il server risponde alle idee entro 60 s (504 oltre): l'app aspetta al massimo 65 s. */
export const TEMPO_MASSIMO_IDEE_MS = 65_000;
/** La ricetta arriva entro 90 s (504 oltre): l'app aspetta al massimo 95 s, poi mostra l'errore con "Riprova". */
export const TEMPO_MASSIMO_RICETTA_MS = 95_000;
/** Limite del server (e del campo) sul testo "Ingredienti o pietanza di partenza". */
export const CARATTERI_MASSIMI_CAMPO = 200;

/** Testo del campo pulito per il server: spazi ai lati tolti, vuoto → null, mai oltre i 200 caratteri. */
export function campoPerServer(testo: string): string | null {
  const pulito = testo.trim();
  if (pulito === '') return null;
  return Array.from(pulito).slice(0, CARATTERI_MASSIMI_CAMPO).join('');
}

/** Un'idea come arriva dal server: titolo e descrizione si mostrano; tipo, allergeni e regime si rimandano tali e quali. */
export type Idea = { titolo: string; descrizione: string; tipo: 'individuale' | 'piu_porzioni'; allergeni: string[]; regime: string | null };
/** La stima dell'apporto del pasto: dato interno, mai mostrato, rimandato tale e quale alla seconda chiamata. */
export type Stima = { kcal: number; carboidrati: number | null; proteine: number | null; grassi: number | null; fonte: string };

export type CorpoIdee = { pasto_id: string; campo: string | null };
export type CorpoRicetta = { pasto_id: string; richiesta_id: string; stima: Stima; idea: Idea; campo: string | null };

export function corpoIdee(pastoId: string, campo: string): CorpoIdee {
  return { pasto_id: pastoId, campo: campoPerServer(campo) };
}

export function corpoRicetta(pastoId: string, richiestaId: string, stima: Stima, idea: Idea, campo: string): CorpoRicetta {
  return { pasto_id: pastoId, richiesta_id: richiestaId, stima, idea, campo: campoPerServer(campo) };
}

export type RispostaIdee =
  | { esito: 'idee'; richiestaId: string; stima: Stima; idee: Idea[]; fraseIngredienti: string | null; versioneIstruzioni: string | null }
  | { esito: 'nessuna_idea' };

export type Ingrediente = { nome: string; quantita: string | null };
export type Porzioni = { numero: number | null; laTuaPorzione: string | null };
/** La ricetta letta per la pagina; `grezza` è l'oggetto `ricetta` così come ricevuto, da salvare tale e quale. */
export type Ricetta = {
  titolo: string;
  tempoMinuti: number | null;
  riposoMinuti: number | null;
  tipo: 'individuale' | 'piu_porzioni';
  ingredienti: Ingrediente[];
  porzioni: Porzioni | null;
  preparazione: string[];
  spiegazione: string | null;
  grezza: Record<string, unknown>;
};

export type RispostaRicetta = { esito: 'ricetta'; richiestaId: string | null; ricetta: Ricetta; versioneIstruzioni: string | null };

/**
 * Come l'app reagisce a un errore (tabella in docs/server-ricette.md §5):
 * - rete: nessuna risposta (offline) → 5.8 con "Riprova";
 * - riprovabile: timeout, ricetta non disponibile, ricette fallite, catalogo o piano non leggibili, errore interno → 5.8 con "Riprova";
 * - pastoNonDisponibile: il pasto non è più nel piano corrente → chiudere il pannello, rileggere il piano, Notifica breve;
 * - campoTroppoLungo: il campo è limitato a 200 caratteri; se arriva, si accorcia e si ripete una volta;
 * - ripetiIdee: stima non plausibile o idea non ammessa alla seconda chiamata → si torna alla ricerca delle idee;
 * - sessione: accesso scaduto e non rinnovabile (come il diario vocale);
 * - nonDisponibile: cliente non trovato o abbonamento non attivo (come il diario vocale);
 * - definitivo: richiesta che il server non può accettare (errori di sviluppo): 5.8 senza "Riprova".
 */
export type EsitoErroreRicette = 'rete' | 'riprovabile' | 'pastoNonDisponibile' | 'campoTroppoLungo' | 'ripetiIdee' | 'sessione' | 'nonDisponibile' | 'consensoMancante' | 'definitivo';

export type ErroreRicette = {
  esito: EsitoErroreRicette;
  /** Codice stabile del server (o uno dell'app: `rete`, `tempo_scaduto`, `risposta_non_valida`, `sessione_assente`). */
  codice: string;
  messaggio: string;
  richiestaId: string | null;
  httpStatus: number | null;
};

export type EsitoIdee = { tipo: 'ok'; risposta: RispostaIdee } | { tipo: 'errore'; errore: ErroreRicette };
export type EsitoRicetta = { tipo: 'ok'; risposta: RispostaRicetta } | { tipo: 'errore'; errore: ErroreRicette };

const ESITO_PER_CODICE: Record<string, EsitoErroreRicette> = {
  token_mancante: 'sessione',
  token_non_valido: 'sessione',
  // Consenso alle funzioni AI (step 6, server-notifiche.md §8): senza consenso il pannello del consenso, poi si ripete.
  consenso_mancante: 'consensoMancante',
  consenso_non_verificabile: 'riprovabile',
  cliente_non_trovato: 'nonDisponibile',
  abbonamento_non_attivo: 'nonDisponibile',
  identita_non_verificabile: 'riprovabile',
  errore_interno: 'riprovabile',
  pasto_non_disponibile: 'pastoNonDisponibile',
  campo_troppo_lungo: 'campoTroppoLungo',
  stima_non_plausibile: 'ripetiIdee',
  idea_non_ammessa: 'ripetiIdee',
  ricetta_non_disponibile: 'riprovabile',
  ricette_fallita: 'riprovabile',
  ricette_timeout: 'riprovabile',
  catalogo_non_disponibile: 'riprovabile',
  piano_non_leggibile: 'riprovabile',
};

function esitoPerStato(status: number): EsitoErroreRicette {
  if (status === 401) return 'sessione';
  if (status >= 500) return 'riprovabile';
  return 'definitivo';
}

/** Errori che nascono nell'app, prima di una risposta del server. */
export function erroreRicetteApp(codice: 'rete' | 'tempo_scaduto' | 'sessione_assente', richiestaId: string | null): ErroreRicette {
  const esito: EsitoErroreRicette = codice === 'rete' ? 'rete' : codice === 'tempo_scaduto' ? 'riprovabile' : 'sessione';
  const messaggio = codice === 'rete' ? 'Nessuna connessione' : codice === 'tempo_scaduto' ? 'Il server non ha risposto in tempo' : 'Sessione assente';
  return { esito, codice, messaggio, richiestaId, httpStatus: null };
}

function oggetto(d: unknown): Record<string, unknown> | null {
  return d !== null && typeof d === 'object' && !Array.isArray(d) ? (d as Record<string, unknown>) : null;
}
function testo(d: unknown): string | null {
  return typeof d === 'string' && d.trim() !== '' ? d.trim() : null;
}
function numero(d: unknown): number | null {
  return typeof d === 'number' && Number.isFinite(d) ? d : null;
}
function interoPositivo(d: unknown): number | null {
  const n = numero(d);
  return n !== null && n > 0 ? Math.round(n) : null;
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
function elencoTesti(d: unknown): string[] {
  return elenco(d, testo);
}
const TIPI_IDEA: readonly string[] = ['individuale', 'piu_porzioni'];
function tipoIdea(d: unknown): Idea['tipo'] {
  return typeof d === 'string' && TIPI_IDEA.includes(d) ? (d as Idea['tipo']) : 'individuale';
}

function leggiIdea(d: unknown): Idea | null {
  const o = oggetto(d);
  if (!o) return null;
  const titolo = testo(o.titolo);
  if (!titolo) return null;
  return { titolo, descrizione: testo(o.descrizione) ?? '', tipo: tipoIdea(o.tipo), allergeni: elencoTesti(o.allergeni), regime: testo(o.regime) };
}

/** La stima si rimanda tale e quale: basta che abbia kcal e fonte (il server la ricontrolla da sé). */
function leggiStima(d: unknown): Stima | null {
  const o = oggetto(d);
  if (!o) return null;
  const kcal = numero(o.kcal);
  const fonte = testo(o.fonte);
  if (kcal === null || !fonte) return null;
  return { kcal, carboidrati: numero(o.carboidrati), proteine: numero(o.proteine), grassi: numero(o.grassi), fonte };
}

function leggiIngrediente(d: unknown): Ingrediente | null {
  const o = oggetto(d);
  if (!o) return null;
  const nome = testo(o.nome);
  if (!nome) return null;
  return { nome, quantita: testo(o.quantita) };
}

function leggiPorzioni(d: unknown): Porzioni | null {
  const o = oggetto(d);
  if (!o) return null;
  const numeroPorzioni = interoPositivo(o.numero);
  const laTuaPorzione = testo(o.la_tua_porzione);
  if (numeroPorzioni === null && !laTuaPorzione) return null;
  return { numero: numeroPorzioni, laTuaPorzione };
}

/** La ricetta della risposta; null se manca il titolo o non ha né ingredienti né preparazione (niente da mostrare). */
export function leggiRicetta(d: unknown): Ricetta | null {
  const o = oggetto(d);
  if (!o) return null;
  const titolo = testo(o.titolo);
  if (!titolo) return null;
  const ingredienti = elenco(o.ingredienti, leggiIngrediente);
  const preparazione = elencoTesti(o.preparazione);
  if (ingredienti.length === 0 && preparazione.length === 0) return null;
  return {
    titolo,
    tempoMinuti: interoPositivo(o.tempo_minuti),
    riposoMinuti: interoPositivo(o.riposo_minuti),
    tipo: tipoIdea(o.tipo),
    ingredienti,
    porzioni: leggiPorzioni(o.porzioni),
    preparazione,
    spiegazione: testo(o.spiegazione),
    grezza: o,
  };
}

function erroreRisposta<T extends EsitoIdee | EsitoRicetta>(richiestaId: string | null, status: number): T {
  return { tipo: 'errore', errore: { esito: 'riprovabile', codice: 'risposta_non_valida', messaggio: 'Risposta del server non riconosciuta', richiestaId, httpStatus: status } } as T;
}

function erroreDelServer<T extends EsitoIdee | EsitoRicetta>(c: Record<string, unknown>, status: number, richiestaId: string | null): T {
  const errore = oggetto(c.errore) ?? {};
  const codice = testo(errore.codice) ?? `http_${status}`;
  const messaggio = testo(errore.messaggio) ?? 'Errore del server';
  return { tipo: 'errore', errore: { esito: ESITO_PER_CODICE[codice] ?? esitoPerStato(status), codice, messaggio, richiestaId, httpStatus: status } } as T;
}

/**
 * Esito della prima chiamata dalla risposta HTTP (stato e corpo JSON già letto, o null se non era JSON). Un 200 con
 * `idee` vuoto vale come nessuna idea (il cliente non deve vedere un pannello vuoto); al massimo tre idee; senza
 * `richiesta_id` o `stima` validi la seconda chiamata non potrebbe partire: errore riprovabile.
 */
export function interpretaRispostaIdee(status: number, corpo: unknown, richiestaId: string | null): EsitoIdee {
  const c = oggetto(corpo) ?? {};
  if (status >= 200 && status < 300) {
    switch (c.esito) {
      case 'idee': {
        const idee = elenco(c.idee, leggiIdea).slice(0, 3);
        if (idee.length === 0) return { tipo: 'ok', risposta: { esito: 'nessuna_idea' } };
        const id = testo(c.richiesta_id);
        const stima = leggiStima(c.stima);
        if (!id || !stima) return erroreRisposta(richiestaId, status);
        return { tipo: 'ok', risposta: { esito: 'idee', richiestaId: id, stima, idee, fraseIngredienti: testo(c.frase_ingredienti), versioneIstruzioni: testo(c.versione_istruzioni) } };
      }
      case 'nessuna_idea':
        return { tipo: 'ok', risposta: { esito: 'nessuna_idea' } };
      default:
        return erroreRisposta(richiestaId, status);
    }
  }
  return erroreDelServer(c, status, richiestaId);
}

/** Esito della seconda chiamata: la ricetta letta, oppure un errore riprovabile se la forma non è quella del contratto. */
export function interpretaRispostaRicetta(status: number, corpo: unknown, richiestaId: string | null): EsitoRicetta {
  const c = oggetto(corpo) ?? {};
  if (status >= 200 && status < 300) {
    if (c.esito !== 'ricetta') return erroreRisposta(richiestaId, status);
    const ricetta = leggiRicetta(c.ricetta);
    if (!ricetta) return erroreRisposta(richiestaId, status);
    return { tipo: 'ok', risposta: { esito: 'ricetta', richiestaId: testo(c.richiesta_id), ricetta, versioneIstruzioni: testo(c.versione_istruzioni) } };
  }
  return erroreDelServer(c, status, richiestaId);
}
