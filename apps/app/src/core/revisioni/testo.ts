// Testo della revisione (censimento step 7, §2): client_reviews.review_text è un oggetto con le chiavi generale,
// correlazione e spunti_consigli, testo semplice con gli a capo. Le sezioni vuote si nascondono; le righe che iniziano
// con "- ", "* " o "• " diventano voci di un elenco puntato; il "**" residuo (1 revisione su 5.981) si toglie.

export const CHIAVI_SEZIONI = ['generale', 'correlazione', 'spunti_consigli'] as const;
export type ChiaveSezione = (typeof CHIAVI_SEZIONI)[number];

/** Etichette uguali a web app, CRM, trigger sync_agent_revision_v2 e Figma 494:2487. */
export const ETICHETTE_SEZIONI: Record<ChiaveSezione, string> = {
  generale: 'Generale',
  correlazione: 'Correlazione',
  spunti_consigli: 'Spunti e consigli',
};

export type BloccoTesto = { tipo: 'paragrafo'; testo: string } | { tipo: 'elenco'; voci: string[] };
export type SezioneRevisione = { chiave: ChiaveSezione; etichetta: string; blocchi: BloccoTesto[] };

export type TestoRevisione = {
  /** Solo le sezioni con contenuto, nell'ordine generale, correlazione, spunti e consigli. */
  sezioni: SezioneRevisione[];
  /** Prima riga del testo (Generale, o la prima sezione piena), per l'elenco delle revisioni passate. */
  incipit: string;
  /** Testo della sezione Generale con gli a capo, per la Card revisione "Nuova" (ritagliato dalla card). */
  anteprima: string;
};

const MARCATORE_ELENCO = /^\s*(?:-|\*|•)\s+/;
const GRASSETTO_RESIDUO = /\*\*/g;

function pulisciRiga(riga: string): string {
  return riga.replace(GRASSETTO_RESIDUO, '').replace(/\s+$/, '');
}

/** Blocchi di una sezione: paragrafi (a capo preservati, separati da righe vuote) ed elenchi puntati. */
export function blocchiDiSezione(testo: string): BloccoTesto[] {
  const blocchi: BloccoTesto[] = [];
  let paragrafo: string[] = [];
  let elenco: string[] = [];
  const chiudiParagrafo = () => {
    if (paragrafo.length > 0) blocchi.push({ tipo: 'paragrafo', testo: paragrafo.join('\n') });
    paragrafo = [];
  };
  const chiudiElenco = () => {
    if (elenco.length > 0) blocchi.push({ tipo: 'elenco', voci: elenco });
    elenco = [];
  };
  for (const grezza of testo.replace(/\r\n?/g, '\n').split('\n')) {
    const riga = pulisciRiga(grezza);
    if (riga.trim() === '') {
      chiudiParagrafo();
      chiudiElenco();
      continue;
    }
    if (MARCATORE_ELENCO.test(riga)) {
      chiudiParagrafo();
      elenco.push(riga.replace(MARCATORE_ELENCO, '').trim());
      continue;
    }
    chiudiElenco();
    paragrafo.push(riga.trim());
  }
  chiudiParagrafo();
  chiudiElenco();
  return blocchi;
}

function testoDiBlocco(b: BloccoTesto): string {
  return b.tipo === 'paragrafo' ? b.testo : b.voci.join('\n');
}

function valoreSezione(oggetto: Record<string, unknown>, chiave: ChiaveSezione): string {
  const v = oggetto[chiave];
  return typeof v === 'string' ? v : '';
}

/** Legge review_text (jsonb, forma non garantita dal database): oggetto con le tre chiavi; altro → nessuna sezione. */
export function testoRevisione(review_text: unknown): TestoRevisione {
  const oggetto = typeof review_text === 'object' && review_text !== null && !Array.isArray(review_text) ? (review_text as Record<string, unknown>) : {};
  const sezioni: SezioneRevisione[] = [];
  let anteprima = '';
  for (const chiave of CHIAVI_SEZIONI) {
    const blocchi = blocchiDiSezione(valoreSezione(oggetto, chiave));
    if (blocchi.length === 0) continue;
    sezioni.push({ chiave, etichetta: ETICHETTE_SEZIONI[chiave], blocchi });
    if (chiave === 'generale') anteprima = blocchi.map(testoDiBlocco).join('\n');
  }
  const prima = sezioni[0];
  if (!anteprima && prima) anteprima = prima.blocchi.map(testoDiBlocco).join('\n');
  const incipit = (anteprima.split('\n').find((r) => r.trim() !== '') ?? '').replace(/\s+/g, ' ').trim();
  return { sezioni, incipit, anteprima };
}
