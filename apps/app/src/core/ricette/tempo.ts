// Testi del tempo di una ricetta (contratto ricette v0.2 §1.5 e docs/server-ricette.md §4): sottotitolo della pagina
// ("20 minuti · Pranzo", "30 minuti · più 3 ore di riposo · Spuntino"), tempo breve dell'elenco ("20 min") e riga
// delle porzioni ("Per 8 porzioni · La tua porzione: una fetta, circa 110 g").
import type { Porzioni } from './server.ts';

const SEPARATORE = ' · ';

function minuti(n: number): string {
  return `${n} ${n === 1 ? 'minuto' : 'minuti'}`;
}

/** Durata in ore e minuti: 180 → "3 ore", 90 → "1 ora e 30 minuti", 45 → "45 minuti". */
export function durata(minutiTotali: number): string {
  const m = Math.max(0, Math.round(minutiTotali));
  const ore = Math.floor(m / 60);
  const resto = m % 60;
  const parti: string[] = [];
  if (ore > 0) parti.push(`${ore} ${ore === 1 ? 'ora' : 'ore'}`);
  if (resto > 0 || parti.length === 0) parti.push(minuti(resto));
  return parti.join(' e ');
}

/** "20 minuti · Pranzo", oppure "30 minuti · più 3 ore di riposo · Spuntino" con il riposo; senza tempo resta il solo pasto. */
export function sottotitoloRicetta(tempoMinuti: number | null, riposoMinuti: number | null, pasto: string): string {
  const parti: string[] = [];
  if (tempoMinuti !== null && tempoMinuti > 0) parti.push(minuti(tempoMinuti));
  if (riposoMinuti !== null && riposoMinuti > 0) parti.push(`più ${durata(riposoMinuti)} di riposo`);
  const nomePasto = pasto.trim();
  if (nomePasto) parti.push(nomePasto);
  return parti.join(SEPARATORE);
}

/** Riga di "Le tue ricette": "Pranzo · 20 min"; senza tempo il solo pasto. */
export function sottotitoloElenco(pasto: string, tempoMinuti: number | null): string {
  const parti: string[] = [];
  const nomePasto = pasto.trim();
  if (nomePasto) parti.push(nomePasto);
  if (tempoMinuti !== null && tempoMinuti > 0) parti.push(`${tempoMinuti} min`);
  return parti.join(SEPARATORE);
}

/** "nome · quantità" di un ingrediente; senza quantità il solo nome. */
export function testoIngrediente(nome: string, quantita: string | null): string {
  return quantita ? `${nome}${SEPARATORE}${quantita}` : nome;
}

/** Riga delle porzioni (solo preparazioni per più porzioni): "Per 8 porzioni · La tua porzione: una fetta, circa 110 g". */
export function rigaPorzioni(porzioni: Porzioni | null): string | null {
  if (!porzioni) return null;
  const parti: string[] = [];
  if (porzioni.numero !== null) parti.push(`Per ${porzioni.numero} ${porzioni.numero === 1 ? 'porzione' : 'porzioni'}`);
  if (porzioni.laTuaPorzione) parti.push(`La tua porzione: ${porzioni.laTuaPorzione}`);
  return parti.length > 0 ? parti.join(SEPARATORE) : null;
}
