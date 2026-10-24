// Testo di una riga del piano e nome breve del pasto (contratto v0.5 §3, decisioni dello step 8, lotto 1).
import type { RigaServer } from './tipi.ts';

export const SEPARATORE_RIGA = ' · ';
export const A_PIACERE = 'a piacere';
const LUNGHEZZA_NOME_BREVE = 6;
const CARATTERI_NOME_BREVE = 5;

/** Numero all'italiana: virgola decimale, al massimo due decimali, senza zeri finali ("120", "0,5", "1,25"). */
export function formattaNumero(n: number): string {
  const arrotondato = Math.round(n * 100) / 100;
  return String(arrotondato).replace('.', ',');
}

/**
 * La quantità da mostrare: "a piacere" per quantity_type a_piacere; altrimenti practical_quantity così com'è;
 * altrimenti quantity + measure_type ("120 g"); null se non c'è nulla. Un measure_type senza quantity non si mostra.
 */
export function quantitaRiga(riga: Pick<RigaServer, 'quantity_type' | 'quantity' | 'measure_type' | 'practical_quantity'>): string | null {
  if (riga.quantity_type === 'a_piacere') return A_PIACERE;
  const pratica = riga.practical_quantity?.trim();
  if (pratica) return pratica;
  if (riga.quantity !== null && riga.quantity !== undefined) {
    const numero = formattaNumero(riga.quantity);
    return riga.measure_type ? `${numero} ${riga.measure_type}` : numero;
  }
  return null;
}

/** "nome · quantità", oppure il solo nome senza separatore. */
export function testoRiga(nome: string, quantita: string | null): string {
  return quantita ? `${nome}${SEPARATORE_RIGA}${quantita}` : nome;
}

/** Nome del pasto nel selettore: oltre i 6 caratteri, i primi 5 più un punto ("Colazione" → "Colaz."); maiuscole come arrivano. */
export function nomeBreve(nome: string): string {
  const pulito = nome.trim();
  const caratteri = Array.from(pulito);
  if (caratteri.length <= LUNGHEZZA_NOME_BREVE) return pulito;
  return `${caratteri.slice(0, CARATTERI_NOME_BREVE).join('').trimEnd()}.`;
}
