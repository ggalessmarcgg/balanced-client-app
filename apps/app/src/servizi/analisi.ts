// Analisi dell'uso con PostHog in MODALITÀ ANONIMA (step 4, lotto 2; decisioni di Alessandro del 2/11/2026): unico punto
// dell'app che importa `posthog-react-native`. Progetto "Balanced app" nella regione UE (https://eu.i.posthog.com),
// chiave pubblica del progetto in EXPO_PUBLIC_POSTHOG_KEY (sta nel bundle: non è un segreto, ma resta fuori dal repo).
//
// Modalità anonima: l'SDK genera un codice casuale per installazione e lo tiene in un file della cartella documenti
// (`expo-file-system`); nessun `identify`, nessun `reset`, nessun profilo della persona (`personProfiles: 'never'`),
// nessun dato personale o sanitario, nessun testo dell'utente, nessun identificativo di diari, piani, revisioni,
// clienti o nutrizioniste. L'IP non viene conservato (impostazione del progetto, attivata da Alessandro). Niente cattura
// automatica dei tocchi o delle schermate (si usa la classe, non il PostHogProvider), niente Session Replay, sondaggi,
// feature flag, configurazione remota, cattura degli errori (li fa Sentry), eventi del ciclo di vita dell'SDK: l'unico
// evento di ciclo di vita è il nostro `app_aperta`. Ogni evento passa dal catalogo chiuso di `src/core/analisi/eventi.ts`
// (`validaProprieta` prima dell'invio, `filtraEventoInUscita` come `before_send`): un evento o una proprietà fuori
// elenco non parte.
//
// Quando è attiva: nelle build di rilascio con la chiave; in sviluppo (__DEV__) spenta, salvo EXPO_PUBLIC_POSTHOG_IN_SVILUPPO=1
// nel .env del Mac (prove sull'emulatore). Senza rete gli eventi restano in coda su file (al massimo 1000) e partono dopo.
import { PostHog, PostHogPersistedProperty } from 'posthog-react-native';
import { AppState } from 'react-native';

import { analisiAttiva, codiceErrore, fasciaAttesaLunga, filtraEventoInUscita, validaProprieta, type Funzione, type NomeEvento, type Proprieta } from '@/core/analisi/eventi';

const CHIAVE = process.env.EXPO_PUBLIC_POSTHOG_KEY;
const HOST_UE = 'https://eu.i.posthog.com';

/** Vero se questa installazione manda gli eventi a PostHog (chiave presente e, in sviluppo, prove abilitate). */
export const ANALISI_ATTIVA: boolean = analisiAttiva({ sviluppo: __DEV__, chiave: CHIAVE, provaInSviluppo: process.env.EXPO_PUBLIC_POSTHOG_IN_SVILUPPO === '1' });

let posthog: PostHog | null = null;
/**
 * Quando l'app è andata in secondo piano (o inattiva); null in primo piano. Il ritorno conta come apertura `da_sfondo`
 * solo dopo almeno 5 s: una richiesta di permesso del sistema (notifiche, microfono) mette l'app in secondo piano per un
 * istante e senza la soglia contava come un'apertura (verifica del 3/11/2026 sull'emulatore).
 */
let inSfondoDa: number | null = null;
const SFONDO_MINIMO_MS = 5_000;

