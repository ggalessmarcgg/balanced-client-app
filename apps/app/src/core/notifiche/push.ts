// Notifiche push (step 6, contratto notifiche v0.2 §2, §5, §6; docs/server-notifiche.md §3): le due categorie Android
// con gli identificativi usati dal server, i dati che arrivano con la push (`data` di FCM, tutte stringhe) e la
// destinazione da aprire al tocco. Logica pura: chi legge la notifica (expo-notifications) sta in servizi/.

/** Categorie Android (canali), create all'avvio prima di chiedere il permesso; id = quelli del server (`channel_id`). */
export const CANALI_ANDROID = [
  { id: 'nutrizionista', nome: 'Dalla tua nutrizionista' },
  { id: 'promemoria', nome: 'Promemoria' },
] as const;
export type IdCanale = (typeof CANALI_ANDROID)[number]['id'];

/** Tipi con la push (server §3); i promemoria vanno nella categoria "Promemoria", il resto "Dalla tua nutrizionista". */
export const TIPI_PROMEMORIA = ['diary_reminder', 'measurement_update', 'weight_update'] as const;

export function canalePerTipo(tipo: string | null): IdCanale {
  return tipo && (TIPI_PROMEMORIA as readonly string[]).includes(tipo) ? 'promemoria' : 'nutrizionista';
}

/** Destinazioni del contratto §2 (dove si apre la notifica). */
export type DestinazionePush =
  | { tipo: 'giornata'; submissionId: string }
  | { tipo: 'revisione'; id: string }
  | { tipo: 'revisioni' }
  | { tipo: 'nutrizionista' }
  | { tipo: 'piano' }
  | { tipo: 'oggi' }
  | { tipo: 'pesoMisure' };

/** `data` della push come la manda il server (server §3, "Dati per l'apertura"): tutte stringhe, nessun contenuto. */
export type DatiPush = {
  tipo: string | null;
  riferimento: string | null;
  tabella: string | null;
  destinazione: string | null;
  notificaId: string | null;
  categoria: string | null;
};

function stringa(v: unknown): string | null {
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : null;
}

/** Legge i dati della push da un oggetto qualunque (data di FCM/APNs o di una notifica locale di prova). */
export function leggiDatiPush(data: unknown): DatiPush {
  const d = (typeof data === 'object' && data !== null ? data : {}) as Record<string, unknown>;
  return {
    tipo: stringa(d.tipo),
    riferimento: stringa(d.riferimento),
    tabella: stringa(d.tabella),
    destinazione: stringa(d.destinazione),
    notificaId: stringa(d.notifica_id),
    categoria: stringa(d.categoria),
  };
}

/** Destinazione per tipo (contratto §2), usata quando la push non porta `destinazione`. */
export const DESTINAZIONE_PER_TIPO: Record<string, DestinazionePush['tipo']> = {
  nutritionist_comment: 'giornata',
  review_sent: 'revisione',
  review_unlocked: 'revisioni',
  holiday_replacement: 'nutrizionista',
  plan_sent: 'piano',
  diary_reminder: 'oggi',
  measurement_update: 'pesoMisure',
};

const DESTINAZIONE_PER_NOME: Record<string, DestinazionePush['tipo']> = {
  giornata: 'giornata',
  revisione: 'revisione',
  revisioni: 'revisioni',
  nutrizionista: 'nutrizionista',
  piano: 'piano',
  oggi: 'oggi',
  peso_misure: 'pesoMisure',
};

/**
 * Destinazione da aprire: prima `destinazione` della push, altrimenti dal tipo. Giornata e revisione hanno bisogno del
 * riferimento (id di daily_submissions / client_reviews): senza, null (si apre solo l'app).
 */
export function destinazioneDaDati(dati: DatiPush): DestinazionePush | null {
  const nome = (dati.destinazione && DESTINAZIONE_PER_NOME[dati.destinazione]) || (dati.tipo && DESTINAZIONE_PER_TIPO[dati.tipo]) || null;
  if (!nome) return null;
  switch (nome) {
    case 'giornata':
      return dati.riferimento ? { tipo: 'giornata', submissionId: dati.riferimento } : null;
    case 'revisione':
      return dati.riferimento ? { tipo: 'revisione', id: dati.riferimento } : null;
    default:
      return { tipo: nome };
  }
}

/** Scheda della barra da cui "indietro" riparte (contratto §6: la pagina aperta dalla notifica torna alla scheda di partenza). */
export type SchedaDiPartenza = 'oggi' | 'piano' | 'revisioni';

export function schedaDiPartenza(d: DestinazionePush): SchedaDiPartenza {
  switch (d.tipo) {
    case 'revisione':
    case 'revisioni':
      return 'revisioni';
    case 'piano':
      return 'piano';
    default:
      return 'oggi';
  }
}

/** Rotta dell'app per la destinazione; la giornata vuole la data (risolta dall'id da chi apre). */
export type RottaDestinazione = { scheda: SchedaDiPartenza; pagina: { pathname: string; params?: Record<string, string> } | null; parametriScheda?: Record<string, string> };

export function rottaDestinazione(d: DestinazionePush, dataGiornata: string | null = null): RottaDestinazione {
  const scheda = schedaDiPartenza(d);
  switch (d.tipo) {
    case 'giornata':
      return { scheda, pagina: null, parametriScheda: dataGiornata ? { giornata: dataGiornata } : undefined };
    case 'revisione':
      return { scheda, pagina: { pathname: '/revisione/[id]', params: { id: d.id } } };
    case 'nutrizionista':
      return { scheda, pagina: { pathname: '/nutrizionista' } };
    case 'pesoMisure':
      return { scheda, pagina: { pathname: '/peso-misure' } };
    default:
      return { scheda, pagina: null };
  }
}
