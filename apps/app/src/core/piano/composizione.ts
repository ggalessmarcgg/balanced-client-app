// Composizione del piano per la visualizzazione (step 8, lotto 1): nasconde sezioni, pasti e giorni vuoti, ordina per
// position, fonde le sezioni della stessa categoria nel variabile e prepara i testi delle righe. Un piano che resta
// senza righe vale come "nessun piano" (in app "Piano in elaborazione").
import { etichettaGiornoMese, INIZIALI_SETTIMANA } from '../diario/data.ts';
import { dataOraRoma } from '../stato/orarioRoma.ts';
import { nomeBreve, quantitaRiga, testoRiga } from './riga.ts';
import { CATEGORIE, ETICHETTE_CATEGORIA, type CategoriaSezione, type GiornoServer, type IndicazioneServer, type PastoServer, type PianoServer, type SezioneServer } from './tipi.ts';

export type RigaPiano = { nome: string; quantita: string | null; testo: string };
export type GruppoPiano = { categoria: CategoriaSezione; etichetta: string; righe: RigaPiano[] };
export type PastoFisso = { id: string; nome: string; nomeBreve: string; righe: RigaPiano[] };
export type PastoVariabile = { id: string; nome: string; nomeBreve: string; gruppi: GruppoPiano[] };
/** Giorno del fisso: `indice` 1 = lunedì … 7 = domenica (day_index), `iniziale` L M M G V S D. */
export type GiornoPiano = { indice: number; nome: string; iniziale: string; pasti: PastoFisso[] };
export type Indicazione = { titolo: string; testo: string };

export type PianoComposto = { id: string; updatedAt: string; aggiornatoIl: string | null; indicazioni: Indicazione[] } & (
  | { tipo: 'fisso'; giorni: GiornoPiano[] }
  | { tipo: 'variabile'; pasti: PastoVariabile[] }
);

const PREFISSO_AGGIORNATO = 'Aggiornato il ';

function perPosizione<T extends { position: number }>(voci: T[]): T[] {
  return [...voci].sort((a, b) => a.position - b.position);
}

/** Le righe visibili di una sezione, in ordine di position; una riga senza nome non si mostra. */
function righeDiSezione(sezione: SezioneServer): RigaPiano[] {
  const righe: RigaPiano[] = [];
  for (const r of perPosizione(sezione.rows)) {
    const nome = r.name?.trim();
    if (!nome) continue;
    const quantita = quantitaRiga(r);
    righe.push({ nome, quantita, testo: testoRiga(nome, quantita) });
  }
  return righe;
}

/** Sezioni visibili (con almeno una riga), in ordine di position, ciascuna con le sue righe. */
function sezioniVisibili(pasto: PastoServer): { sezione: SezioneServer; righe: RigaPiano[] }[] {
  const visibili: { sezione: SezioneServer; righe: RigaPiano[] }[] = [];
  for (const sezione of perPosizione(pasto.sections)) {
    const righe = righeDiSezione(sezione);
    if (righe.length > 0) visibili.push({ sezione, righe });
  }
  return visibili;
}

/** Fisso: righe del pasto in ordine di sezione e poi di riga, senza categorie. */
function pastoFisso(pasto: PastoServer): PastoFisso | null {
  const righe = sezioniVisibili(pasto).flatMap((s) => s.righe);
  if (righe.length === 0) return null;
  return { id: pasto.id, nome: pasto.name.trim(), nomeBreve: nomeBreve(pasto.name), righe };
}

/**
 * Variabile: righe raggruppate per categoria nell'ordine fisso carboidrati, proteine, grassi, fibre, zuccheri; le
 * sezioni della stessa categoria si uniscono (ordine sezione → riga). Una sezione senza categoria riconosciuta
 * non si mostra (il database la vieta con un CHECK: non si inventano etichette).
 */
function pastoVariabile(pasto: PastoServer): PastoVariabile | null {
  const perCategoria = new Map<CategoriaSezione, RigaPiano[]>();
  for (const { sezione, righe } of sezioniVisibili(pasto)) {
    if (!sezione.category) continue;
    perCategoria.set(sezione.category, [...(perCategoria.get(sezione.category) ?? []), ...righe]);
  }
  const gruppi: GruppoPiano[] = [];
  for (const categoria of CATEGORIE) {
    const righe = perCategoria.get(categoria);
    if (righe && righe.length > 0) gruppi.push({ categoria, etichetta: ETICHETTE_CATEGORIA[categoria], righe });
  }
  if (gruppi.length === 0) return null;
  return { id: pasto.id, nome: pasto.name.trim(), nomeBreve: nomeBreve(pasto.name), gruppi };
}

function inizialeGiorno(giorno: GiornoServer): string {
  return INIZIALI_SETTIMANA[giorno.day_index - 1] ?? Array.from(giorno.name.trim())[0]?.toUpperCase() ?? '';
}

function giorniVisibili(giorni: GiornoServer[]): GiornoPiano[] {
  const visibili: GiornoPiano[] = [];
  for (const g of [...giorni].sort((a, b) => a.day_index - b.day_index)) {
    const pasti: PastoFisso[] = [];
    for (const p of perPosizione(g.meals)) {
      const pasto = pastoFisso(p);
      if (pasto) pasti.push(pasto);
    }
    if (pasti.length > 0) visibili.push({ indice: g.day_index, nome: g.name.trim(), iniziale: inizialeGiorno(g), pasti });
  }
  return visibili;
}

/** Indicazioni generali in ordine di position; una indicazione senza titolo né testo non si mostra. */
export function indicazioniVisibili(indicazioni: IndicazioneServer[]): Indicazione[] {
  const visibili: Indicazione[] = [];
  for (const i of perPosizione(indicazioni)) {
    const titolo = i.title?.trim() ?? '';
    const testo = i.body?.trim() ?? '';
    if (titolo || testo) visibili.push({ titolo, testo });
  }
  return visibili;
}

/** "Aggiornato il 12 ottobre" da updated_at in ora italiana; null se la data non si legge. */
export function etichettaAggiornamento(updatedAt: string): string | null {
  const istante = new Date(updatedAt);
  if (Number.isNaN(istante.getTime())) return null;
  return `${PREFISSO_AGGIORNATO}${etichettaGiornoMese(dataOraRoma(istante).data)}`;
}

/** Il piano pronto per lo schermo, o null se non resta alcuna riga (per l'app: "Piano in elaborazione"). */
export function componiPiano(piano: PianoServer): PianoComposto | null {
  const base = { id: piano.id, updatedAt: piano.updated_at, aggiornatoIl: etichettaAggiornamento(piano.updated_at), indicazioni: indicazioniVisibili(piano.indications) };
  if (piano.plan_type === 'fisso') {
    const giorni = giorniVisibili(piano.days);
    return giorni.length > 0 ? { ...base, tipo: 'fisso', giorni } : null;
  }
  // Variabile: un solo giorno ("Giornata tipo"); se ne arrivassero più di uno si mostra il primo con pasti visibili.
  for (const g of [...piano.days].sort((a, b) => a.day_index - b.day_index)) {
    const pasti: PastoVariabile[] = [];
    for (const p of perPosizione(g.meals)) {
      const pasto = pastoVariabile(p);
      if (pasto) pasti.push(pasto);
    }
    if (pasti.length > 0) return { ...base, tipo: 'variabile', pasti };
  }
  return null;
}
