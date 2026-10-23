// Qualità della registrazione, limite di durata e misure derivate (decisioni dello step 10, lotto 1).
// Voce in mono AAC-LC dentro un contenitore m4a: è il formato che il server accetta come `audio/mp4`
// (docs/server-diario-vocale.md §3). Frequenza di campionamento 24 kHz e 48 kbit/s: il parlato resta nitido
// (nomi di alimenti, quantità) e un racconto di 3 minuti pesa poco più di 1 MB, molto sotto i 6 MB del server.

/** Durata massima di un racconto: 3 minuti (timer "m:ss / 3:00" in tutte le schermate di Figma). */
export const LIMITE_REGISTRAZIONE_MS = 180_000;

/** La registrazione si ferma da sola un passo di lettura prima del limite, così la durata dichiarata al server non lo supera mai. */
export const INTERVALLO_LETTURA_MS = 250;
export const SOGLIA_ARRESTO_MS = LIMITE_REGISTRAZIONE_MS - INTERVALLO_LETTURA_MS;

export const QUALITA_VOCE = {
  estensione: '.m4a',
  /** Tipo MIME dichiarato al server per l'AAC in contenitore m4a. */
  tipoMime: 'audio/mp4',
  campionamentoHz: 24_000,
  canali: 1,
  bitrateBitAlSecondo: 48_000,
  /** Margine per l'intestazione del contenitore m4a (atomi, tabelle dei campioni): nell'ordine di qualche KB. */
  margineContenitoreByte: 64 * 1024,
} as const;

/** Dimensione massima attesa del file di un racconto lungo quanto il limite (bit/s × s / 8 + contenitore). */
export function dimensioneMassimaByte(): number {
  return Math.ceil((QUALITA_VOCE.bitrateBitAlSecondo * LIMITE_REGISTRAZIONE_MS) / 1000 / 8) + QUALITA_VOCE.margineContenitoreByte;
}

/** Vero quando la registrazione ha raggiunto la soglia di arresto. */
export function limiteRaggiunto(durataMs: number): boolean {
  return durataMs >= SOGLIA_ARRESTO_MS;
}

/** Durata da dichiarare al server: mai oltre il limite (arrotondamenti della lettura periodica). */
export function durataDichiarata(durataMs: number): number {
  return Math.min(Math.max(0, Math.round(durataMs)), LIMITE_REGISTRAZIONE_MS);
}

/** "0:42" (minuti:secondi, secondi su due cifre, troncati). */
export function formattaDurata(ms: number): string {
  const secondiTotali = Math.max(0, Math.floor(ms / 1000));
  const minuti = Math.floor(secondiTotali / 60);
  const secondi = secondiTotali % 60;
  return `${minuti}:${String(secondi).padStart(2, '0')}`;
}

/** "0:42 / 3:00": il timer sotto l'etichetta e sopra il pulsante di registrazione. */
export function etichettaTimer(ms: number): string {
  return `${formattaDurata(ms)} / ${formattaDurata(LIMITE_REGISTRAZIONE_MS)}`;
}

/** "Il tuo racconto · 1:28": titolo della card del racconto. */
export function titoloRacconto(durataMs: number): string {
  return `Il tuo racconto · ${formattaDurata(durataMs)}`;
}

// Livello voce (Figma "Livello voce", 8 barrette alte da 5 a 16): il livello misurato dal registratore è in dB
// (0 = massimo, −160 = silenzio). Tra −50 dB e 0 dB si va da barretta minima a piena; sotto −50 dB è silenzio.
export const BARRETTE_LIVELLO = 8;
export const ALTEZZA_BARRETTA = { minima: 4, massima: 16 } as const;
const SILENZIO_DB = -50;

/** Da dB (o assente) a 0–1. */
export function livelloDaDecibel(db: number | undefined | null): number {
  if (db === undefined || db === null || !Number.isFinite(db)) return 0;
  return Math.min(1, Math.max(0, (db - SILENZIO_DB) / -SILENZIO_DB));
}

/** Aggiunge un livello alla storia e tiene gli ultimi `BARRETTE_LIVELLO`. */
export function aggiungiLivello(storia: readonly number[], livello: number): number[] {
  return [...storia, livello].slice(-BARRETTE_LIVELLO);
}

/** Altezze delle barrette (sempre 8): le più vecchie a sinistra; senza storia, barrette minime. */
export function altezzeBarrette(storia: readonly number[]): number[] {
  const { minima, massima } = ALTEZZA_BARRETTA;
  const riempite = [...Array<number>(Math.max(0, BARRETTE_LIVELLO - storia.length)).fill(0), ...storia.slice(-BARRETTE_LIVELLO)];
  return riempite.map((l) => Math.round(minima + (massima - minima) * l));
}
