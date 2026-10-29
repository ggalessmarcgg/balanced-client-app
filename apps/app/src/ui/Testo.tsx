import { Platform, Text, type TextProps } from 'react-native';

import { colori, testi, type NomeStileTesto } from '@/ui/theme';
import { correzioneVerticale, correzioneVerticaleAndroid } from '@/ui/theme/testo-correzioni';

// Correzioni per piattaforma: su Android i glifi stanno già quasi centrati nel riquadro (vedi testo-correzioni.ts).
const CORREZIONI = Platform.OS === 'android' ? correzioneVerticaleAndroid : correzioneVerticale;

export type TestoProps = TextProps & {
  /** Stile di testo del design system (App/… in Figma), ad es. "body", "h1", "display". */
  stile: NomeStileTesto;
  /** Colore del testo; predefinito testo/primario. */
  colore?: string;
};

// Altezza naturale dei font del tema in em (ascendente + discendente: DM Sans 1,30, DM Serif Display ~1,3), con
// margine. Su iOS il testo viene ritagliato al riquadro di riga: con un'interlinea più bassa dell'altezza naturale
// (H1 e Accento serif 100 %, Display 105 %) accenti e discendenti finiscono fuori e spariscono (verificato il
// 19/10/2026 con /sviluppo/titoli: "Àgb" diventava "Agb"). Il riquadro si allarga con un padding verticale
// compensato da margini negativi uguali: il layout non cambia, i glifi restano visibili.
const ALTEZZA_NATURALE_EM = 1.35;

function spazioExtra(stile: NomeStileTesto): number {
  const { fontSize, lineHeight } = testi[stile] as { fontSize: number; lineHeight?: number };
  if (lineHeight === undefined) return 0;
  return Math.max(0, Math.ceil(fontSize * ALTEZZA_NATURALE_EM - lineHeight));
}

/**
 * Testo del design system: applica font, corpo, interlinea e spaziatura dello stile Figma, il colore dai
 * token e la correzione verticale misurata per lo stile (vedi theme/testo-correzioni.ts), così che la
 * posizione dei glifi coincida con Figma. Tutte le altre proprietà passano a Text (numberOfLines, ecc.).
 */
export function Testo({ stile, colore = colori.testo.primario, style, children, ...resto }: TestoProps) {
  const delta = CORREZIONI[stile] ?? 0;
  const extra = spazioExtra(stile);
  return (
    <Text
      {...resto}
      style={[
        testi[stile],
        { color: colore },
        extra > 0 && { paddingTop: extra, paddingBottom: extra, marginTop: -extra, marginBottom: -extra },
        delta !== 0 && { transform: [{ translateY: delta }] },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
