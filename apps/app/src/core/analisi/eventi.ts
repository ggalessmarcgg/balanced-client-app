// Analisi dell'uso con PostHog in modalità anonima (step 4, lotto 2; decisioni di Alessandro del 2/11/2026): l'elenco
// CHIUSO degli eventi che l'app può misurare e, per ciascuno, le proprietà ammesse. Ogni proprietà è un valore preso da
// un elenco fisso, un booleano o un intero in un intervallo: mai testo libero, mai identificativi (di diari, piani,
// revisioni, clienti, nutrizioniste, telefoni), mai date, mai contenuti. Qui non c'è PostHog: `src/servizi/analisi.ts`
// è l'unico punto che lo importa e passa da `validaProprieta` prima di inviare qualunque cosa. Il documento che spiega
// ogni evento e la domanda di prodotto a cui risponde è `docs/piano-di-traccia.md`.
//
// Nomi stabili in italiano con i trattini bassi (`area_azione`): non cambiano al cambiare dei testi a schermo.
import type { Diario } from '../diario/modello.ts';

// ---- Valori ammessi ----------------------------------------------------------------------------------------------

export const SI_NO = ['si', 'no'] as const;
/** Dove si risponde al consenso alle funzioni AI. */
export const LUOGHI_CONSENSO = ['carosello', 'sostituzione', 'ricette', 'racconta', 'account'] as const;
export const ESITI_PERMESSO = ['concesso', 'negato', 'piu_tardi'] as const;
export const LUOGHI_PERMESSO = ['carosello', 'account'] as const;
/** Come è stato compilato il diario condiviso: a mano (Card diario di Oggi) o dal riepilogo del diario vocale. */
export const MODI_DIARIO = ['scritto', 'vocale'] as const;
/** Il passo del diario vocale in cui qualcosa è andato storto. */
export const PASSI_VOCALE = ['registrazione', 'trascrizione', 'compilazione'] as const;
/** Esiti del diario vocale: gli esiti d'errore del server (`EsitoErrore` in snake_case) più "non ho capito". */
export const ESITI_VOCALE = ['rete', 'riprovabile', 'sessione', 'non_disponibile', 'consenso_mancante', 'definitivo', 'non_capito'] as const;
/** Durata di una registrazione a fasce (limite 3 minuti); "sconosciuta" quando la registrazione non è nemmeno partita. */
export const FASCE_AUDIO = ['fino_a_30s', '30s_1min', '1_2min', '2_3min', 'sconosciuta'] as const;
/** Tempo di risposta di una chiamata a fasce. */
export const FASCE_TEMPO = ['fino_a_5s', '5_10s', '10_20s', '20_30s', '30_60s', 'oltre_60s'] as const;
export const TIPI_PIANO_APERTO = ['fisso', 'variabile', 'nessuno'] as const;
export const ESITI_SOSTITUZIONE = ['alternative', 'nessuna_alternativa', 'non_riconosciuto', 'errore'] as const;
export const ESITI_IDEE = ['idee', 'nessuna_idea', 'errore'] as const;
export const ORIGINI_RICETTA = ['nuova', 'salvata'] as const;
/** `notification_type` di client_notifications (contratto notifiche v0.2 §2); "altro" per i tipi non previsti. */
export const TIPI_NOTIFICA = ['nutritionist_comment', 'review_sent', 'review_unlocked', 'holiday_replacement', 'plan_sent', 'diary_reminder', 'measurement_update', 'weight_update', 'altro'] as const;
export const ORIGINI_NOTIFICA = ['sistema', 'campanella'] as const;
/** Le chiamate di rete di cui si misurano errori e attese: server degli agenti, funzione del piano, scritture del diario, avvio. */
export const FUNZIONI = ['avvio', 'diario_salva', 'diario_condividi', 'piano', 'trascrivi', 'compila', 'alternative', 'idee', 'ricetta'] as const;
/**
 * Codici d'errore ammessi: quelli dell'app (`rete`, `tempo_scaduto`, …), quelli stabili del server degli agenti
 * (docs/server-*.md) e due classi per gli stati HTTP senza codice; tutto il resto diventa "altro" (`codiceErrore`).
 */
