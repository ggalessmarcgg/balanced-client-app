// Copie locali che crescono con i dati del cliente (diario, revisioni): file JSON nella sandbox dell'app
// (expo-file-system, cartella cache: protetta dal sistema, non inclusa nei backup, cancellabile dal sistema se lo
// spazio manca e svuotata all'uscita). Il portachiavi (archivio.ts) resta per ciò che è piccolo e sensibile: sessione,
// stato del cliente, profili delle nutrizioniste. Decisione del 21/10/2026.
import { Directory, File, Paths } from 'expo-file-system';

const CARTELLA = 'balanced-cache';

function cartella(): Directory {
  const d = new Directory(Paths.cache, CARTELLA);
  if (!d.exists) d.create({ intermediates: true, idempotent: true });
  return d;
}

function nomeFile(chiave: string): string {
  return `${chiave}.json`;
}

export async function leggiFile(chiave: string): Promise<string | null> {
  try {
    const f = new File(cartella(), nomeFile(chiave));
    if (!f.exists) return null;
    return await f.text();
  } catch {
    return null;
  }
}

export async function scriviFile(chiave: string, valore: string): Promise<void> {
  const f = new File(cartella(), nomeFile(chiave));
  await f.write(valore);
}

export async function rimuoviFile(chiave: string): Promise<void> {
  try {
    const f = new File(cartella(), nomeFile(chiave));
    if (f.exists) f.delete();
  } catch {
    // file già assente o non cancellabile: nulla da fare
  }
}

/** Cancella i file il cui nome inizia con il prefisso, tranne quelli indicati (es. le copie dei giorni passati del diario). */
export async function rimuoviFilePerPrefisso(prefisso: string, tranne: string[] = []): Promise<void> {
  try {
    const tenere = new Set(tranne.map(nomeFile));
    for (const voce of cartella().list()) {
      if (voce instanceof File && voce.name.startsWith(prefisso) && !tenere.has(voce.name)) voce.delete();
    }
  } catch {
    // cartella non leggibile: le copie restano, verranno sovrascritte
  }
}

/** All'uscita: tutta la cartella delle copie locali. */
export async function svuotaArchivioFile(): Promise<void> {
  try {
    const d = new Directory(Paths.cache, CARTELLA);
    if (d.exists) d.delete();
  } catch {
    // nulla da fare
  }
}
