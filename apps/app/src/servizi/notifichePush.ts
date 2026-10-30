// Notifiche push (step 6, contratto notifiche v0.2 §5, §6): l'unico posto che importa expo-notifications. Banner anche
// con l'app aperta, due categorie Android create prima di chiedere il permesso (con gli id del server), permesso di
// sistema, codice del dispositivo (FCM su Android con getDevicePushTokenAsync; su iPhone arriverà con le credenziali
// Apple), ascolto delle notifiche ricevute e toccate. Nessun numero sull'icona dell'app.
import * as Notifications from 'expo-notifications';
// Enum esportata con `export *` da un file .types: la regola import/namespace non la vede dentro il namespace.
import { AndroidImportance } from 'expo-notifications';
import { Linking, Platform } from 'react-native';

import { permessoDaStato, type PermessoNotifiche } from '@/core/notifiche/dispositivo';
import { CANALI_ANDROID, canalePerTipo, type IdCanale } from '@/core/notifiche/push';

export type StatoPermessoNotifiche = { permesso: PermessoNotifiche; puoChiedere: boolean };
export type NotificaRicevuta = Notifications.Notification;
export type RispostaNotifica = Notifications.NotificationResponse;

// Con l'app aperta il banner compare comunque (contratto §6); mai il numero sull'icona.
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

/** Importanza per categoria: "Dalla tua nutrizionista" alta (banner in primo piano su Android), "Promemoria" normale. */
const IMPORTANZA: Record<IdCanale, AndroidImportance> = {
  nutrizionista: AndroidImportance.HIGH,
  promemoria: AndroidImportance.DEFAULT,
};

let categorieCreate = false;

/** Le due categorie Android, create una volta per avvio e sempre prima della richiesta del permesso (come richiesto dal sistema). */
export async function creaCategorieAndroid(): Promise<void> {
  if (Platform.OS !== 'android' || categorieCreate) return;
  for (const c of CANALI_ANDROID) {
    await Notifications.setNotificationChannelAsync(c.id, { name: c.nome, importance: IMPORTANZA[c.id] }).catch(() => null);
  }
  categorieCreate = true;
}

function statoDa(p: Notifications.NotificationPermissionsStatus): StatoPermessoNotifiche {
  return { permesso: permessoDaStato(p.status), puoChiedere: p.canAskAgain };
}

/** Permesso attuale senza chiederlo (all'avvio, in Account, al rientro in primo piano). */
export async function statoPermesso(): Promise<StatoPermessoNotifiche> {
  try {
    return statoDa(await Notifications.getPermissionsAsync());
  } catch {
    return { permesso: 'undetermined', puoChiedere: true };
  }
}

/** Richiesta di sistema ("Attiva le notifiche" nel carosello e in Account): prima le categorie, poi il permesso. */
export async function chiediPermesso(): Promise<StatoPermessoNotifiche> {
  await creaCategorieAndroid();
  try {
    return statoDa(await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } }));
  } catch {
    return statoPermesso();
  }
}

/** "Apri le impostazioni" (Account · 3): le impostazioni dell'app nel telefono. */
export function apriImpostazioniNotifiche(): void {
  Linking.openSettings().catch(() => {});
}

/**
 * Codice del dispositivo presso il fornitore (contratto §4: FCM su Android, mai il codice push di Expo). Su iPhone senza
 * credenziali APNs (e sul simulatore) non c'è: null, e il telefono non si registra.
 */
export async function codiceDispositivo(): Promise<string | null> {
  try {
    const t = await Notifications.getDevicePushTokenAsync();
    return typeof t.data === 'string' && t.data.trim() !== '' ? t.data : null;
  } catch {
    return null;
  }
}

/** Rinnovo del codice da parte del fornitore. */
export function ascoltaCodice(cb: (codice: string) => void): () => void {
  const sub = Notifications.addPushTokenListener((t) => {
    if (typeof t.data === 'string' && t.data.trim() !== '') cb(t.data);
  });
  return () => sub.remove();
}

/** Notifica arrivata con l'app in primo piano. */
export function ascoltaRicevute(cb: (n: NotificaRicevuta) => void): () => void {
  const sub = Notifications.addNotificationReceivedListener(cb);
  return () => sub.remove();
}

/** Tocco su una notifica (app aperta o in secondo piano). */
export function ascoltaRisposte(cb: (r: RispostaNotifica) => void): () => void {
  const sub = Notifications.addNotificationResponseReceivedListener(cb);
  return () => sub.remove();
}

/** La notifica toccata che ha avviato l'app da chiusa (null se l'app è partita dall'icona). */
export async function ultimaRisposta(): Promise<RispostaNotifica | null> {
  try {
    return await Notifications.getLastNotificationResponseAsync();
  } catch {
    return null;
  }
}

export function dimenticaUltimaRisposta(): void {
  Notifications.clearLastNotificationResponseAsync().catch(() => {});
}

/** Identificativo e dati di una notifica (ricevuta o toccata). */
export function datiNotifica(n: NotificaRicevuta): { id: string; data: unknown } {
  return { id: n.request.identifier, data: n.request.content.data };
}

/**
 * Solo in sviluppo: una notifica locale con gli stessi dati che manderà il server (server §3), dopo `secondi`, così si
 * può metterla in secondo piano o chiuderla prima del tocco. Nessuna notifica vera viene inviata.
 */
export async function programmaNotificaDiProva(titolo: string, testo: string, data: Record<string, string>, secondi: number): Promise<string | null> {
  if (!__DEV__) return null;
  await creaCategorieAndroid();
  try {
    return await Notifications.scheduleNotificationAsync({
      // notifica_id finto (il server mette l'id della riga di client_notifications).
      content: { title: titolo, body: testo, data: { ...data, notifica_id: `prova-${Date.now()}` } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: Math.max(1, secondi), channelId: canalePerTipo(data.tipo ?? null) },
    });
  } catch {
    return null;
  }
}