export const CODICI_ERRORE = [
  'rete',
  'tempo_scaduto',
  'risposta_non_valida',
  'sessione_assente',
  'audio_assente',
  'diario_non_disponibile',
  'gia_condiviso',
  'token_mancante',
  'token_non_valido',
  'consenso_mancante',
  'consenso_non_verificabile',
  'cliente_non_trovato',
  'abbonamento_non_attivo',
  'identita_non_verificabile',
  'errore_interno',
  'trascrizione_fallita',
  'trascrizione_timeout',
  'compilazione_fallita',
  'compilazione_timeout',
  'audio_troppo_lungo',
  'audio_troppo_grande',
  'riga_non_disponibile',
  'in_casa_troppo_lungo',
  'sostituzione_fallita',
  'sostituzione_timeout',
  'catalogo_non_disponibile',
  'piano_non_leggibile',
  'pasto_non_disponibile',
  'campo_troppo_lungo',
  'stima_non_plausibile',
  'idea_non_ammessa',
  'ricetta_non_disponibile',
  'ricette_fallita',
  'ricette_timeout',
  'http_4xx',
  'http_5xx',
  'altro',
] as const;

// ---- Catalogo ----------------------------------------------------------------------------------------------------

/** Forma di una proprietà: elenco chiuso di stringhe, booleano, oppure intero in un intervallo. */
type FormaProprieta = readonly string[] | 'booleano' | { readonly intero: readonly [number, number] };
type FormaEvento = { readonly [proprieta: string]: FormaProprieta };

/** L'elenco chiuso: evento → proprietà → forma. Aggiungere qui (e in docs/piano-di-traccia.md) prima di misurare altro. */
export const CATALOGO = {
  // Ingresso
  /** All'avvio e a ogni ritorno in primo piano (`da_sfondo` vero). Sostituisce gli eventi del ciclo di vita dell'SDK. */
  app_aperta: { da_sfondo: 'booleano' },
  /** Il carosello del primo accesso è arrivato in fondo (per telefono, una volta). */
  carosello_completato: {},
  /** Risposta al consenso alle funzioni AI: "si" = granted scritto, "no" = revoked scritto o "Non ora". */
  consenso_ai: { risposta: SI_NO, dove: LUOGHI_CONSENSO },
  /** Risposta alla richiesta del permesso delle notifiche. */
  notifiche_permesso: { esito: ESITI_PERMESSO, dove: LUOGHI_PERMESSO },
  // Diario
  /** Bozza di oggi scritta sul server (al cambio di blocco, all'uscita, in secondo piano). */
  diario_bozza_salvata: { blocchi_compilati: { intero: [0, 4] } },
  /** Diario di oggi condiviso con la nutrizionista (la metrica principale). */
  diario_condiviso: { modo: MODI_DIARIO, blocchi_compilati: { intero: [0, 4] } },
  diario_vocale_avviato: {},
  /** Il diario è stato creato dal racconto (la bozza di oggi è aggiornata). */
  diario_vocale_completato: { durata_audio: FASCE_AUDIO },
  diario_vocale_fallito: { passo: PASSI_VOCALE, esito: ESITI_VOCALE, durata_audio: FASCE_AUDIO },
  // Piano
  /** Scheda Piano aperta, con il tipo di piano mostrato ("nessuno" = in elaborazione). */
  piano_aperto: { tipo: TIPI_PIANO_APERTO },
  /** "Trova alternative" con la risposta ricevuta; `in_casa` = il cliente aveva scritto qualcosa nel campo. */
  sostituzione_chiesta: { esito: ESITI_SOSTITUZIONE, tempo: FASCE_TEMPO, in_casa: 'booleano' },
  /** "Trova idee" con la risposta ricevuta. */
  ricette_idee: { esito: ESITI_IDEE, tempo: FASCE_TEMPO },
  /** Pagina della ricetta aperta: appena preparata ("nuova") o da "Le tue ricette" ("salvata"). */
  ricetta_aperta: { origine: ORIGINI_RICETTA },
  ricetta_salvata: {},
  // Revisioni
  revisione_aperta: {},
  /** Il piè di pagina "Hai letto tutta la revisione." è entrato nello schermo. */
  revisione_letta: {},
  // Notifiche
  /** Notifica toccata: dal sistema (banner, tendina, app chiusa) o dall'elenco della campanella. */
  notifica_aperta: { tipo: TIPI_NOTIFICA, origine: ORIGINI_NOTIFICA },
  // Errori e tempi
  /** Una chiamata di rete non è andata: codice stabile dell'app o del server, mai il messaggio. */
  errore_chiamata: { funzione: FUNZIONI, codice: CODICI_ERRORE },
  /** Una chiamata ha impiegato almeno 10 secondi (da quando il server mostra "Ancora qualche secondo…"). */
  attesa_lunga: { funzione: FUNZIONI, secondi: FASCE_TEMPO },
  /** Solo dalla pagina di sviluppo /sviluppo/monitoraggio: per verificare che gli eventi arrivino. */
  prova_analisi: {},
} as const satisfies Record<string, FormaEvento>;

