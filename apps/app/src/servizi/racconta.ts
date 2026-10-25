// "Racconta" (step 10): stato del flusso condiviso tra schermata e servizi (la macchina a stati pura è in
// src/core/racconta/flusso.ts), consenso al microfono ricordato sul telefono, audio in attesa nella cartella documenti
// (mai in cache: src/core/racconta/attesa.ts) e chiamate "trascrivi" e "compila" del server degli agenti con l'accesso
// Supabase del cliente (docs/server-diario-vocale.md). Lotto 2: il diario compilato diventa la bozza di oggi con la
// logica esistente del diario (servizi/giornate.ts). Le azioni sul registratore le esegue la schermata, che si collega qui.
import { fetch as fetchExpo } from 'expo/fetch';
import { Directory, File, Paths } from 'expo-file-system';
import { useSyncExternalStore } from 'react';

import { aggiornaDiario } from '@/core/diario/bozza';
import { dataOggiRoma } from '@/core/diario/data';
import type { Diario } from '@/core/diario/modello';
import { fileDaCancellare, leggiNotaAttesa, leggiNotaTesto, notaAudioInAttesa, notaTestoInAttesa, type AudioRacconto, type TestoRacconto } from '@/core/racconta/attesa';
import { durataDichiarata } from '@/core/racconta/audio';
import { corpoCompilazione, erroreCompilazioneApp, interpretaRispostaCompilazione, PERCORSO_COMPILA, TEMPO_MASSIMO_COMPILAZIONE_MS, type EsitoCompilazione } from '@/core/racconta/compila';
import { riduci, ripartiDallAvvio, STATO_INIZIALE, type EffettoRacconta, type EventoRacconta, type PermessoMicrofono, type StatoRacconta } from '@/core/racconta/flusso';
import { erroreApp, interpretaRispostaTrascrizione, intestazioniTrascrizione, nuovoIdRichiesta, PERCORSO_TRASCRIVI, TEMPO_MASSIMO_TRASCRIZIONE_MS, type EsitoTrascrizione } from '@/core/racconta/server';
import { tokenAccesso, URL_AGENTI } from '@/servizi/agenti';
import { leggi, scrivi } from '@/servizi/archivio';
import { leggiFile, rimuoviFile, scriviFile } from '@/servizi/archivioFile';
import { salvaBozzaInAttesa } from '@/servizi/giornate';
import { aggiornaMemoria, memoriaDiario, persistiMemoria } from '@/servizi/memoriaDiario';

// ---- Stato del flusso ---------------------------------------------------------------------------------------------

/** I suggerimenti del tutorial di Racconta (Figma 586:5739, 758:7670, 758:7728 e, sul riepilogo, 758:7773), una volta per account. */
export type PuntoTutorial = 'pronto' | 'terminata' | 'racconto' | 'riepilogo';
export type TutorialVisti = Record<PuntoTutorial, boolean>;
const TUTORIAL_NESSUNO: TutorialVisti = { pronto: false, terminata: false, racconto: false, riepilogo: false };

export type MemoriaRacconta = { stato: StatoRacconta; tutorialVisti: TutorialVisti };

let stato: StatoRacconta = STATO_INIZIALE;
let tutorialVisti: TutorialVisti = TUTORIAL_NESSUNO;
let memoria: MemoriaRacconta = { stato, tutorialVisti };
let clienteCorrente: string | null = null;
const ascoltatori = new Set<() => void>();

function notifica(): void {
  memoria = { stato, tutorialVisti };
  for (const a of ascoltatori) a();
}

function impostaStato(nuovo: StatoRacconta): void {
  stato = nuovo;
  notifica();
}

function iscriviti(a: () => void): () => void {
  ascoltatori.add(a);
  return () => {
    ascoltatori.delete(a);
  };
}

export function statoRacconta(): StatoRacconta {
  return stato;
}

function memoriaRacconta(): MemoriaRacconta {
  return memoria;
}

/** Stato del flusso e tutorial visti come stato React. */
export function useMemoriaRacconta(): MemoriaRacconta {
  return useSyncExternalStore(iscriviti, memoriaRacconta);
}

/** Comandi sul registratore, forniti dalla schermata che lo possiede (hook useRacconta). */
export type Registratore = {
  avvia: () => Promise<void>;
  ferma: () => Promise<void>;
  pausa: () => void;
  riprendi: () => void;
  chiediPermesso: () => Promise<boolean>;
};
let registratore: Registratore | null = null;

