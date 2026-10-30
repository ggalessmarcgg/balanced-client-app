// Carosello del primo accesso (step 6, contratto notifiche v0.2 §7): "visto" si salva sul telefono nel portachiavi,
// una volta per telefono e per tutti gli account (resta dopo "Esci", come i tutorial). La macchina a stati è pura in
// src/core/primoAccesso/carosello.ts; la schermata sta in src/ui/primoAccesso.
import { CHIAVE_PRIMO_ACCESSO, VERSIONE_CAROSELLO } from '@/core/primoAccesso/carosello';
import { leggi, rimuovi, scrivi } from '@/servizi/archivio';

let vistoInMemoria: boolean | null = null;

/** Vero se il carosello è già stato chiuso su questo telefono (versione corrente). */
export async function primoAccessoVisto(): Promise<boolean> {
  if (vistoInMemoria !== null) return vistoInMemoria;
  try {
    vistoInMemoria = (await leggi(CHIAVE_PRIMO_ACCESSO)) === VERSIONE_CAROSELLO;
  } catch {
    vistoInMemoria = false;
  }
  return vistoInMemoria;
}

/** Alla chiusura del carosello ("Attiva le notifiche" o "Più tardi"). */
export function segnaPrimoAccessoVisto(): void {
  vistoInMemoria = true;
  scrivi(CHIAVE_PRIMO_ACCESSO, VERSIONE_CAROSELLO).catch(() => {});
}

/** Solo per le prove (pagina di sviluppo): il carosello ricompare al prossimo avvio. */
export async function azzeraPrimoAccesso(): Promise<void> {
  vistoInMemoria = null;
  await rimuovi(CHIAVE_PRIMO_ACCESSO).catch(() => {});
}
