// Audio registrato ma non ancora trascritto (senza rete, errore del server, app chiusa): resta nella cartella documenti
// del telefono, con una nota (cliente, giorno del diario, durata). Vale solo per il giorno del diario: a fine giornata
// si cancella (contratto §1.6), e alla prossima apertura di "Racconta" la trascrizione riparte da sola.

export type AudioRacconto = {
  /** Percorso locale del file m4a (cartella documenti, mai la cache). */
  uri: string;
  durataMs: number;
  /** Giorno del diario (YYYY-MM-DD, ora italiana) a cui appartiene il racconto. */
  data: string;
};

export type AudioInAttesa = AudioRacconto & { clientId: string; salvatoAlle: string };

export function notaAudioInAttesa(audio: AudioRacconto, clientId: string, adesso: string): AudioInAttesa {
  return { ...audio, clientId, salvatoAlle: adesso };
}

/** Esito della lettura della nota salvata: l'audio di oggi da trascrivere, o un file scaduto da cancellare. */
export type LetturaAttesa = { tipo: 'nessuno' } | { tipo: 'daTrascrivere'; audio: AudioRacconto } | { tipo: 'scaduto'; uri: string };

function notaValida(grezzo: unknown): grezzo is AudioInAttesa {
  if (typeof grezzo !== 'object' || grezzo === null) return false;
  const n = grezzo as Partial<AudioInAttesa>;
  return typeof n.uri === 'string' && n.uri.length > 0 && typeof n.durataMs === 'number' && typeof n.data === 'string' && typeof n.clientId === 'string';
}

/**
 * La nota letta da disco (forma non garantita): è da trascrivere solo se è dello stesso cliente e del giorno di oggi;
 * se è di un altro giorno il file va cancellato; se è di un altro cliente o malformata non si tocca nulla.
 */
export function leggiNotaAttesa(grezzo: unknown, clientId: string, oggi: string): LetturaAttesa {
  if (!notaValida(grezzo) || grezzo.clientId !== clientId) return { tipo: 'nessuno' };
  if (grezzo.data !== oggi) return { tipo: 'scaduto', uri: grezzo.uri };
  return { tipo: 'daTrascrivere', audio: { uri: grezzo.uri, durataMs: grezzo.durataMs, data: grezzo.data } };
}

/** Nome del file di registrazione (senza estensione): uno per giorno, così un nuovo racconto sostituisce il precedente. */
export function nomeFileRegistrazione(data: string): string {
  return `racconto-${data}`;
}

/** Tra i file di registrazione trovati su disco, quelli da cancellare: tutti tranne quello della nota di oggi. */
export function fileDaCancellare(nomi: readonly string[], daTenere: string | null): string[] {
  return nomi.filter((n) => n.startsWith('racconto-') && n !== daTenere);
}

// ---- Testo trascritto in attesa della creazione del diario ------------------------------------------------------------
// Il racconto trascritto (anche corretto a mano) resta nella cartella documenti fino a fine giornata o alla creazione
// del diario (decisione del 23/10/2026): chiudendo l'app non si perde e, riaprendo "Racconta" lo stesso giorno, si
// riparte da "Il tuo racconto".

export type TestoRacconto = { testo: string; durataMs: number; data: string };
export type TestoInAttesa = TestoRacconto & { clientId: string; salvatoAlle: string };

export function notaTestoInAttesa(racconto: TestoRacconto, clientId: string, adesso: string): TestoInAttesa {
  return { ...racconto, clientId, salvatoAlle: adesso };
}

export type LetturaTesto = { tipo: 'nessuno' } | { tipo: 'daRiprendere'; racconto: TestoRacconto } | { tipo: 'scaduto' };

function notaTestoValida(grezzo: unknown): grezzo is TestoInAttesa {
  if (typeof grezzo !== 'object' || grezzo === null) return false;
  const n = grezzo as Partial<TestoInAttesa>;
  return typeof n.testo === 'string' && typeof n.durataMs === 'number' && typeof n.data === 'string' && typeof n.clientId === 'string';
}

/** La nota del testo letta da disco: da riprendere solo se dello stesso cliente e di oggi; di un altro giorno è scaduta. */
export function leggiNotaTesto(grezzo: unknown, clientId: string, oggi: string): LetturaTesto {
  if (!notaTestoValida(grezzo) || grezzo.clientId !== clientId) return { tipo: 'nessuno' };
  if (grezzo.data !== oggi) return { tipo: 'scaduto' };
  return { tipo: 'daRiprendere', racconto: { testo: grezzo.testo, durataMs: grezzo.durataMs, data: grezzo.data } };
}
