// Chiamata "compila" del server degli agenti dell'app (balanced-client-agents, docs/server-diario-vocale.md §4): corpo
// della richiesta con il racconto e la bozza di oggi nel formato del server, lettura della risposta e traduzione dei
// codici d'errore negli esiti delle schermate. Il diario restituito è già fuso con la bozza (regola 5 del contratto):
// qui si traduce soltanto nel modello dell'app, senza fondere di nuovo. Nessuna rete qui.
import { durataSportValida, tipoSportValido, DURATE_SPORT, type Diario, type DurataSport, type TipoSport } from '../diario/modello.ts';
import type { EsitoErrore, ErroreTrascrizione } from './server.ts';

export const PERCORSO_COMPILA = '/v1/diario-vocale/compila';
/**
 * Il server risponde entro 60 s per tentativo (in media 5 s, punte di 10 s; con una ripetizione per risposta fuori forma
 * si raddoppia): oltre questo tempo la chiamata si interrompe e compare "Elaborazione non riuscita" con "Riprova".
 */
export const TEMPO_MASSIMO_COMPILAZIONE_MS = 75_000;
/** Limite del server sul testo del racconto. */
export const CARATTERI_MASSIMI_RACCONTO = 10_000;

/** Sport nel formato del server: uguale a quello del database tranne "corpo_libero" (nel database "corpo-libero"). */
type SportServer = 'camminata' | 'corsa' | 'pesi' | 'bici' | 'nuoto' | 'corpo_libero' | 'danza' | 'altro';

/** La bozza di oggi come la vuole il server (campi facoltativi, vuoti = null). */
export type BozzaServer = {
  colazione: string | null;
  pranzo: string | null;
  cena: string | null;
  spuntini: string | null;
  commento: string | null;
  energia: number | null;
  sazieta: number | null;
  idratazione: number | null;
  sport_tipo: SportServer | null;
  sport_durata: DurataSport | null;
  riposo: boolean;
};

export type CorpoCompilazione = { data: string; racconto: string; bozza: BozzaServer | null };

function testo(valore: string): string | null {
  const pulito = valore.trim();
  return pulito === '' ? null : pulito;
}

function sportPerServer(tipo: TipoSport | null): SportServer | null {
  if (!tipo) return null;
  return tipo === 'corpo-libero' ? 'corpo_libero' : tipo;
}

function sportDalServer(valore: unknown): TipoSport | null {
  if (valore === 'corpo_libero') return 'corpo-libero';
  return typeof valore === 'string' && tipoSportValido(valore) ? valore : null;
}

/**
 * La bozza di oggi per il server, dal diario in memoria (con "oggi riposo", che nel database non esiste): lo sport
 * scelto senza durata si manda lo stesso (il server lo tiene e il cliente completa la durata nel riepilogo); la durata
 * storica "<20m" non è tra quelle del server e si manda vuota. Una bozza senza nulla vale null.
 */
export function bozzaPerServer(diario: Diario): BozzaServer | null {
  const riposo = diario.riposo;
  const durata = !riposo && diario.sport_duration && (DURATE_SPORT as readonly string[]).includes(diario.sport_duration) ? (diario.sport_duration as DurataSport) : null;
  const bozza: BozzaServer = {
    colazione: testo(diario.breakfast),
    pranzo: testo(diario.lunch),
    cena: testo(diario.dinner),
    spuntini: testo(diario.snacks),
    commento: testo(diario.day_comment),
    energia: diario.energy_level,
    sazieta: diario.satiety_level,
    idratazione: diario.hydration_level,
    sport_tipo: riposo ? null : sportPerServer(diario.sport_type),
    sport_durata: durata,
    riposo,
  };
  const vuota = Object.entries(bozza).every(([campo, v]) => (campo === 'riposo' ? v === false : v === null));
  return vuota ? null : bozza;
}

export function corpoCompilazione(data: string, racconto: string, diario: Diario | null): CorpoCompilazione {
  return { data, racconto: racconto.slice(0, CARATTERI_MASSIMI_RACCONTO), bozza: diario ? bozzaPerServer(diario) : null };
}

function testoDalServer(valore: unknown): string {
  return typeof valore === 'string' ? valore.trim() : '';
}

function intero(valore: unknown, min: number, max: number): number | null {
  return typeof valore === 'number' && Number.isInteger(valore) && valore >= min && valore <= max ? valore : null;
}

/**
 * Il diario restituito dal server nel modello dell'app. Valori fuori formato → vuoti (mai un valore che CRM e trigger
 * non conoscono); con "riposo" lo sport resta vuoto; una durata senza tipo si tiene (il cliente sceglie il tipo nel
 * riepilogo, e finché manca nel database vanno entrambi null).
 */
export function diarioDalServer(grezzo: unknown): Diario | null {
  if (typeof grezzo !== 'object' || grezzo === null || Array.isArray(grezzo)) return null;
  const d = grezzo as Record<string, unknown>;
  const riposo = d.riposo === true;
  const durata = typeof d.sport_durata === 'string' && durataSportValida(d.sport_durata) && d.sport_durata !== '<20m' ? (d.sport_durata as DurataSport) : null;
  return {
    breakfast: testoDalServer(d.colazione),
    lunch: testoDalServer(d.pranzo),
    dinner: testoDalServer(d.cena),
    snacks: testoDalServer(d.spuntini),
    day_comment: testoDalServer(d.commento),
    energy_level: intero(d.energia, 1, 4) as Diario['energy_level'],
    satiety_level: intero(d.sazieta, 1, 10),
    hydration_level: intero(d.idratazione, 1, 4) as Diario['hydration_level'],
    sport_type: riposo ? null : sportDalServer(d.sport_tipo),
    sport_duration: riposo ? null : durata,
    riposo,
  };
}

