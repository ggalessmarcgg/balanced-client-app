#!/usr/bin/env node
// Genera src/ui/theme/tokens.generated.ts da src/ui/theme/figma-tokens.json.
// Uso: npm run tokens (dentro apps/app). Nessuna rete, nessuna scrittura su Figma.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const qui = dirname(fileURLToPath(import.meta.url));
const SORGENTE = resolve(qui, '../../src/ui/theme/figma-tokens.json');
const USCITA = resolve(qui, '../../src/ui/theme/tokens.generated.ts');
const t = JSON.parse(readFileSync(SORGENTE, 'utf8'));

// Nomi dei font così come li espongono i pacchetti @expo-google-fonts (caricati in src/ui/theme/font.ts).
const FONT = {
  'DM Sans|Regular': 'DMSans_400Regular',
  'DM Sans|SemiBold': 'DMSans_600SemiBold',
  'DM Sans|Light Italic': 'DMSans_300Light_Italic',
  'DM Serif Display|Italic': 'DMSerifDisplay_400Regular_Italic',
};

const camel = (s) => s
  .replace(/[·]/g, ' ')
  .trim()
  .split(/[\s\-_/]+/)
  .map((p, i) => (i === 0 ? (/^[A-Z0-9]+$/.test(p) ? p.toLowerCase() : p.charAt(0).toLowerCase() + p.slice(1)) : p.charAt(0).toUpperCase() + p.slice(1)))
  .join('')
  .replace(/[^A-Za-z0-9]/g, (c) => ({ 'à': 'a', 'è': 'e', 'é': 'e', 'ì': 'i', 'ò': 'o', 'ù': 'u' }[c] ?? ''));