export type NomeEvento = keyof typeof CATALOGO;
export const NOMI_EVENTI = Object.keys(CATALOGO) as NomeEvento[];

type ValoreDi<F> = F extends readonly (infer V)[] ? V : F extends 'booleano' ? boolean : F extends { intero: readonly [number, number] } ? number : never;
/** Le proprietà di un evento, con i tipi del catalogo: il compilatore rifiuta chiavi o valori fuori elenco. */
export type Proprieta<E extends NomeEvento> = { [K in keyof (typeof CATALOGO)[E]]: ValoreDi<(typeof CATALOGO)[E][K]> };
export type ValoreProprieta = string | number | boolean;

/** Regola dei nomi di eventi e proprietà: minuscole, cifre e trattini bassi, con una lettera all'inizio. */
export const RE_NOME = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/;
/** Regola dei valori degli elenchi: come i nomi, ma possono iniziare con una cifra (fasce come `5_10s`). */
export const RE_VALORE = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;

function valoreValido(forma: FormaProprieta, valore: unknown): valore is ValoreProprieta {
  if (forma === 'booleano') return typeof valore === 'boolean';
  if (Array.isArray(forma)) return typeof valore === 'string' && (forma as readonly string[]).includes(valore);
  const [min, max] = (forma as { intero: readonly [number, number] }).intero;
  return typeof valore === 'number' && Number.isInteger(valore) && valore >= min && valore <= max;
}

/**
 * Le proprietà come si possono inviare, oppure null se l'evento non è nel catalogo, manca una proprietà prevista, ce
 * n'è una in più o un valore è fuori forma. Nessuna correzione: un evento sbagliato non parte (in sviluppo si segnala).
 */
export function validaProprieta(evento: string, proprieta: unknown): Record<string, ValoreProprieta> | null {
  if (!Object.hasOwn(CATALOGO, evento)) return null;
  const forma: FormaEvento = CATALOGO[evento as NomeEvento];
  if (typeof proprieta !== 'object' || proprieta === null) return null;
  const date = proprieta as Record<string, unknown>;
  const chiaviPreviste = Object.keys(forma);
  const chiaviDate = Object.keys(date);
  if (chiaviDate.length !== chiaviPreviste.length) return null;
  const pulite: Record<string, ValoreProprieta> = {};
  for (const chiave of chiaviPreviste) {
    const f = forma[chiave];
    if (f === undefined || !Object.hasOwn(date, chiave)) return null;
    const valore = date[chiave];
    if (!valoreValido(f, valore)) return null;
    pulite[chiave] = valore;
  }
  return pulite;
}

/** Un evento in uscita nella forma minima che l'SDK passa a `before_send` (i tipi dell'SDK la estendono). */
export type EventoInUscita = {
  event: string;
  properties?: Record<string, unknown>;
  $set?: Record<string, unknown>;
  $set_once?: Record<string, unknown>;
};

/** Proprietà aggiunte dall'SDK che non servono e non si vogliono: nome leggibile del telefono e proprietà di persona. */
const PROPRIETA_SDK_DA_TOGLIERE = new Set(['$device_name', '$set', '$set_once', '$ip']);

/**
 * Ultimo controllo prima dell'invio (`before_send`): passa solo un evento del catalogo con le proprietà del catalogo;
 * delle proprietà aggiunte dall'SDK restano quelle tecniche (versione dell'app, sistema, lingua, fuso, sessione), via
 * nome del telefono e qualunque proprietà di persona. Un evento che non è nel catalogo si scarta.
 */
export function filtraEventoInUscita<E extends EventoInUscita>(evento: E): E | null {
  const forma = Object.hasOwn(CATALOGO, evento.event) ? (CATALOGO[evento.event as NomeEvento] as FormaEvento) : null;
  if (!forma) return null;
  const proprieta: Record<string, unknown> = {};
  for (const [chiave, valore] of Object.entries(evento.properties ?? {})) {
    if (PROPRIETA_SDK_DA_TOGLIERE.has(chiave)) continue;
    if (chiave.startsWith('$')) {
      proprieta[chiave] = valore;
      continue;
    }
    const f = forma[chiave];
    if (f !== undefined && valoreValido(f, valore)) proprieta[chiave] = valore;
  }
  const { $set: _set, $set_once: _setOnce, ...resto } = evento;
  return { ...resto, properties: proprieta } as E;
}