export type EsitoCompilazione = { tipo: 'diario'; diario: Diario } | { tipo: 'nonHoCapito' } | { tipo: 'errore'; errore: ErroreTrascrizione };

const ESITO_PER_CODICE: Record<string, EsitoErrore> = {
  token_mancante: 'sessione',
  token_non_valido: 'sessione',
  cliente_non_trovato: 'nonDisponibile',
  abbonamento_non_attivo: 'nonDisponibile',
  identita_non_verificabile: 'riprovabile',
  errore_interno: 'riprovabile',
  compilazione_fallita: 'riprovabile',
  compilazione_timeout: 'riprovabile',
};

/** Esito dalla risposta HTTP (stato e corpo JSON già letto, o null). */
export function interpretaRispostaCompilazione(status: number, corpo: unknown, richiestaId: string | null): EsitoCompilazione {
  const c = (typeof corpo === 'object' && corpo !== null ? corpo : {}) as { esito?: unknown; diario?: unknown; errore?: { codice?: unknown; messaggio?: unknown } };
  if (status >= 200 && status < 300) {
    if (c.esito === 'non_ho_capito') return { tipo: 'nonHoCapito' };
    const diario = c.esito === 'diario' ? diarioDalServer(c.diario) : null;
    if (diario) return { tipo: 'diario', diario };
    return { tipo: 'errore', errore: { esito: 'riprovabile', codice: 'risposta_non_valida', messaggio: 'Risposta del server non riconosciuta', richiestaId, httpStatus: status } };
  }
  const codice = typeof c.errore?.codice === 'string' && c.errore.codice ? c.errore.codice : `http_${status}`;
  const messaggio = typeof c.errore?.messaggio === 'string' && c.errore.messaggio ? c.errore.messaggio : 'Errore del server';
  const esito: EsitoErrore = ESITO_PER_CODICE[codice] ?? (status === 401 ? 'sessione' : status >= 500 ? 'riprovabile' : 'definitivo');
  return { tipo: 'errore', errore: { esito, codice, messaggio, richiestaId, httpStatus: status } };
}

/** Errori della compilazione nati nell'app (prima o al posto di una risposta del server). */
export function erroreCompilazioneApp(codice: 'rete' | 'tempo_scaduto' | 'sessione_assente' | 'diario_non_disponibile' | 'gia_condiviso', richiestaId: string | null): ErroreTrascrizione {
  const esiti: Record<typeof codice, EsitoErrore> = { rete: 'rete', tempo_scaduto: 'riprovabile', sessione_assente: 'sessione', diario_non_disponibile: 'riprovabile', gia_condiviso: 'definitivo' };
  const messaggi: Record<typeof codice, string> = {
    rete: 'Nessuna connessione',
    tempo_scaduto: 'Il server non ha risposto in tempo',
    sessione_assente: 'Sessione assente',
    diario_non_disponibile: 'Diario di oggi non ancora letto',
    gia_condiviso: 'La giornata è già stata condivisa',
  };
  return { esito: esiti[codice], codice, messaggio: messaggi[codice], richiestaId, httpStatus: null };
}

/**
 * Testi della schermata 12 "Elaborazione non riuscita" (Figma 459:1712) e varianti senza disegno: il racconto resta
 * salvato e, quando ha senso, c'è "Riprova".
 */
export function testiErroreCompilazione(errore: ErroreTrascrizione): { messaggio: string; corpo: string | null; riprova: boolean; riferimento: string | null } {
  const riferimento = errore.richiestaId ? `Riferimento: ${errore.richiestaId}` : null;
  switch (errore.esito) {
    case 'riprovabile':
      return { messaggio: 'Qualcosa non ha funzionato nel preparare il diario. Il tuo racconto è salvato.', corpo: null, riprova: true, riferimento };
    case 'rete':
      return { messaggio: 'Sei offline: il tuo racconto è salvato. Riprova appena torni online.', corpo: null, riprova: true, riferimento: null };
    case 'sessione':
      return { messaggio: 'La sessione è scaduta.', corpo: 'Esci e accedi di nuovo per creare il diario dal racconto. Nel frattempo puoi sempre scrivere il tuo diario.', riprova: false, riferimento };
    case 'nonDisponibile':
      return {
        messaggio: errore.codice === 'abbonamento_non_attivo' ? 'Il diario vocale è disponibile solo con il percorso attivo.' : 'Non riusciamo a riconoscere il tuo account.',
        corpo: errore.codice === 'abbonamento_non_attivo' ? 'Puoi sempre scrivere il tuo diario.' : 'Scrivi all’assistenza indicando il riferimento qui sotto. Nel frattempo puoi sempre scrivere il tuo diario.',
        riprova: false,
        riferimento,
      };
    case 'definitivo':
      if (errore.codice === 'gia_condiviso') return { messaggio: 'La giornata di oggi è già stata condivisa.', corpo: 'Il diario condiviso non si può più cambiare da qui.', riprova: false, riferimento: null };
      return { messaggio: 'Non siamo riusciti a preparare il diario.', corpo: 'Puoi sempre scrivere il tuo diario. Se succede ancora, scrivi all’assistenza indicando il riferimento qui sotto.', riprova: false, riferimento };
  }
}
