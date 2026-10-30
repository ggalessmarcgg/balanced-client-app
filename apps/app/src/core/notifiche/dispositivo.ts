// Registro dei telefoni (step 6, contratto notifiche v0.2 §4; tabella client_devices, migrazione 20261029224322 del
// repo degli agenti): l'app scrive solo le proprie righe con la sessione del cliente (lettura, inserimento,
// aggiornamento; mai cancellazioni). Qui le forme delle righe e le regole pure; le chiamate stanno in servizi/dispositivo.ts.

export const TABELLA_DISPOSITIVI = 'client_devices';
/** Colonne lette per ritrovare la propria riga (mai select *). */
export const SELEZIONE_DISPOSITIVO = ['id', 'token', 'permission_status', 'disabled_at', 'installation_id'].join(',');

export type Piattaforma = 'android' | 'ios';
export type Fornitore = 'fcm' | 'apns';
/** Valori della colonna permission_status. */
export type PermessoNotifiche = 'granted' | 'denied' | 'undetermined';
export type MotivoDisattivazione = 'logout' | 'permission_revoked';

export type RigaDispositivo = {
  id: string;
  token: string;
  permission_status: PermessoNotifiche;
  disabled_at: string | null;
  installation_id: string | null;
};

/** Ciò che il telefono sa di sé al momento della registrazione. */
export type DatiTelefono = {
  piattaforma: Piattaforma;
  /** Codice del dispositivo presso il fornitore (FCM su Android; APNs quando arriveranno le credenziali Apple). */
  token: string;
  /** Identificativo di questa installazione (casuale, nel portachiavi): ritrova la riga anche se il codice cambia. */
  installationId: string;
  permesso: PermessoNotifiche;
  appVersion: string | null;
  osVersion: string | null;
  deviceModel: string | null;
};

export function fornitorePerPiattaforma(p: Piattaforma): Fornitore {
  return p === 'android' ? 'fcm' : 'apns';
}

/** Stato del permesso di sistema → valore della colonna (expo-notifications: granted / denied / undetermined). */
export function permessoDaStato(status: string): PermessoNotifiche {
  return status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined';
}

/**
 * Azione mostrata in Account (contratto §5): nessuna card con il permesso concesso; "Attiva le notifiche" se si può
 * ancora chiedere (mai chiesto, oppure rifiutato ma il sistema permette di richiedere); "Apri le impostazioni" se il
 * sistema non permette più di chiederlo.
 */
export type AzionePermesso = 'nessuna' | 'attiva' | 'impostazioni';

export function azionePerPermesso(permesso: PermessoNotifiche, puoChiedere: boolean): AzionePermesso {
  if (permesso === 'granted') return 'nessuna';
  if (permesso === 'denied' && !puoChiedere) return 'impostazioni';
  return 'attiva';
}

/** Riga da inserire la prima volta che questo telefono compare per il cliente. */
export function rigaDaInserire(clientId: string, userId: string, dati: DatiTelefono, adesso: Date): Record<string, unknown> {
  return {
    client_id: clientId,
    user_id: userId,
    platform: dati.piattaforma,
    provider: fornitorePerPiattaforma(dati.piattaforma),
    token: dati.token,
    installation_id: dati.installationId,
    permission_status: dati.permesso,
    app_version: dati.appVersion,
    os_version: dati.osVersion,
    device_model: dati.deviceModel,
    last_seen_at: adesso.toISOString(),
  };
}

/**
 * Aggiornamento della propria riga a ogni avvio e al rinnovo del codice: permesso, versioni, ultimo accesso, codice se
 * cambiato; la riga torna attiva (disabled_at e motivo azzerati: "al nuovo accesso si riattiva").
 */
export function modificaRegistrazione(esistente: RigaDispositivo, dati: DatiTelefono, adesso: Date): Record<string, unknown> {
  const modifica: Record<string, unknown> = {
    permission_status: dati.permesso,
    app_version: dati.appVersion,
    os_version: dati.osVersion,
    device_model: dati.deviceModel,
    last_seen_at: adesso.toISOString(),
    disabled_at: null,
    disabled_reason: null,
  };
  if (esistente.token !== dati.token) modifica.token = dati.token;
  if (esistente.installation_id !== dati.installationId) modifica.installation_id = dati.installationId;
  return modifica;
}

/** "Esci": la riga di questo telefono si disattiva con il motivo (mai cancellata). */
export function modificaDisattivazione(motivo: MotivoDisattivazione, adesso: Date): Record<string, unknown> {
  return { disabled_at: adesso.toISOString(), disabled_reason: motivo };
}

/** Solo il permesso (cambio dalle impostazioni o dalla richiesta di sistema), con l'ultimo accesso. */
export function modificaPermesso(permesso: PermessoNotifiche, adesso: Date): Record<string, unknown> {
  return { permission_status: permesso, last_seen_at: adesso.toISOString() };
}

/** Tra le proprie righe, quella di questo telefono: prima per installazione, poi per codice. */
export function scegliRiga(righe: RigaDispositivo[], dati: DatiTelefono): RigaDispositivo | null {
  return righe.find((r) => r.installation_id === dati.installationId) ?? righe.find((r) => r.token === dati.token) ?? null;
}
