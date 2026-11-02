// Monitoraggio degli errori (Sentry, step 4): regole pure con cui l'app ripulisce ciò che manda a Sentry prima che
// parta (decisioni del 2/11/2026: nessun dato personale o sanitario). Qui non c'è Sentry: `src/servizi/monitoraggio.ts`
// passa queste funzioni a `beforeSend` e `beforeBreadcrumb`. Le forme sono quelle minime di evento e breadcrumb,
// dichiarate qui per restare TypeScript puro e verificabili con `node --test`.
//
// Cosa resta: tipo dell'errore, messaggio reso sicuro, stack con i punti del codice, nome della schermata (rotta
// con i parametri tolti), metodo, stato e indirizzo senza query delle chiamate di rete, nomi dei componenti toccati.
// Cosa va via: corpi e intestazioni delle richieste, query string (gli indirizzi di Supabase portano identificativi e
// date del diario), righe di console, nome del telefono, utente, qualunque testo lungo o libero nei messaggi.

/** Un breadcrumb nella forma che Sentry passa a `beforeBreadcrumb` (solo i campi che usiamo; i tipi di Sentry la estendono). */
export type BreadcrumbMinimo = {
  category?: string;
  type?: string;
  message?: string;
  data?: Record<string, unknown>;
};

/** Un evento nella forma che Sentry passa a `beforeSend` (solo i campi che tocchiamo; i tipi di Sentry la estendono). */
export type EventoMinimo = {
  message?: string;
  request?: unknown;
  user?: unknown;
  contexts?: Record<string, Record<string, unknown> | undefined>;
  exception?: { values?: { type?: string; value?: string }[] };
  breadcrumbs?: BreadcrumbMinimo[];
};

export const LUNGHEZZA_MASSIMA_MESSAGGIO = 160;
/** Oltre questa lunghezza un pezzo tra virgolette non è un nome di proprietà ma, verosimilmente, un contenuto. */
const LUNGHEZZA_MASSIMA_VIRGOLETTATO = 40;

const RE_UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const RE_EMAIL = /[^\s@"'<>]+@[^\s@"'<>]+\.[a-z]{2,}/gi;
const RE_URL = /https?:\/\/\S+/gi;
const RE_DATA = /\b\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?\b/g;
const RE_VIRGOLETTATO = /(["'“”‘’`])(.*?)\1/g;
const RE_JWT = /\b[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\b/g;

/** Indirizzo senza query string né frammento: resta l'host e il percorso (la tabella, la rotta), mai i filtri. */
export function pulisciUrl(url: unknown): string | undefined {
  if (typeof url !== 'string') return undefined;
  const taglio = url.search(/[?#]/);
  return taglio === -1 ? url : url.slice(0, taglio);
}

/**
 * Messaggio d'errore reso sicuro: via identificativi, email, indirizzi, date e token (sostituiti da un segnaposto), i
 * pezzi tra virgolette lunghi (contenuti) e tutto ciò che segue un a capo; al massimo 160 caratteri. I messaggi
 * tecnici ("Cannot read property 'x' of undefined", "Network request failed") restano leggibili.
 */
export function messaggioSicuro(testo: unknown): string | undefined {
  if (typeof testo !== 'string') return undefined;
  let m = testo.split(/\r?\n/)[0] ?? '';
  m = m.replace(RE_JWT, '<token>').replace(RE_URL, '<url>').replace(RE_EMAIL, '<email>').replace(RE_UUID, '<id>').replace(RE_DATA, '<data>');
  m = m.replace(RE_VIRGOLETTATO, (tutto, virgoletta: string, dentro: string) => (dentro.length > LUNGHEZZA_MASSIMA_VIRGOLETTATO ? `${virgoletta}<testo>${virgoletta}` : tutto));
  if (m.length > LUNGHEZZA_MASSIMA_MESSAGGIO) m = `${m.slice(0, LUNGHEZZA_MASSIMA_MESSAGGIO)}…`;
  return m;
}

/** Nome della schermata da una rotta di expo-router: senza query string, con i segmenti dinamici al posto dei valori. */
export function nomeSchermata(rotta: unknown): string | undefined {
  const pulita = pulisciUrl(rotta);
  if (pulita === undefined) return undefined;
  // Gli id delle rotte dinamiche (/revisione/<uuid>, /contenuti/<id>, /ricette/<id>) non sono dati personali, ma non
  // servono: resta il nome del segmento.
  return pulita.replace(RE_UUID, '[id]').replace(/\/(contenuti|ricette)\/[^/]+$/, '/$1/[id]');
}

/** Categorie di breadcrumb che portano dati utili e sicuri: per le altre restano categoria, tipo, livello e ora. */
const CATEGORIE_RETE = new Set(['fetch', 'xhr', 'http']);

/**
 * `beforeBreadcrumb`: niente console; delle chiamate di rete restano metodo, stato e indirizzo senza query; della
 * navigazione restano le schermate (senza parametri); dei tocchi il nome del componente; il resto senza dati.
 */
export function pulisciBreadcrumb<B extends BreadcrumbMinimo>(b: B | null | undefined): B | null {
  if (!b || b.category === 'console') return null;
  const d = b.data ?? {};
  if (b.category !== undefined && CATEGORIE_RETE.has(b.category)) {
    return { ...b, message: undefined, data: { method: d.method, status_code: d.status_code, url: pulisciUrl(d.url) } };
  }
  if (b.category === 'navigation') {
    return { ...b, message: undefined, data: { from: nomeSchermata(d.from), to: nomeSchermata(d.to) } };
  }
  return { ...b, message: messaggioSicuro(b.message), data: undefined };
}

/**
 * `beforeSend`: via la richiesta e l'utente; il nome del telefono (impostato dalla persona: "iPhone di …") via dal
 * contesto del dispositivo; messaggi dell'evento e delle eccezioni resi sicuri; breadcrumb ripuliti di nuovo (quelli
 * nativi non passano da `beforeBreadcrumb`).
 */
export function pulisciEvento<E extends EventoMinimo>(evento: E): E {
  const pulito: E = { ...evento };
  delete pulito.request;
  delete pulito.user;
  if (pulito.contexts?.device) {
    const { name: _nome, ...dispositivo } = pulito.contexts.device;
    pulito.contexts = { ...pulito.contexts, device: dispositivo };
  }
  if (pulito.message !== undefined) pulito.message = messaggioSicuro(pulito.message);
  if (pulito.exception?.values) {
    pulito.exception = { ...pulito.exception, values: pulito.exception.values.map((v) => ({ ...v, value: messaggioSicuro(v.value) })) };
  }
  if (pulito.breadcrumbs) pulito.breadcrumbs = pulito.breadcrumbs.map((b) => pulisciBreadcrumb(b)).filter((b) => b !== null);
  return pulito;
}

/** Etichette (tag) ammesse sugli eventi: solo valori scalari brevi, mai testi. */
export function etichetteSicure(campi: Record<string, unknown>): Record<string, string> {
  const etichette: Record<string, string> = {};
  for (const [k, v] of Object.entries(campi)) {
    if (typeof v === 'number' || typeof v === 'boolean') etichette[k] = String(v);
    else if (typeof v === 'string' && v.length > 0 && v.length <= 80) etichette[k] = v;
  }
  return etichette;
}
