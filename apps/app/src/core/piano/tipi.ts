// Piano alimentare (step 8): la risposta della funzione get_my_current_nutrition_plan, l'unica lettura del piano
// (contratto di lettura dei piani v0.5, §6). L'app non legge mai le tabelle nutrition_* né plans. La forma qui sotto
// è quella del JSON della funzione; interpretaRisposta la verifica e porta a null i valori fuori formato.

export const FUNZIONE_PIANO = 'get_my_current_nutrition_plan';

/** Versione già nota all'app: id e updated_at della copia (rimandato tal quale, confronto al millisecondo). */
export type ParametriPiano = { p_known_plan_id: string; p_known_updated_at: string };

export type TipoPiano = 'fisso' | 'variabile';
export type TipoQuantita = 'precisa' | 'a_piacere' | 'libero';
export type UnitaMisura = 'g' | 'ml';
export type CategoriaSezione = 'carboidrati' | 'proteine' | 'grassi' | 'fibre' | 'zuccheri';

/** Ordine fisso dei gruppi nel variabile (decisione dello step 8, lotto 1). */
export const CATEGORIE: readonly CategoriaSezione[] = ['carboidrati', 'proteine', 'grassi', 'fibre', 'zuccheri'];
export const ETICHETTE_CATEGORIA: Record<CategoriaSezione, string> = {
  carboidrati: 'Carboidrati',
  proteine: 'Proteine',
  grassi: 'Grassi',
  fibre: 'Fibre',
  zuccheri: 'Zuccheri',
};

export type RigaServer = {
  position: number;
  name: string | null;
  quantity_type: TipoQuantita | null;
  quantity: number | null;
  measure_type: UnitaMisura | null;
  practical_quantity: string | null;
};
export type SezioneServer = { category: CategoriaSezione | null; position: number; rows: RigaServer[] };
export type PastoServer = { id: string; position: number; name: string; sections: SezioneServer[] };
export type GiornoServer = { day_index: number; name: string; meals: PastoServer[] };
export type IndicazioneServer = { position: number; title: string | null; body: string | null };
export type PianoServer = {
  id: string;
  plan_type: TipoPiano;
  sent_at: string | null;
  updated_at: string;
  days: GiornoServer[];
  indications: IndicazioneServer[];
};

export type RispostaPiano = { esito: 'nessun_piano' } | { esito: 'invariato' } | { esito: 'piano'; piano: PianoServer };

const TIPI_PIANO: readonly string[] = ['fisso', 'variabile'];
const TIPI_QUANTITA: readonly string[] = ['precisa', 'a_piacere', 'libero'];
const UNITA: readonly string[] = ['g', 'ml'];

function oggetto(d: unknown): Record<string, unknown> | null {
  return d !== null && typeof d === 'object' && !Array.isArray(d) ? (d as Record<string, unknown>) : null;
}
function testo(d: unknown): string | null {
  return typeof d === 'string' ? d : null;
}
function numero(d: unknown): number | null {
  if (typeof d === 'number') return Number.isFinite(d) ? d : null;
  if (typeof d === 'string' && d.trim() !== '') {
    const n = Number(d.replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}
function elenco<T>(d: unknown, leggi: (voce: unknown) => T | null): T[] {
  if (!Array.isArray(d)) return [];
  const voci: T[] = [];
  for (const v of d) {
    const letta = leggi(v);
    if (letta) voci.push(letta);
  }
  return voci;
}
function tra<T extends string>(d: unknown, ammessi: readonly string[]): T | null {
  return typeof d === 'string' && ammessi.includes(d) ? (d as T) : null;
}

function leggiRiga(d: unknown): RigaServer | null {
  const o = oggetto(d);
  if (!o) return null;
  return {
    position: numero(o.position) ?? 0,
    name: testo(o.name),
    quantity_type: tra<TipoQuantita>(o.quantity_type, TIPI_QUANTITA),
    quantity: numero(o.quantity),
    measure_type: tra<UnitaMisura>(o.measure_type, UNITA),
    practical_quantity: testo(o.practical_quantity),
  };
}
function leggiSezione(d: unknown): SezioneServer | null {
  const o = oggetto(d);
  if (!o) return null;
  return { category: tra<CategoriaSezione>(o.category, CATEGORIE), position: numero(o.position) ?? 0, rows: elenco(o.rows, leggiRiga) };
}
function leggiPasto(d: unknown): PastoServer | null {
  const o = oggetto(d);
  const id = o ? testo(o.id) : null;
  if (!o || !id) return null;
  return { id, position: numero(o.position) ?? 0, name: testo(o.name) ?? '', sections: elenco(o.sections, leggiSezione) };
}
function leggiGiorno(d: unknown): GiornoServer | null {
  const o = oggetto(d);
  if (!o) return null;
  return { day_index: numero(o.day_index) ?? 0, name: testo(o.name) ?? '', meals: elenco(o.meals, leggiPasto) };
}
function leggiIndicazione(d: unknown): IndicazioneServer | null {
  const o = oggetto(d);
  if (!o) return null;
  return { position: numero(o.position) ?? 0, title: testo(o.title), body: testo(o.body) };
}

/**
 * Legge il JSON della funzione. `null` se la risposta non ha la forma del contratto (esito sconosciuto, piano senza
 * id, tipo o updated_at): per l'app è un errore di lettura, non "nessun piano". Dentro il piano i valori fuori
 * formato diventano null o vuoti e li nasconde la composizione.
 */
export function interpretaRisposta(dato: unknown): RispostaPiano | null {
  const o = oggetto(dato);
  if (!o) return null;
  switch (o.esito) {
    case 'nessun_piano':
      return { esito: 'nessun_piano' };
    case 'invariato':
      return { esito: 'invariato' };
    case 'piano': {
      const id = testo(o.id);
      const plan_type = tra<TipoPiano>(o.plan_type, TIPI_PIANO);
      const updated_at = testo(o.updated_at);
      if (!id || !plan_type || !updated_at) return null;
      return {
        esito: 'piano',
        piano: { id, plan_type, sent_at: testo(o.sent_at), updated_at, days: elenco(o.days, leggiGiorno), indications: elenco(o.indications, leggiIndicazione) },
      };
    }
    default:
      return null;
  }
}

/** Parametri della chiamata con la versione nota (nessun parametro senza una copia). */
export function parametriVersione(copia: Pick<PianoServer, 'id' | 'updated_at'> | null): ParametriPiano | undefined {
  return copia ? { p_known_plan_id: copia.id, p_known_updated_at: copia.updated_at } : undefined;
}
