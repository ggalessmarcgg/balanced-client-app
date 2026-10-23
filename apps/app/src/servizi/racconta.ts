// "Racconta" (step 10, lotto 1): stato del flusso condiviso tra schermata e servizi (la macchina a stati pura è in
// src/core/racconta/flusso.ts), consenso al microfono ricordato sul telefono, audio in attesa nella cartella documenti
// (mai in cache: src/core/racconta/attesa.ts) e chiamata "trascrivi" del server degli agenti con l'accesso Supabase
// del cliente (docs/server-diario-vocale.md). Le azioni sul registratore le esegue la schermata, che si collega qui.
import { fetch as fetchExpo } from 'expo/fetch';
import { Directory, File, Paths } from 'expo-file-system';
import { useSyncExternalStore } from 'react';

import { dataOggiRoma } from '@/core/diario/data';
import { fileDaCancellare, leggiNotaAttesa, notaAudioInAttesa, type AudioRacconto } from '@/core/racconta/attesa';
import { durataDichiarata } from '@/core/racconta/audio';
import { riduci, STATO_INIZIALE, statoScaduto, type EffettoRacconta, type EventoRacconta, type PermessoMicrofono, type StatoRacconta } from '@/core/racconta/flusso';
import { erroreApp, interpretaRispostaTrascrizione, intestazioniTrascrizione, nuovoIdRichiesta, PERCORSO_TRASCRIVI, TEMPO_MASSIMO_TRASCRIZIONE_MS, type EsitoTrascrizione } from '@/core/racconta/server';
import { leggi, scrivi } from '@/servizi/archivio';
import { leggiFile, rimuoviFile, scriviFile } from '@/servizi/archivioFile';
import { supabase } from '@/servizi/supabase';

const URL_AGENTI = process.env.EXPO_PUBLIC_AGENTI_URL;
if (!URL_AGENTI) {
  throw new Error('Manca EXPO_PUBLIC_AGENTI_URL: copiare .env.example in .env e compilarlo.');
}

// ---- Stato del flusso ---------------------------------------------------------------------------------------------

let stato: StatoRacconta = STATO_INIZIALE;
let clienteCorrente: string | null = null;
const ascoltatori = new Set<() => void>();

function impostaStato(nuovo: StatoRacconta): void {
  stato = nuovo;
  for (const a of ascoltatori) a();
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

/** Lo stato del flusso come stato React. */
export function useStatoRacconta(): StatoRacconta {
  return useSyncExternalStore(iscriviti, statoRacconta);
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
  }
}

/**
 * All'apertura della schermata: permesso del microfono (con il consenso ricordato sul telefono), audio di oggi in attesa
 * e pulizia dei file di registrazione vecchi. Se il flusso è già avviato (si torna dalla stessa sessione) non si riparte.
 */
export async function avviaRacconta(clientId: string, permesso: () => Promise<PermessoMicrofono>): Promise<void> {
  const oggi = dataOggiRoma(new Date());
  // Altro cliente o altro giorno del diario: si riparte dall'avvio (un racconto di ieri non vale più).
  if (clienteCorrente !== clientId || statoScaduto(stato, oggi)) {
    clienteCorrente = clientId;
    impostaStato(STATO_INIZIALE);
  }
  if (stato.tipo !== 'avvio') return;
  const [audioInAttesa, statoPermesso, consenso] = await Promise.all([leggiAudioInAttesa(clientId, oggi), permesso(), consensoDato()]);
  if (stato.tipo !== 'avvio' || clienteCorrente !== clientId) return;
  // Senza consenso registrato la schermata del consenso compare anche se il sistema ha già concesso il permesso.
  const effettivo: PermessoMicrofono = statoPermesso === 'concesso' && !consenso ? 'daChiedere' : statoPermesso;
  invia({ tipo: 'avviato', permesso: effettivo, audioInAttesa });
}

/** Uscita dalla schermata durante la registrazione: si ferma il registratore e si scarta il file (nessun dialogo in Figma). */
export function azzeraRacconta(): void {
  impostaStato(STATO_INIZIALE);
}

/** All'uscita dall'account. */
export function svuotaRacconta(): void {
  clienteCorrente = null;
  impostaStato(STATO_INIZIALE);
}

// ---- Consenso (portachiavi, resta anche dopo l'uscita: vale per il telefono) ----------------------------------------

const CHIAVE_CONSENSO = 'balanced.racconta.consenso';

export async function consensoDato(): Promise<boolean> {
  try {
    return (await leggi(CHIAVE_CONSENSO)) !== null;
  } catch {
    return false;
  }
}

/** "Consenti" vale come consenso all'uso del servizio esterno di trascrizione e dell'intelligenza artificiale. */
export async function registraConsenso(adesso: Date = new Date()): Promise<void> {
  await scrivi(CHIAVE_CONSENSO, adesso.toISOString()).catch(() => {});
}

// ---- Audio in attesa (cartella documenti) ---------------------------------------------------------------------------

const DOCUMENTI = 'documenti' as const;
const PREFISSO_NOTA = 'balanced.racconta';
function chiaveNota(clientId: string): string {
  return `${PREFISSO_NOTA}.${clientId}`;
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

// ---- Chiamata al server -----------------------------------------------------------------------------------------------

const MARGINE_SCADENZA_TOKEN_S = 60;

/** L'access token della sessione, rinnovato se sta per scadere (o se `forza`). null senza sessione. */
async function tokenAccesso(forza = false): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  const sessione = data.session;
  if (!sessione) return null;
  const inScadenza = sessione.expires_at !== undefined && sessione.expires_at - Date.now() / 1000 < MARGINE_SCADENZA_TOKEN_S;
  if (!forza && !inScadenza) return sessione.access_token;
  const rinnovo = await supabase.auth.refreshSession().catch(() => null);
  return rinnovo?.data.session?.access_token ?? (forza ? null : sessione.access_token);
}

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
