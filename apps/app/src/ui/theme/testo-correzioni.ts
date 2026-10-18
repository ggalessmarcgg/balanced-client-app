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
