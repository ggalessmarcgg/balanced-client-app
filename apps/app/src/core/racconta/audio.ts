// Qualità della registrazione, limite di durata e misure derivate (decisioni dello step 10, lotto 1).
// Voce in mono AAC-LC dentro un contenitore m4a: è il formato che il server accetta come `audio/mp4`
// (docs/server-diario-vocale.md §3). Frequenza di campionamento 24 kHz e 48 kbit/s: il parlato resta nitido
// (nomi di alimenti, quantità) e un racconto di 3 minuti pesa circa 1,15 MB, sotto i 2 MB del server.

/** Durata massima di un racconto: 3 minuti (timer "m:ss / 3:00" in tutte le schermate di Figma). */
export const LIMITE_REGISTRAZIONE_MS = 180_000;

/**
 * Lettura periodica del registratore (tempo e livello della voce) ogni 100 ms, così il livello segue la voce senza
 * scatti. La registrazione si ferma da sola un passo di lettura prima del limite, così la durata dichiarata al server
 * non lo supera mai.
 */
export const INTERVALLO_LETTURA_MS = 100;
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
// Le barrette seguono il livello reale con un'onda continua (una fase per barretta) la cui ampiezza è il livello:
// nel silenzio restano quasi ferme, parlando si muovono.
export const BARRETTE_LIVELLO = 8;
export const ALTEZZA_BARRETTA = { minima: 4, massima: 16 } as const;
const SILENZIO_DB = -50;
/** Altezze di riferimento del disegno (barrette ferme con "Riduci movimento" e nella pagina di sviluppo). */
export const ALTEZZE_FIGMA = [6, 12, 16, 8, 5, 11, 14, 7] as const;
/** Onda: velocità angolare (rad/s) e fase iniziale di ogni barretta, diverse per non muoversi in blocco. */
export const ONDA_BARRETTE = ALTEZZE_FIGMA.map((h, i) => ({ velocita: 4 + (i % 4) * 1.3, fase: (h / 16) * Math.PI * 2 }));
/** Quota del livello che le barrette tengono sempre, il resto oscilla con l'onda. */
export const QUOTA_FISSA = 0.25;

/** Da dB (o assente) a 0–1. */
export function livelloDaDecibel(db: number | undefined | null): number {
  if (db === undefined || db === null || !Number.isFinite(db)) return 0;
  return Math.min(1, Math.max(0, (db - SILENZIO_DB) / -SILENZIO_DB));
}

/** Altezza della barretta `i` all'istante `t` (secondi) con il livello 0–1 corrente. Pura: la usa anche il thread dell'interfaccia. */
export function altezzaBarretta(i: number, livello: number, t: number): number {
  'worklet';
  const { minima, massima } = ALTEZZA_BARRETTA;
  const onda = ONDA_BARRETTE[i] ?? { velocita: 5, fase: 0 };
  const oscillazione = QUOTA_FISSA + (1 - QUOTA_FISSA) * (0.5 + 0.5 * Math.sin(t * onda.velocita + onda.fase));
  return minima + (massima - minima) * Math.min(1, Math.max(0, livello)) * oscillazione;
}
