// Copie locali su file nella sandbox dell'app (expo-file-system), in due cartelle (decisione del 21/10/2026):
// - "cache" (Paths.cache/balanced-cache): dati già sul server, rigenerabili (diario di oggi, settimana, giornate,
//   primo diario, revisioni con i testi); il sistema può svuotarla quando manca spazio;
// - "documenti" (Paths.document/balanced-attesa): copie di sicurezza delle modifiche non ancora confermate dal server
//   (bozza del diario, modifiche di giornate, "letto", aperture e letture delle revisioni); il sistema non la svuota
//   e l'app non cancella una copia prima della conferma.
// Il portachiavi (archivio.ts) resta per ciò che è piccolo e sensibile: sessione, stato del cliente, profili.
import { Directory, File, Paths } from 'expo-file-system';

export type Posizione = 'cache' | 'documenti';

const CARTELLE: Record<Posizione, { radice: () => Directory; nome: string }> = {
  cache: { radice: () => Paths.cache, nome: 'balanced-cache' },
  documenti: { radice: () => Paths.document, nome: 'balanced-attesa' },
};

function cartella(posizione: Posizione): Directory {
  const { radice, nome } = CARTELLE[posizione];
  const d = new Directory(radice(), nome);
  if (!d.exists) d.create({ intermediates: true, idempotent: true });
  return d;
}

function nomeFile(chiave: string): string {
  return `${chiave}.json`;
}

export async function leggiFile(chiave: string, posizione: Posizione = 'cache'): Promise<string | null> {
  try {
    const f = new File(cartella(posizione), nomeFile(chiave));
    if (!f.exists) return null;
    return await f.text();
  } catch {
    return null;
  }
}

export async function scriviFile(chiave: string, valore: string, posizione: Posizione = 'cache'): Promise<void> {
  const f = new File(cartella(posizione), nomeFile(chiave));
  await f.write(valore);
}

export async function rimuoviFile(chiave: string, posizione: Posizione = 'cache'): Promise<void> {
  try {
    const f = new File(cartella(posizione), nomeFile(chiave));
    if (f.exists) f.delete();
  } catch {
    // file già assente o non cancellabile: nulla da fare
  }
}

/** Solo nella cache: cancella i file il cui nome inizia con il prefisso, tranne quelli indicati (copie dei giorni passati del diario). */
export async function rimuoviFilePerPrefisso(prefisso: string, tranne: string[] = []): Promise<void> {
  try {
    const tenere = new Set(tranne.map(nomeFile));
    for (const voce of cartella('cache').list()) {
      if (voce instanceof File && voce.name.startsWith(prefisso) && !tenere.has(voce.name)) voce.delete();
    }
  } catch {
    // cartella non leggibile: le copie restano, verranno sovrascritte
  }
}

/** All'uscita: entrambe le cartelle (dopo il signOut le copie in attesa non potrebbero più essere inviate). */
export async function svuotaArchivioFile(): Promise<void> {
  for (const posizione of Object.keys(CARTELLE) as Posizione[]) {
    try {
      const { radice, nome } = CARTELLE[posizione];
      const d = new Directory(radice(), nome);
      if (d.exists) d.delete();
    } catch {
      // nulla da fare
    }
  }
}
