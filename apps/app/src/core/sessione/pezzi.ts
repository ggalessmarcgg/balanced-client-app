// La sessione Supabase (token di accesso, token di rinnovo e utente) in JSON supera i 2 KB, il limite per
// valore del portachiavi iOS raccomandato da expo-secure-store: si divide in pezzi salvati sotto chiavi
// numerate, più una chiave con il conteggio. Funzioni pure, senza dipendenze.

export const PEZZO_MASSIMO = 1800;

export function chiaveConteggio(base: string): string {
  return `${base}.n`;
}

export function chiavePezzo(base: string, indice: number): string {
  return `${base}.${indice}`;
}

export function dividiInPezzi(valore: string, massimo = PEZZO_MASSIMO): string[] {
  if (massimo <= 0) throw new RangeError('massimo deve essere positivo');
  const pezzi: string[] = [];
  for (let i = 0; i < valore.length; i += massimo) pezzi.push(valore.slice(i, i + massimo));
  return pezzi.length ? pezzi : [''];
}

/** Ricompone il valore; null se manca anche un solo pezzo (lettura incoerente: la sessione va scartata). */
export function unisciPezzi(pezzi: (string | null | undefined)[]): string | null {
  if (pezzi.some((p) => p === null || p === undefined)) return null;
  return pezzi.join('');
}

export function conteggioValido(valore: string | null | undefined): number | null {
  if (!valore || !/^\d+$/.test(valore)) return null;
  const n = Number(valore);
  return n > 0 && n < 1000 ? n : null;
}