const pascal = (s) => s.split('-').map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join('');
const r2 = (n) => Math.round(n * 100) / 100;
const colore = (hex, alpha) => {
  if (alpha >= 1) return hex;
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};
const chiave = (k) => (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(k) ? k : JSON.stringify(k));
const lit = (v, ind = 0) => {
  const pad = '  '.repeat(ind + 1), chiusa = '  '.repeat(ind);
  if (Array.isArray(v)) return v.length === 0 ? '[]' : `[\n${v.map((x) => pad + lit(x, ind + 1)).join(',\n')},\n${chiusa}]`;
  if (v && typeof v === 'object') {
    const righe = Object.entries(v).filter(([, x]) => x !== undefined).map(([k, x]) => `${pad}${chiave(k)}: ${lit(x, ind + 1)}`);
    return righe.length === 0 ? '{}' : `{\n${righe.join(',\n')},\n${chiusa}}`;
  }
  if (typeof v === 'string') return `'${v.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  return String(v);
};

// --- Colori -----------------------------------------------------------------
const colori = {};
const perNome = {};
for (const v of t.variables.filter((x) => x.type === 'COLOR')) {
  const val = colore(v.hex, v.alpha);
  perNome[v.name] = val;
  const [gruppo, ...resto] = v.name.split('/');
  if (gruppo === 'colore') { (colori.primitivi ??= {})[camel(resto.join('/'))] = val; continue; }
  if (resto.length === 0) { colori[camel(gruppo)] = val; continue; }
  (colori[camel(gruppo)] ??= {})[camel(resto.join('/'))] = val;
}

// --- Misure -----------------------------------------------------------------
const spazio = {}, raggio = {}, misuraIcona = {}, tocco = {}, margine = {};
for (const v of t.variables.filter((x) => x.type === 'FLOAT')) {
  const [gruppo, nome] = v.name.split('/');
  if (gruppo === 'spazio') spazio[nome] = v.value;
  else if (gruppo === 'raggio') raggio[camel(nome)] = v.value;
  else if (gruppo === 'icona') misuraIcona[nome] = v.value;
  else if (gruppo === 'tocco') tocco[camel(nome)] = v.value;
  else if (gruppo === 'margine') margine[camel(nome)] = v.value;
}
const ordina = (o) => Object.fromEntries(Object.entries(o).sort((a, b) => Number(a[0]) - Number(b[0])));

// --- Stili di testo (solo "App/…": gli altri sono del funnel web) ------------
const testi = {};
const descrizioniTesti = {};
for (const s of t.textStyles.filter((x) => x.name.startsWith('App/'))) {
  const font = FONT[`${s.family}|${s.style}`];
  if (!font) throw new Error(`Font non mappato: ${s.family} ${s.style} (${s.name})`);
  const k = camel(s.name.slice(4));
  const stile = { fontFamily: font, fontSize: s.size };
  if (s.lineHeight.unit === 'PERCENT') stile.lineHeight = r2((s.size * s.lineHeight.value) / 100);
  else if (s.lineHeight.unit === 'PIXELS') stile.lineHeight = r2(s.lineHeight.value);
  // AUTO: interlinea naturale del font, come in Figma (nessun valore).
  if (s.letterSpacing.unit === 'PERCENT') stile.letterSpacing = r2((s.size * s.letterSpacing.value) / 100);
  else stile.letterSpacing = r2(s.letterSpacing.value);
  testi[k] = stile;
  descrizioniTesti[k] = { figma: s.name, font: `${s.family} ${s.style}`, interlinea: s.lineHeight.unit === 'AUTO' ? 'auto' : `${s.lineHeight.value}%`, spaziatura: `${s.letterSpacing.value}%`, descrizione: s.description };
}

// --- Gradienti (da gradientTransform: spazio gradiente → spazio del nodo) -----
const inverti = ([[a, b, c], [d, e, f]]) => {
  const det = a * e - b * d;
  return (gx, gy) => ({ x: r2((e * (gx - c) - b * (gy - f)) / det), y: r2((-d * (gx - c) + a * (gy - f)) / det) });
};
const gradienti = {};
for (const p of t.paintStyles.filter((x) => x.name.startsWith('App/Gradiente'))) {
  const g = p.paints[0];
  const inv = inverti(g.transform);
  gradienti[camel(p.name.slice('App/Gradiente '.length))] = {
    figma: p.name,
    inizio: inv(0, 0.5), fine: inv(1, 0.5),
    tappe: g.stops.map((s) => ({ colore: colore(s.hex, s.alpha), posizione: s.position })),
  };
}

// --- Effetti ----------------------------------------------------------------
const effetti = {};
for (const e of t.effectStyles) {
  const v = e.effects[0];
  effetti[camel(e.name.replace(/^App\//, ''))] = { figma: e.name, tipo: v.type, raggio: v.radius, rifrazione: v.refraction, profondita: v.depth, angoloLuce: v.lightAngle, intensitaLuce: r2(v.lightIntensity), dispersione: v.dispersion };
}

// --- Icone -------------------------------------------------------------------
const icone = {};
for (const ic of t.icons) {
  const m = ic.name.match(/^Icona( AI)? \/ (\d+) \/ (.+)$/);
  if (!m) throw new Error(`Nome icona fuori schema: ${ic.name}`);
  const ai = Boolean(m[1]); const misura = Number(m[2]); const nome = m[3];
  const lucide = ic.description.match(/Lucide:?\s+([a-z0-9-]+)/)?.[1] ?? null;
  const strokeVar = typeof ic.stroke === 'string' && perNome[ic.stroke] ? ic.stroke : null;
  const fillVar = typeof ic.fill === 'string' && perNome[ic.fill] ? ic.fill : null;
  const resa = ai || !lucide ? 'svg' : 'lucide';
  icone[`${misura}/${nome}`] = {
    nome, misura, figma: ic.id,
    resa,
    lucide: resa === 'lucide' ? lucide : null,
    lucideComponente: resa === 'lucide' ? pascal(lucide) : null,
    tratto: Array.isArray(ic.strokeWeight) ? ic.strokeWeight[0] : ic.strokeWeight,
    coloreVariabile: strokeVar ?? fillVar ?? null,
    colore: perNome[strokeVar ?? fillVar] ?? null,
    ai,
  };
}
const trattoPerMisura = Object.fromEntries(Object.values(misuraIcona).map((m) => [m, r2(m / 12)]));
const perMisura = {};
for (const ic of Object.values(icone)) (perMisura[ic.misura] ??= []).push(ic.nome);
const tipoPerMisura = Object.entries(perMisura).sort((a, b) => Number(a[0]) - Number(b[0]))
  .map(([m, nomi]) => `  ${m}: ${nomi.sort((a, b) => a.localeCompare(b)).map((n) => `'${n}'`).join(' | ')};`).join('\n');

// --- Opacità di livello -------------------------------------------------------
const { _nota: _n, ...opacita } = t.opacitaLivello;

const ts = `// GENERATO da scripts/tokens/genera-token.mjs a partire da src/ui/theme/figma-tokens.json
// (file Figma ${t.fileKey}, modalità ${t.mode}, lettura del ${t.letturaDel}).
// NON MODIFICARE A MANO: rileggere Figma e rigenerare con \`npm run tokens\` (vedi CLAUDE.md).
/* eslint-disable */

/** Colori semantici (App · Colori) e primitivi (App · Primitivi). Le voci con alfa sono rgba. */
export const colori = ${lit(colori)} as const;

/** Scala degli spazi (spazio/N). Uso: spazio[16]. */
export const spazio = ${lit(ordina(spazio))} as const;

/** Raggi (raggio/*). */
export const raggio = ${lit(raggio)} as const;

/** Misure delle icone (icona/N). Uso: misuraIcona[24]. */
export const misuraIcona = ${lit(ordina(misuraIcona))} as const;

/** Spessore del tratto per misura (regola Figma "Icone": proporzionale al 2 delle 24). */
export const trattoPerMisura = ${lit(trattoPerMisura)} as const;

/** Aree toccabili minime (tocco/*). */
export const tocco = ${lit(tocco)} as const;

/** Margini (margine/*). */
export const margine = ${lit(margine)} as const;

/** Stili di testo "App/…" con interlinea e spaziatura già in pixel. Nessun fontWeight: il peso è nel nome del font. */
export const testi = ${lit(testi)} as const;

/** Origine Figma di ogni stile di testo (per la pagina dei componenti e i confronti). */
export const descrizioniTesti = ${lit(descrizioniTesti)} as const;

/** Gradienti (stili colore App/Gradiente …). inizio/fine in coordinate relative 0–1 del nodo. */
export const gradienti = ${lit(gradienti)} as const;

/** Effetti (stili effetto App/…). Parametri Figma, da interpretare nel componente. */
export const effetti = ${lit(effetti)} as const;

/** Opacità di livello usate nelle schermate (non variabili in Figma). */
export const opacita = ${lit(opacita)} as const;

/** Icone del design system: chiave "misura/nome", nome Lucide dalla descrizione del componente Figma. */
export const icone = ${lit(icone)} as const;

export type ChiaveIcona = keyof typeof icone;
export type IconaPerMisura = {
${tipoPerMisura}
};
export type MisuraIcona = keyof IconaPerMisura;
export type NomeStileTesto = keyof typeof testi;
`;
writeFileSync(USCITA, ts);
console.log(`tokens.generated.ts: ${Object.keys(perNome).length} colori, ${Object.keys(spazio).length} spazi, ${Object.keys(testi).length} stili di testo, ${Object.keys(icone).length} icone`);