// ---- Fasce e conversioni -----------------------------------------------------------------------------------------

export type FasciaTempo = (typeof FASCE_TEMPO)[number];
export type FasciaAudio = (typeof FASCE_AUDIO)[number];
export type CodiceErrore = (typeof CODICI_ERRORE)[number];
export type TipoNotifica = (typeof TIPI_NOTIFICA)[number];
export type EsitoVocale = (typeof ESITI_VOCALE)[number];
export type Funzione = (typeof FUNZIONI)[number];
export type LuogoConsenso = (typeof LUOGHI_CONSENSO)[number];
export type ModoDiario = (typeof MODI_DIARIO)[number];

/** Soglia dell'attesa lunga: dal secondo 10 (la barra d'attesa delle ricette dice "Circa 10 secondi"). */
export const ATTESA_LUNGA_MS = 10_000;

export function fasciaTempo(ms: number): FasciaTempo {
  if (ms < 5_000) return 'fino_a_5s';
  if (ms < 10_000) return '5_10s';
  if (ms < 20_000) return '10_20s';
  if (ms < 30_000) return '20_30s';
  if (ms < 60_000) return '30_60s';
  return 'oltre_60s';
}

/** La fascia se la chiamata ha impiegato almeno 10 s, altrimenti null (nessun evento). */
export function fasciaAttesaLunga(ms: number): FasciaTempo | null {
  return ms >= ATTESA_LUNGA_MS ? fasciaTempo(ms) : null;
}

export function fasciaAudio(ms: number | null | undefined): FasciaAudio {
  if (typeof ms !== 'number' || !Number.isFinite(ms) || ms < 0) return 'sconosciuta';
  if (ms < 30_000) return 'fino_a_30s';
  if (ms < 60_000) return '30s_1min';
  if (ms < 120_000) return '1_2min';
  return '2_3min';
}

/** Un codice d'errore qualsiasi (app o server) ricondotto all'elenco chiuso. */
export function codiceErrore(codice: unknown): CodiceErrore {
  if (typeof codice !== 'string') return 'altro';
  if ((CODICI_ERRORE as readonly string[]).includes(codice)) return codice as CodiceErrore;
  const http = /^http_(\d)\d\d$/.exec(codice);
  if (http) return http[1] === '4' ? 'http_4xx' : http[1] === '5' ? 'http_5xx' : 'altro';
  return 'altro';
}

/** Il `notification_type` ricondotto all'elenco chiuso. */
export function tipoNotifica(tipo: unknown): TipoNotifica {
  return typeof tipo === 'string' && (TIPI_NOTIFICA as readonly string[]).includes(tipo) ? (tipo as TipoNotifica) : 'altro';
}

/** Gli esiti d'errore delle chiamate (camelCase nei moduli del server) nel nome stabile dell'evento. */
export function esitoVocale(esito: 'rete' | 'riprovabile' | 'sessione' | 'nonDisponibile' | 'consensoMancante' | 'definitivo'): EsitoVocale {
  switch (esito) {
    case 'nonDisponibile':
      return 'non_disponibile';
    case 'consensoMancante':
      return 'consenso_mancante';
    default:
      return esito;
  }
}

/** Quanti dei quattro blocchi del diario (pasti, valori, sport, commento) hanno almeno un valore. */
export function blocchiCompilati(d: Diario): number {
  const pasti = [d.breakfast, d.lunch, d.dinner, d.snacks].some((t) => t.trim() !== '');
  const valori = d.energy_level !== null || d.satiety_level !== null || d.hydration_level !== null;
  const sport = d.sport_type !== null || d.riposo;
  const commento = d.day_comment.trim() !== '';
  return [pasti, valori, sport, commento].filter(Boolean).length;
}

// ---- Attivazione -------------------------------------------------------------------------------------------------

/**
 * L'analisi è attiva solo con la chiave del progetto e, in sviluppo, solo con la variabile esplicita per le prove
 * (EXPO_PUBLIC_POSTHOG_IN_SVILUPPO=1): il progetto PostHog è uno solo e non va sporcato dal lavoro sul Mac.
 */
export function analisiAttiva(contesto: { sviluppo: boolean; chiave: string | undefined; provaInSviluppo: boolean }): boolean {
  const conChiave = typeof contesto.chiave === 'string' && contesto.chiave.length > 0;
  return conChiave && (!contesto.sviluppo || contesto.provaInSviluppo);
}
