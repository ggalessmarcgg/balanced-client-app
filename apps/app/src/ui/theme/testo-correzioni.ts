// Correzione verticale per stile di testo, in punti, applicata dal componente Testo (src/ui/Testo.tsx).
// Su iOS, quando l'interlinea è pari o inferiore all'altezza naturale del font (Display 105 %, H1 e
// Accento serif 100 %), React Native appoggia i glifi in alto nel riquadro di riga mentre Figma li centra.
// I valori sono misurati con il confronto a pixel Figma ↔ simulatore a 3×
// (~/Desktop/censimenti-app/step2b-confronti/lotto1, colonna "Δ verticale"): positivo = sposta in basso.
// Non vengono da Figma: si rimisurano se cambiano font, interlinee o la versione di React Native.
import type { NomeStileTesto } from './tokens.generated';

export const correzioneVerticale: Partial<Record<NomeStileTesto, number>> = {
  // misurati sullo specimen Figma 416:12 (18/10/2026, font con dimensione ottica)
  display: 16 / 3,
  h1: 12 / 3,
  h2: 4 / 3,
  heading: 3 / 3,
  bodyLarge: 1 / 3,
  body: -2 / 3,
  bodyDetails: 1 / 3,
  caption: -3 / 3,
  accentoSerif: 13 / 3,
  citazione: 0,
  // misurati su testi reali delle schermate (absoluteRenderBounds di Figma vs cella del simulatore)
  h1Accesso: 13 / 3,
  etichetta: -2 / 3,
  link: 1 / 3,
  etichettaPiccola: 2 / 3,
  captionSemiBold: -2 / 3,
  etichettaAI: 0,
  bodyDetails130: 0,
  etichettaPiccola130: 0,
  // derivato in proporzione da accentoSerif (13,7 px a 32 → 15,4 px a 36): nessun nodo Figma con il solo stile
  accentoSerifAccesso: 15 / 3,
};

/**
 * Android (correzione del 30/10/2026): qui i glifi stanno già quasi centrati nel riquadro di riga, quindi le correzioni
 * di iOS li spingevano 5–6 dp troppo in basso nei titoli grandi. Valori misurati su /sviluppo/titoli: distanza dal bordo
 * della cella al primo pixel del titolo, emulatore Pixel 9a a 2,625× contro il simulatore iPhone a 3× (già allineato a
 * Figma), script ~/Desktop/censimenti-app/strumenti/misura-titoli2.mjs; stile per stile, correzione Android = valore
 * precedente − scarto misurato, tolleranza 0,5 dp. Per h1 e h1Accesso vale la misura della riga mista di TitoloAccento
 * (titolo sans + accento serif, cioè i saluti e il titolo dell'accesso), dove la riga la governa il font più alto.
 * Gli stili non elencati prendono il valore di iOS.
 */
export const correzioneVerticaleAndroid: Partial<Record<NomeStileTesto, number>> = {
  ...correzioneVerticale,
  display: 1 / 2,
  h1: -2,
  h2: 1,
  heading: 1,
  bodyLarge: 1,
  body: -2 / 3,
  bodyDetails: 1 / 3,
  accentoSerif: -5 / 3,
  citazione: 1 / 2,
  h1Accesso: -1,
  link: 0,
  captionSemiBold: 0,
  bodyDetails130: 1,
  etichettaPiccola130: 1 / 2,
  accentoSerifAccesso: -4 / 3,
};
