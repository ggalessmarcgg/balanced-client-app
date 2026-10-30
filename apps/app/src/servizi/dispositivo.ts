// Registro dei telefoni (step 6, contratto notifiche v0.2 §4): a ogni avvio dell'app con un cliente in sessione la riga
// di questo telefono in client_devices si crea o si aggiorna (permesso, versione dell'app e del sistema, modello,
// ultimo accesso) con la sessione del cliente; "Esci" la disattiva con motivo logout e il nuovo accesso la riattiva.
// Un altro account sullo stesso telefono prende il telefono: lo fa il trigger del database (motivo "replaced").
// Senza codice del dispositivo (iPhone senza credenziali Apple, simulatore) non si scrive nulla.
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

import { modificaDisattivazione, modificaPermesso, modificaRegistrazione, rigaDaInserire, scegliRiga, SELEZIONE_DISPOSITIVO, TABELLA_DISPOSITIVI, type DatiTelefono, type MotivoDisattivazione, type PermessoNotifiche, type RigaDispositivo } from '@/core/notifiche/dispositivo';
import { nuovoIdRichiesta } from '@/core/racconta/server';
import { leggi, scrivi } from '@/servizi/archivio';
import { ascoltaCodice, codiceDispositivo, statoPermesso } from '@/servizi/notifichePush';
import { supabase } from '@/servizi/supabase';

export type EsitoRegistrazione = 'registrato' | 'senzaCodice' | 'nonAutenticato' | 'errore';

/** Identificativo di questa installazione (casuale, nel portachiavi, per tutti gli account): ritrova la riga anche se il codice cambia. */
const CHIAVE_INSTALLAZIONE = 'balanced.installazione';

type Corrente = { id: string; clientId: string; permesso: PermessoNotifiche };
let corrente: Corrente | null = null;
let registrazioneInCorso: Promise<EsitoRegistrazione> | null = null;
let ascoltoCodiceAttivo = false;

async function idInstallazione(): Promise<string> {
  try {
    const salvato = await leggi(CHIAVE_INSTALLAZIONE);
    if (salvato) return salvato;
  } catch {
    // portachiavi non leggibile: se ne genera uno nuovo
  }
  const nuovo = nuovoIdRichiesta().replace(/^app-/, 'inst-');
  await scrivi(CHIAVE_INSTALLAZIONE, nuovo).catch(() => {});
  return nuovo;
}

function piattaforma(): 'android' | 'ios' {
  return Platform.OS === 'android' ? 'android' : 'ios';
}

async function datiTelefono(): Promise<DatiTelefono | null> {
  const token = await codiceDispositivo();
  if (!token) return null;
  const [installationId, permesso] = await Promise.all([idInstallazione(), statoPermesso()]);
  return {
    piattaforma: piattaforma(),
    token,
    installationId,
    permesso: permesso.permesso,
    appVersion: Constants.expoConfig?.version ?? null,
    osVersion: Device.osVersion ?? String(Platform.Version),
    deviceModel: Device.modelName,
  };
}

/** Le proprie righe per questa installazione o per questo codice (RLS: solo le righe del cliente in sessione). */
async function righeProprie(clientId: string, dati: DatiTelefono): Promise<RigaDispositivo[] | null> {
  const perInstallazione = await supabase.from(TABELLA_DISPOSITIVI).select(SELEZIONE_DISPOSITIVO).eq('client_id', clientId).eq('installation_id', dati.installationId).returns<RigaDispositivo[]>();
  if (perInstallazione.error) return null;
  if (perInstallazione.data.length > 0) return perInstallazione.data;
  const perCodice = await supabase.from(TABELLA_DISPOSITIVI).select(SELEZIONE_DISPOSITIVO).eq('client_id', clientId).eq('token', dati.token).returns<RigaDispositivo[]>();
  return perCodice.error ? null : perCodice.data;
}

/**
 * All'avvio (dopo la lettura dello stato) e al rinnovo del codice: inserisce o aggiorna la riga di questo telefono per il
 * cliente. Una sola registrazione in corso; gli errori restano silenziosi (si riprova al prossimo avvio).
 */
export function registraDispositivo(clientId: string): Promise<EsitoRegistrazione> {
  if (registrazioneInCorso) return registrazioneInCorso;
  registrazioneInCorso = (async () => {
    try {
      const { data: sessione } = await supabase.auth.getSession();
      const userId = sessione.session?.user.id;
      if (!userId) return 'nonAutenticato' as const;
      const dati = await datiTelefono();
      if (!dati) return 'senzaCodice' as const;
      const adesso = new Date();
      const righe = await righeProprie(clientId, dati);
      if (!righe) return 'errore' as const;
      const esistente = scegliRiga(righe, dati);
      if (esistente) {
        const { error } = await supabase.from(TABELLA_DISPOSITIVI).update(modificaRegistrazione(esistente, dati, adesso)).eq('id', esistente.id);
        if (error) return 'errore' as const;
        corrente = { id: esistente.id, clientId, permesso: dati.permesso };
      } else {
        const { data, error } = await supabase.from(TABELLA_DISPOSITIVI).insert(rigaDaInserire(clientId, userId, dati, adesso)).select('id').returns<{ id: string }[]>();
        const inserita = data?.[0];
        if (error || !inserita) return 'errore' as const;
        corrente = { id: inserita.id, clientId, permesso: dati.permesso };
      }
      if (!ascoltoCodiceAttivo) {
        ascoltoCodiceAttivo = true;
        ascoltaCodice(() => {
          if (corrente) void registraDispositivo(corrente.clientId);
        });
      }
      return 'registrato' as const;
    } catch {
      return 'errore' as const;
    } finally {
      registrazioneInCorso = null;
    }
  })();
  return registrazioneInCorso;
}

/** Dopo la richiesta di sistema o al rientro in primo piano: se il permesso è cambiato, la riga si aggiorna. */
export async function aggiornaPermessoDispositivo(): Promise<void> {
  if (!corrente) return;
  const { permesso } = await statoPermesso();
  if (permesso === corrente.permesso) return;
  const riga = corrente;
  const { error } = await supabase.from(TABELLA_DISPOSITIVI).update(modificaPermesso(permesso, new Date())).eq('id', riga.id);
  if (!error && corrente?.id === riga.id) corrente = { ...riga, permesso };
}

/** "Esci": la riga di questo telefono si disattiva (prima della chiusura della sessione, che serve alla scrittura). */
export async function disattivaDispositivo(motivo: MotivoDisattivazione = 'logout'): Promise<void> {
  const riga = corrente;
  corrente = null;
  if (!riga) return;
  await supabase
    .from(TABELLA_DISPOSITIVI)
    .update(modificaDisattivazione(motivo, new Date()))
    .eq('id', riga.id)
    .then(() => {}, () => {});
}

/** Riga registrata in questa sessione (pagina di sviluppo). */
export function dispositivoCorrente(): Corrente | null {
  return corrente;
}