export function collegaRegistratore(r: Registratore): () => void {
  registratore = r;
  return () => {
    if (registratore === r) registratore = null;
  };
}

/** Applica un evento alla macchina a stati ed esegue gli effetti. */
export function invia(evento: EventoRacconta): void {
  const { stato: nuovo, effetti } = riduci(stato, evento);
  impostaStato(nuovo);
  for (const effetto of effetti) void esegui(effetto);
}

async function esegui(effetto: EffettoRacconta): Promise<void> {
  switch (effetto.tipo) {
    case 'chiediPermesso': {
      const concesso = registratore ? await registratore.chiediPermesso().catch(() => false) : false;
      invia({ tipo: 'permessoRisposto', concesso });
      return;
    }
    case 'avviaRegistrazione':
      try {
        if (!registratore) throw new Error('registratore assente');
        await registratore.avvia();
        invia({ tipo: 'avviataRegistrazione' });
      } catch {
        invia({ tipo: 'registrazioneNonRiuscita' });
      }
      return;
    case 'fermaRegistrazione':
      try {
        await registratore?.ferma();
      } catch {
        invia({ tipo: 'registrazioneNonRiuscita' });
      }
      return;
    case 'mettiInPausa':
      registratore?.pausa();
      return;
    case 'riprendiRegistrazione':
      registratore?.riprendi();
      return;
    case 'salvaAudio':
      if (clienteCorrente) await salvaNotaAudio(clienteCorrente, effetto.audio);
      return;
    case 'trascrivi': {
      const esito = await trascriviAudio(effetto.audio);
      if (esito.tipo === 'ok') invia({ tipo: 'trascritta', testo: esito.testo, durataMs: esito.durataMs });
      else invia({ tipo: 'trascrizioneFallita', errore: esito.errore });
      return;
    }
    case 'cancellaAudio':
      await cancellaAudio(effetto.uri);
      if (clienteCorrente) await rimuoviFile(chiaveNota(clienteCorrente), DOCUMENTI);
      return;
    case 'salvaTesto':
      if (clienteCorrente) salvaNotaTesto(clienteCorrente, effetto.racconto);
      return;
    case 'cancellaTesto':
      if (clienteCorrente) await rimuoviFile(chiaveTesto(clienteCorrente), DOCUMENTI);
      return;
    case 'compila': {
      const esito = await compilaRacconto(effetto.racconto.testo, effetto.racconto.data);
      if (esito.tipo === 'nonHoCapito') invia({ tipo: 'nonCapito' });
      else if (esito.tipo === 'errore') invia({ tipo: 'compilazioneFallita', errore: esito.errore });
      else {
        const problema = applicaDiarioCompilato(effetto.racconto.data, esito.diario);
        invia(problema ? { tipo: 'compilazioneFallita', errore: erroreCompilazioneApp(problema, null) } : { tipo: 'compilato' });
      }
      return;
    }
  }
}

// ---- Lotto 2: il diario compilato diventa la bozza di oggi --------------------------------------------------------

/** Il diario di oggi in memoria (letto da Oggi), se è del giorno del racconto e non ancora condiviso. */
function diarioDiOggi(data: string): { tipo: 'ok'; diario: Diario } | { tipo: 'problema'; codice: 'diario_non_disponibile' | 'gia_condiviso' } {
  const locale = memoriaDiario().locale;
  if (!locale || locale.data !== data || (clienteCorrente && locale.clientId !== clienteCorrente)) return { tipo: 'problema', codice: 'diario_non_disponibile' };
  if (locale.riga.tipo === 'condiviso') return { tipo: 'problema', codice: 'gia_condiviso' };
  return { tipo: 'ok', diario: locale.diario };
}

/**
 * Il diario restituito dal server (già fuso con la bozza) prende il posto del diario di oggi e si salva subito con la
 * logica del diario: copia locale, poi la bozza sul server senza status (mai una bozza vuota, pianificaSalvataggio).
 * Restituisce il problema se la giornata non si può più cambiare (condivisa nel frattempo, giorno cambiato).
 */
function applicaDiarioCompilato(data: string, diario: Diario): 'diario_non_disponibile' | 'gia_condiviso' | null {
  const oggi = diarioDiOggi(data);
  if (oggi.tipo === 'problema') return oggi.codice;
  const locale = memoriaDiario().locale;
  if (!locale) return 'diario_non_disponibile';
  aggiornaMemoria({ locale: aggiornaDiario(locale, diario) });
  persistiMemoria();
  void salvaBozzaInAttesa();
  return null;
}

