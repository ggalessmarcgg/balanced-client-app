// Carosello del primo accesso (step 6, contratto notifiche v0.2 §7; Figma Primo accesso · 1–5, sezione 586:4904):
// cinque pagine dopo il login e prima di Oggi, una volta per telefono. "Salta" nelle pagine 1–3 porta alla pagina 4
// (consenso AI, §8), che non ha "Salta"; la pagina 5 chiede il permesso delle notifiche. Logica pura.

export const NUMERO_PAGINE = 5;
/** Indici delle pagine (0-based). */
export const PAGINA = { benvenuto: 0, diario: 1, revisioni: 2, ai: 3, notifiche: 4 } as const;

export type EventoCarosello = 'avanti' | 'salta' | 'accetto' | 'nonOra' | 'attiva' | 'piuTardi';
export type EffettoCarosello = 'registraConsenso' | 'chiediPermesso' | 'fine';
export type Transizione = { pagina: number; effetti: EffettoCarosello[] };

/** "Salta" c'è solo nelle pagine 1–3 (contratto §7). */
export function mostraSalta(pagina: number): boolean {
  return pagina < PAGINA.ai;
}

export function riduci(pagina: number, evento: EventoCarosello): Transizione {
  switch (evento) {
    case 'avanti':
      return pagina < PAGINA.ai ? { pagina: pagina + 1, effetti: [] } : { pagina, effetti: [] };
    case 'salta':
      return mostraSalta(pagina) ? { pagina: PAGINA.ai, effetti: [] } : { pagina, effetti: [] };
    case 'accetto':
      return pagina === PAGINA.ai ? { pagina: PAGINA.notifiche, effetti: ['registraConsenso'] } : { pagina, effetti: [] };
    case 'nonOra':
      return pagina === PAGINA.ai ? { pagina: PAGINA.notifiche, effetti: [] } : { pagina, effetti: [] };
    case 'attiva':
      return pagina === PAGINA.notifiche ? { pagina, effetti: ['chiediPermesso', 'fine'] } : { pagina, effetti: [] };
    case 'piuTardi':
      return pagina === PAGINA.notifiche ? { pagina, effetti: ['fine'] } : { pagina, effetti: [] };
  }
}

/** Testi delle cinque pagine (Figma 586:4905, 586:4941, 586:4995, 586:5043, 586:5154; pagina 4 nella versione del 30/10/2026). */
export type TestoPagina = { titolo: { prima: string; accento: string; dopo: string }; testo: string };
export const TESTI_PAGINE: readonly TestoPagina[] = [
  { titolo: { prima: 'Ti diamo il benvenuto in ', accento: 'Balanced.', dopo: '' }, testo: 'Inizia il tuo percorso con la tua nutrizionista dedicata. Ti seguirà ogni giorno, qui nell’app!' },
  { titolo: { prima: 'Racconta la tua ', accento: 'giornata', dopo: '' }, testo: 'Condividi cosa hai mangiato e come ti sei sentito: scrivendo, oppure raccontandolo a voce.' },
  { titolo: { prima: 'Al tuo fianco, ', accento: 'ogni giorno', dopo: '' }, testo: 'La tua nutrizionista legge le tue giornate e le commenta. Ogni 7 diari condivisi ricevi una revisione con cosa sta funzionando e i consigli per migliorare.' },
  { titolo: { prima: 'L’', accento: 'AI ', dopo: 'di Balanced al tuo fianco' }, testo: 'Racconta il diario a voce, sostituisci un alimento o trova una ricetta con un tocco.' },
  { titolo: { prima: 'Resta in ', accento: 'contatto', dopo: '' }, testo: 'Attiva le notifiche per ricevere subito i commenti e le revisioni della tua nutrizionista.' },
];

export const TESTI_CAROSELLO = {
  salta: 'Salta',
  avanti: 'Avanti',
  attiva: 'Attiva le notifiche',
  piuTardi: 'Più tardi',
  /** Notifiche di esempio della pagina 5 (Figma 586:5190 e seguenti). */
  mittente: 'Balanced · ora',
  notificheEsempio: ['Nuovo commento della nutrizionista', 'Leggi la tua revisione', 'Il tuo piano alimentare è pronto!'],
} as const;

/** Chiave nel portachiavi (per telefono, resta dopo "Esci" come i tutorial) e versione del carosello. */
export const CHIAVE_PRIMO_ACCESSO = 'balanced.primo-accesso';
export const VERSIONE_CAROSELLO = '1';
