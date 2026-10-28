// Da dove parte la ricetta (contratto ricette v0.2 §1.2): nel fisso il giorno del selettore e i suoi pasti, con il loro
// nome e nell'ordine del giorno, senza preselezione; nel variabile il pasto del selettore, mostrato come testata.
import type { PianoComposto } from '../piano/composizione.ts';

export type PastoScelto = { id: string; nome: string };

export type ContestoRicetta =
  | { tipo: 'fisso'; pianoId: string; giorno: { indice: number; nome: string }; pasti: PastoScelto[] }
  | { tipo: 'variabile'; pianoId: string; pasto: PastoScelto };

/** Il contesto dalla pagina corrente del selettore (indice del giorno nel fisso, del pasto nel variabile); null se la pagina non esiste. */
export function contestoRicetta(piano: PianoComposto, indicePagina: number): ContestoRicetta | null {
  if (piano.tipo === 'fisso') {
    const giorno = piano.giorni[indicePagina];
    if (!giorno) return null;
    return { tipo: 'fisso', pianoId: piano.id, giorno: { indice: giorno.indice, nome: giorno.nome }, pasti: giorno.pasti.map((p) => ({ id: p.id, nome: p.nome })) };
  }
  const pasto = piano.pasti[indicePagina];
  if (!pasto) return null;
  return { tipo: 'variabile', pianoId: piano.id, pasto: { id: pasto.id, nome: pasto.nome } };
}

/** Il pasto noto fin dall'apertura: nel variabile quello del selettore; nel fisso nessuno (lo sceglie il cliente). */
export function pastoIniziale(contesto: ContestoRicetta): PastoScelto | null {
  return contesto.tipo === 'variabile' ? contesto.pasto : null;
}

/** Il nome del giorno da salvare con la ricetta (solo nel fisso). */
export function nomeGiorno(contesto: ContestoRicetta): string | null {
  return contesto.tipo === 'fisso' ? contesto.giorno.nome : null;
}