/**
 * All'apertura della schermata: permesso del microfono (con il consenso ricordato sul telefono), audio di oggi in attesa
 * e pulizia dei file di registrazione vecchi. Se il flusso è già avviato (si torna dalla stessa sessione) non si riparte.
 */
export async function avviaRacconta(clientId: string, permesso: () => Promise<PermessoMicrofono>): Promise<void> {
  const oggi = dataOggiRoma(new Date());
  // Altro cliente, altro giorno del diario (un racconto di ieri non vale più) o registrazione rimasta senza
  // registratore: si riparte dall'avvio.
  if (clienteCorrente !== clientId || ripartiDallAvvio(stato, oggi)) {
    clienteCorrente = clientId;
    impostaStato(STATO_INIZIALE);
  }
  if (stato.tipo !== 'avvio') return;
  const [audioInAttesa, testoInAttesa, statoPermesso, consenso, visti] = await Promise.all([
    leggiAudioInAttesa(clientId, oggi),
    leggiTestoInAttesa(clientId, oggi),
    permesso(),
    consensoDato(clientId),
    leggiTutorialVisti(clientId),
  ]);
  if (stato.tipo !== 'avvio' || clienteCorrente !== clientId) return;
  tutorialVisti = visti;
  // Senza consenso registrato per questo account la schermata del consenso compare anche se il sistema ha già concesso il permesso.
  const effettivo: PermessoMicrofono = statoPermesso === 'concesso' && !consenso ? 'daChiedere' : statoPermesso;
  invia({ tipo: 'avviato', permesso: effettivo, audioInAttesa, testoInAttesa });
}

/**
 * "Interrompi" nell'avviso di uscita (registrazione in corso o terminata e non inviata): si scarta l'audio e il flusso
 * riparte dall'avvio. Il registratore lo ferma la schermata che lo possiede.
 */
export async function interrompiRacconta(): Promise<void> {
  const attuale = stato;
  impostaStato(STATO_INIZIALE);
  if (attuale.tipo === 'terminata') await cancellaAudio(attuale.audio.uri);
  if (clienteCorrente) await rimuoviFile(chiaveNota(clienteCorrente), DOCUMENTI);
}

/** All'uscita dall'account. */
export function svuotaRacconta(): void {
  clienteCorrente = null;
  stato = STATO_INIZIALE;
  tutorialVisti = TUTORIAL_NESSUNO;
  notifica();
}

// ---- Consenso e tutorial (portachiavi, per account: restano anche dopo l'uscita, un altro account li rifà) -----------

const PREFISSO_CONSENSO = 'balanced.racconta.consenso';
const PREFISSO_TUTORIAL = 'balanced.racconta.tutorial';

export async function consensoDato(clientId: string): Promise<boolean> {
  try {
    return (await leggi(`${PREFISSO_CONSENSO}.${clientId}`)) !== null;
  } catch {
    return false;
  }
}

/** "Consenti" vale come consenso all'uso del servizio esterno di trascrizione e dell'intelligenza artificiale, per questo account. */
export async function registraConsenso(adesso: Date = new Date()): Promise<void> {
  if (!clienteCorrente) return;
  await scrivi(`${PREFISSO_CONSENSO}.${clienteCorrente}`, adesso.toISOString()).catch(() => {});
}

async function leggiTutorialVisti(clientId: string): Promise<TutorialVisti> {
  try {
    const testo = await leggi(`${PREFISSO_TUTORIAL}.${clientId}`);
    const grezzo = testo ? (JSON.parse(testo) as Partial<TutorialVisti>) : {};
    return { pronto: grezzo.pronto === true, terminata: grezzo.terminata === true, racconto: grezzo.racconto === true, riepilogo: grezzo.riepilogo === true };
  } catch {
    return TUTORIAL_NESSUNO;
  }
}

/** "Ho capito": il suggerimento non compare più per questo account. */
export function segnaTutorialVisto(punto: PuntoTutorial): void {
  if (tutorialVisti[punto]) return;
  tutorialVisti = { ...tutorialVisti, [punto]: true };
  notifica();
  if (clienteCorrente) scrivi(`${PREFISSO_TUTORIAL}.${clienteCorrente}`, JSON.stringify(tutorialVisti)).catch(() => {});
}

// ---- Audio in attesa (cartella documenti) ---------------------------------------------------------------------------

const DOCUMENTI = 'documenti' as const;
const PREFISSO_NOTA = 'balanced.racconta';
const PREFISSO_TESTO = 'balanced.racconta.testo';
function chiaveNota(clientId: string): string {
  return `${PREFISSO_NOTA}.${clientId}`;
}
function chiaveTesto(clientId: string): string {
  return `${PREFISSO_TESTO}.${clientId}`;
}