/** Avvio di PostHog, una volta sola, dal layout radice. Senza chiave (o in sviluppo senza il flag) non fa nulla. */
export function avviaAnalisi(): void {
  if (posthog || !ANALISI_ATTIVA || !CHIAVE) return;
  posthog = new PostHog(CHIAVE, {
    host: HOST_UE,
    // Modalità anonima: mai un profilo della persona ($process_person_profile = false su ogni evento), mai proprietà di persona.
    personProfiles: 'never',
    setDefaultPersonProperties: false,
    disableGeoip: true,
    // Nessun evento automatico: né del ciclo di vita (il nostro è `app_aperta`), né dei tocchi o delle schermate (nessun provider).
    captureAppLifecycleEvents: false,
    // Niente Session Replay, sondaggi, feature flag, configurazione remota, cattura degli errori, notifiche push dell'SDK.
    enableSessionReplay: false,
    disableSurveys: true,
    preloadFeatureFlags: false,
    disableRemoteFeatureFlags: true,
    disableRemoteConfig: true,
    sendFeatureFlagEvent: false,
    errorTracking: { autocapture: false },
    capturePushNotificationSubscriptions: false,
    capturePushNotificationOpened: false,
    // Coda su file (cartella documenti): sopravvive alla chiusura dell'app e parte quando c'è rete.
    persistence: 'file',
    maxQueueSize: 1000,
    // Ultimo controllo prima dell'invio: solo eventi e proprietà del catalogo, via il nome del telefono e le proprietà di persona.
    before_send: (evento) => filtraEventoInUscita(evento),
  });
  // Diagnostica per la pagina di sviluppo: esito dell'ultimo invio a gruppi (riuscito con quanti eventi, oppure l'errore
  // HTTP o di rete dell'SDK). Nessun contenuto degli eventi, solo conteggio e messaggio tecnico.
  posthog.on('flush', (inviati: unknown) => {
    ultimoInvio = `riuscito, ${Array.isArray(inviati) ? inviati.length : '?'} eventi (${oraLocale()})`;
  });
  posthog.on('error', (errore: unknown) => {
    ultimoInvio = `fallito: ${descrizioneErrore(errore)} (${oraLocale()})`;
  });
  misura('app_aperta', { da_sfondo: false });
  AppState.addEventListener('change', (nuovo) => {
    if (nuovo === 'active') {
      if (inSfondoDa !== null && Date.now() - inSfondoDa >= SFONDO_MINIMO_MS) misura('app_aperta', { da_sfondo: true });
      inSfondoDa = null;
      return;
    }
    if (inSfondoDa === null) inSfondoDa = Date.now();
    if (nuovo === 'background') void posthog?.flush().catch(() => {});
  });
}

/**
 * L'unico punto di emissione: un evento del catalogo con le sue proprietà (il compilatore rifiuta chiavi o valori fuori
 * elenco; a runtime `validaProprieta` li rifiuta di nuovo). Con l'analisi spenta non fa nulla.
 */
export function misura<E extends NomeEvento>(evento: E, proprieta: Proprieta<E>): void {
  if (!posthog) return;
  const pulite = validaProprieta(evento, proprieta);
  if (!pulite) {
    if (__DEV__) console.warn(`[analisi] evento rifiutato: ${evento}`);
    return;
  }
  posthog.capture(evento, pulite);
}

/** L'esito di una chiamata nella forma comune ai moduli del server (`tipo` più, in errore, il codice stabile). */
export type EsitoChiamata = { tipo: string; errore?: { codice: string } };

/**
 * Dopo una chiamata di rete: `errore_chiamata` se non è andata (codice ricondotto all'elenco chiuso, mai il messaggio) e
 * `attesa_lunga` se ha impiegato almeno 10 secondi, riuscita o no.
 */
export function registraChiamata(funzione: Funzione, inizioMs: number, esito: EsitoChiamata): void {
  if (!posthog) return;
  const attesa = fasciaAttesaLunga(Date.now() - inizioMs);
  if (attesa) misura('attesa_lunga', { funzione, secondi: attesa });
  if (esito.tipo === 'errore') misura('errore_chiamata', { funzione, codice: codiceErrore(esito.errore?.codice) });
}

/** Per la pagina di sviluppo: il codice anonimo dell'installazione (per ritrovare i propri eventi di prova su PostHog). */
export function codiceAnonimo(): string | null {
  return posthog?.getDistinctId() ?? null;
}

// ---- Diagnostica (solo pagina di sviluppo /sviluppo/monitoraggio, anche nelle build preview) -----------------------

let ultimoInvio = 'nessuno';

function oraLocale(): string {
  return new Date().toLocaleTimeString('it-IT');
}

function descrizioneErrore(errore: unknown): string {
  if (errore instanceof Error) return `${errore.name}: ${errore.message}`;
  return String(errore);
}

/** Eventi ancora in coda nell'SDK (in attesa dell'invio a gruppi) ed esito dell'ultimo invio. */
export function diagnosticaAnalisi(): { inCoda: number; ultimoInvio: string } {
  const coda = posthog?.getPersistedProperty<unknown>(PostHogPersistedProperty.Queue);
  return { inCoda: Array.isArray(coda) ? coda.length : 0, ultimoInvio };
}

/** Invio immediato della coda (lo stesso `flush` che l'SDK esegue ogni 10 s e al cambio di stato dell'app). */
export async function inviaOra(): Promise<string> {
  if (!posthog) return 'analisi spenta';
  try {
    await posthog.flush();
    return diagnosticaAnalisi().ultimoInvio;
  } catch (errore) {
    return `fallito: ${descrizioneErrore(errore)}`;
  }
}
