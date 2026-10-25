// Copia del piano salvata sul telefono (cartella cache, src/servizi/piano.ts). La copia porta una versione del formato:
// dalla v0.6 del contratto di lettura ogni riga ha il proprio `id`, e una copia salvata prima (senza id) con "invariato"
// non li riceverebbe finché il piano non cambia. Una copia di un'altra versione si scarta una volta sola: la prima
// lettura dopo l'aggiornamento parte senza versione nota e il server rimanda il piano intero, che sovrascrive la copia.
import { interpretaRisposta, type PianoServer } from './tipi.ts';

/** Versione del formato della copia: 2 = righe con id (contratto v0.6, 25/10/2026). */
export const VERSIONE_COPIA = 2;

export type CopiaPiano = { versione: number; clientId: string; piano: PianoServer; letto: string };

export function nuovaCopia(clientId: string, piano: PianoServer, adesso: Date): CopiaPiano {
  return { versione: VERSIONE_COPIA, clientId, piano, letto: adesso.toISOString() };
}

/**
 * Il piano della copia, se la copia è di questo cliente, della versione corrente e nella forma del contratto; altrimenti
 * null (copia assente, corrotta, di un altro cliente o di una versione precedente: si scarta e si rilegge dal server).
 */
export function pianoDallaCopia(testo: string | null, clientId: string): PianoServer | null {
  if (!testo) return null;
  let grezzo: unknown;
  try {
    grezzo = JSON.parse(testo);
  } catch {
    return null;
  }
  if (typeof grezzo !== 'object' || grezzo === null || Array.isArray(grezzo)) return null;
  const copia = grezzo as Partial<CopiaPiano>;
  if (copia.versione !== VERSIONE_COPIA || copia.clientId !== clientId || typeof copia.piano !== 'object' || copia.piano === null) return null;
  const risposta = interpretaRisposta({ esito: 'piano', ...copia.piano });
  return risposta && risposta.esito === 'piano' ? risposta.piano : null;
}