// Il testo si salva a ogni modifica: scritture serializzate e, se ne arrivano molte, si scrive solo l'ultima.
let scritturaTesto: Promise<void> = Promise.resolve();
let testoInCoda: { clientId: string; racconto: TestoRacconto } | null = null;
function salvaNotaTesto(clientId: string, racconto: TestoRacconto): void {
  const primaInCoda = testoInCoda === null;
  testoInCoda = { clientId, racconto };
  if (!primaInCoda) return;
  scritturaTesto = scritturaTesto.then(async () => {
    while (testoInCoda) {
      const daScrivere = testoInCoda;
      testoInCoda = null;
      await scriviFile(chiaveTesto(daScrivere.clientId), JSON.stringify(notaTestoInAttesa(daScrivere.racconto, daScrivere.clientId, new Date().toISOString())), DOCUMENTI).catch(() => {});
    }
  });
}

/** Il racconto di oggi già trascritto, se c'è; una nota di un altro giorno si cancella (fine giornata). */
export async function leggiTestoInAttesa(clientId: string, oggi: string): Promise<TestoRacconto | null> {
  let grezzo: unknown = null;
  try {
    const testo = await leggiFile(chiaveTesto(clientId), DOCUMENTI);
    grezzo = testo ? JSON.parse(testo) : null;
  } catch {
    grezzo = null;
  }
  const lettura = leggiNotaTesto(grezzo, clientId, oggi);
  if (lettura.tipo === 'scaduto') await rimuoviFile(chiaveTesto(clientId), DOCUMENTI);
  return lettura.tipo === 'daRiprendere' ? lettura.racconto : null;
}

/** Cartelle in cui expo-audio scrive i file nella cartella documenti (iOS `ExpoAudio/`, Android `Audio/`). */
const CARTELLE_REGISTRAZIONI = ['ExpoAudio', 'Audio'];

async function salvaNotaAudio(clientId: string, audio: AudioRacconto): Promise<void> {
  await scriviFile(chiaveNota(clientId), JSON.stringify(notaAudioInAttesa(audio, clientId, new Date().toISOString())), DOCUMENTI).catch(() => {});
}

export async function cancellaAudio(uri: string): Promise<void> {
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {
    // già assente o non cancellabile
  }
}

/** Nome del file (con estensione) di un uri. */
function nomeDi(uri: string): string {
  return uri.split('/').pop() ?? '';
}

/** Cancella i file di registrazione diversi da quello da tenere (racconti di giorni passati, app chiusa a metà). */
async function pulisciRegistrazioni(daTenere: string | null): Promise<void> {
  for (const nome of CARTELLE_REGISTRAZIONI) {
    try {
      const d = new Directory(Paths.document, nome);
      if (!d.exists) continue;
      const voci = d.list();
      const nomi = voci.filter((v): v is File => v instanceof File).map((f) => f.name);
      for (const f of voci) if (f instanceof File && fileDaCancellare(nomi, daTenere).includes(f.name)) f.delete();
    } catch {
      // cartella non leggibile: si riproverà alla prossima apertura
    }
  }
}

/** L'audio di oggi non ancora trascritto, se c'è; cancella le note e i file scaduti (fine giornata, contratto §1.6). */
export async function leggiAudioInAttesa(clientId: string, oggi: string): Promise<AudioRacconto | null> {
  let grezzo: unknown = null;
  try {
    const testo = await leggiFile(chiaveNota(clientId), DOCUMENTI);
    grezzo = testo ? JSON.parse(testo) : null;
  } catch {
    grezzo = null;
  }
  const lettura = leggiNotaAttesa(grezzo, clientId, oggi);
  if (lettura.tipo === 'scaduto') {
    await cancellaAudio(lettura.uri);
    await rimuoviFile(chiaveNota(clientId), DOCUMENTI);
  }
  const audio = lettura.tipo === 'daTrascrivere' && new File(lettura.audio.uri).exists ? lettura.audio : null;
  if (lettura.tipo === 'daTrascrivere' && !audio) await rimuoviFile(chiaveNota(clientId), DOCUMENTI);
  await pulisciRegistrazioni(audio ? nomeDi(audio.uri) : null);
  return audio;
}

// ---- Chiamate al server (indirizzo e token in src/servizi/agenti.ts) ---------------------------------------------------

