// Monitoraggio degli errori con Sentry (step 4, decisioni del 2/11/2026): unico punto dell'app che importa
// `@sentry/react-native`. Progetto `balanced-app` dell'organizzazione `balanced-v3`, regione UE, piano gratuito, senza
// consenso (interesse legittimo) e quindi SENZA dati personali o sanitari: `sendDefaultPii` spento, niente Session Replay,
// niente cattura degli input né screenshot, tracing spento durante il test, filtri puri in `src/core/monitoraggio/filtro.ts`.
//
// Quando è attivo: nelle build di rilascio con il DSN in EXPO_PUBLIC_SENTRY_DSN, ambiente `production` oppure `preview`
// (EXPO_PUBLIC_SENTRY_AMBIENTE=preview nel solo ambiente EAS `preview`: gli errori delle build di prova non si mescolano
// con quelli veri); in sviluppo (__DEV__) resta spento, salvo EXPO_PUBLIC_SENTRY_IN_SVILUPPO=1 nel .env del Mac (ambiente `sviluppo`).
// Release e numero di build li prende l'SDK dal nativo (`it.joinbalanced.app@1.0.0+<versionCode>`, `dist` = versionCode),
// gli stessi con cui la build EAS carica le mappe del codice (plugin in app.json, SENTRY_AUTH_TOKEN su EAS).
import * as Sentry from '@sentry/react-native';
import type { ComponentType } from 'react';

import { etichetteSicure, pulisciBreadcrumb, pulisciEvento } from '@/core/monitoraggio/filtro';

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
const IN_SVILUPPO = process.env.EXPO_PUBLIC_SENTRY_IN_SVILUPPO === '1';

/** Ambiente dichiarato a Sentry: `production` per le build di rilascio, `preview` per le build di prova EAS, `sviluppo` sul Mac. */
export const AMBIENTE_MONITORAGGIO: 'sviluppo' | 'preview' | 'production' = __DEV__ ? 'sviluppo' : process.env.EXPO_PUBLIC_SENTRY_AMBIENTE === 'preview' ? 'preview' : 'production';
/** Vero se questa installazione manda gli errori a Sentry (DSN presente e, in sviluppo, prove abilitate). */
export const MONITORAGGIO_ATTIVO: boolean = typeof DSN === 'string' && DSN.length > 0 && (!__DEV__ || IN_SVILUPPO);

let avviato = false;

/** Avvio di Sentry, prima del primo render del layout radice. Senza DSN (o in sviluppo senza il flag) non fa nulla. */
export function avviaMonitoraggio(): void {
  if (avviato || !MONITORAGGIO_ATTIVO) return;
  avviato = true;
  Sentry.init({
    dsn: DSN,
    environment: AMBIENTE_MONITORAGGIO,
    // Nessun dato personale: niente IP, niente utente, niente intestazioni o corpi delle richieste.
    sendDefaultPii: false,
    // Niente tracing, profiling, replay, log, screenshot, gerarchia delle viste, richieste fallite come eventi.
    tracesSampleRate: 0,
    enableAutoPerformanceTracing: false,
    enableAppStartTracking: false,
    enableNativeFramesTracking: false,
    enableStallTracking: false,
    enableUserInteractionTracing: false,
    profilesSampleRate: 0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    enableLogs: false,
    attachScreenshot: false,
    attachViewHierarchy: false,
    enableCaptureFailedRequests: false,
    // Breadcrumb di rete del livello nativo (iOS e Android) spenti: quelli JS passano dal filtro, questi no.
    enableNetworkBreadcrumbs: false,
    enableNetworkEventBreadcrumbs: false,
    maxBreadcrumbs: 40,
    // Schermata corrente dalle rotte di expo-router (senza parametri: il filtro li toglie dai breadcrumb).
    integrations: [Sentry.expoRouterIntegration({ enableTimeToInitialDisplay: false })],
    beforeSend: (evento) => pulisciEvento(evento),
    beforeBreadcrumb: (b) => pulisciBreadcrumb(b),
  });
}

/** Un errore gestito dall'app (avvio, boundary) con etichette brevi (origine, stato del cliente, codice). */
export function segnalaErrore(errore: unknown, etichette: Record<string, unknown> = {}): void {
  if (!MONITORAGGIO_ATTIVO) return;
  Sentry.captureException(errore, { tags: etichetteSicure(etichette) });
}

/** Lo stato del cliente (codice A-L, mai l'identità) come etichetta di ogni evento successivo. */
export function impostaStatoCliente(codice: string | null): void {
  if (!MONITORAGGIO_ATTIVO) return;
  Sentry.setTag('stato_cliente', codice ?? undefined);
}

/** Il layout radice avvolto da Sentry (tocchi come breadcrumb, profilo del render). Senza monitoraggio: il componente stesso. */
export function avvolgiRadice<P extends Record<string, unknown>>(Radice: ComponentType<P>): ComponentType<P> {
  return MONITORAGGIO_ATTIVO ? Sentry.wrap(Radice) : Radice;
}

/** L'ErrorBoundary di expo-router avvolto da Sentry: cattura l'errore di rendering con la rotta (senza parametri). */
export function avvolgiErrorBoundary<P extends { error: Error; retry: () => Promise<void> }>(Boundary: ComponentType<P>): ComponentType<P> {
  return MONITORAGGIO_ATTIVO ? Sentry.wrapExpoRouterErrorBoundary(Boundary) : Boundary;
}

/** Solo per la pagina di sviluppo: un messaggio di prova (non un errore). */
export function segnalaProva(messaggio: string): void {
  if (!MONITORAGGIO_ATTIVO) return;
  Sentry.captureMessage(messaggio, { level: 'info', tags: { origine: 'prova' } });
}