async function inviaAudio(token: string, audio: AudioRacconto, byte: Uint8Array, richiestaId: string): Promise<EsitoTrascrizione> {
  const controllo = new AbortController();
  const timer = setTimeout(() => controllo.abort(), TEMPO_MASSIMO_TRASCRIZIONE_MS);
  try {
    const risposta = await fetchExpo(`${URL_AGENTI}${PERCORSO_TRASCRIVI}`, {
      method: 'POST',
      headers: intestazioniTrascrizione(token, audio.data, audio.durataMs, richiestaId),
      // Copia in un buffer "puro" (Uint8Array<ArrayBuffer>): il tipo BodyInit non accetta ArrayBufferLike.
      body: new Uint8Array(byte),
      signal: controllo.signal,
    });
    const idRisposta = risposta.headers.get('x-request-id') ?? richiestaId;
    let corpo: unknown = null;
    try {
      corpo = await risposta.json();
    } catch {
      corpo = null;
    }
    return interpretaRispostaTrascrizione(risposta.status, corpo, idRisposta, durataDichiarata(audio.durataMs));
  } catch (e) {
    const nome = (e as { name?: string })?.name;
    return { tipo: 'errore', errore: erroreApp(nome === 'AbortError' ? 'tempo_scaduto' : 'rete', richiestaId) };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * POST /v1/diario-vocale/trascrivi: i byte del file m4a così come sono, con l'accesso Supabase del cliente, il giorno del
 * diario e la durata misurata. Con un token rifiutato si rinnova la sessione e si ripete una volta.
 */
export async function trascriviAudio(audio: AudioRacconto): Promise<EsitoTrascrizione> {
  const richiestaId = nuovoIdRichiesta();
  let byte: Uint8Array;
  try {
    const f = new File(audio.uri);
    if (!f.exists) return { tipo: 'errore', errore: erroreApp('audio_assente', richiestaId) };
    byte = await f.bytes();
  } catch {
    return { tipo: 'errore', errore: erroreApp('audio_assente', richiestaId) };
  }
  const token = await tokenAccesso();
  if (!token) return { tipo: 'errore', errore: erroreApp('sessione_assente', richiestaId) };
  const esito = await inviaAudio(token, audio, byte, richiestaId);
  if (esito.tipo === 'errore' && esito.errore.esito === 'sessione' && esito.errore.httpStatus === 401) {
    const nuovoToken = await tokenAccesso(true);
    if (nuovoToken) return inviaAudio(nuovoToken, audio, byte, richiestaId);
  }
  return esito;
}

async function inviaCompilazione(token: string, corpo: string, richiestaId: string): Promise<EsitoCompilazione> {
  const controllo = new AbortController();
  const timer = setTimeout(() => controllo.abort(), TEMPO_MASSIMO_COMPILAZIONE_MS);
  try {
    const risposta = await fetchExpo(`${URL_AGENTI}${PERCORSO_COMPILA}`, {
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
    return interpretaRispostaCompilazione(risposta.status, json, idRisposta);
  } catch (e) {
    const nome = (e as { name?: string })?.name;
    return { tipo: 'errore', errore: erroreCompilazioneApp(nome === 'AbortError' ? 'tempo_scaduto' : 'rete', richiestaId) };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * POST /v1/diario-vocale/compila: il racconto (così come trascritto ed eventualmente corretto), la bozza di oggi dalla
 * memoria dell'app (con "oggi riposo") e il giorno del diario. Con un token rifiutato si rinnova la sessione e si
 * ripete una volta. Il server non scrive sul diario: restituisce i campi, già fusi con la bozza.
 */
export async function compilaRacconto(racconto: string, data: string): Promise<EsitoCompilazione> {
  const richiestaId = nuovoIdRichiesta();
  const oggi = diarioDiOggi(data);
  if (oggi.tipo === 'problema') return { tipo: 'errore', errore: erroreCompilazioneApp(oggi.codice, null) };
  const corpo = JSON.stringify(corpoCompilazione(data, racconto, oggi.diario));
  const token = await tokenAccesso();
  if (!token) return { tipo: 'errore', errore: erroreCompilazioneApp('sessione_assente', richiestaId) };
  const esito = await inviaCompilazione(token, corpo, richiestaId);
  if (esito.tipo === 'errore' && esito.errore.esito === 'sessione' && esito.errore.httpStatus === 401) {
    const nuovoToken = await tokenAccesso(true);
    if (nuovoToken) return inviaCompilazione(nuovoToken, corpo, richiestaId);
  }
  return esito;
}
