import { Text, type TextProps } from 'react-native';

import { colori, testi, type NomeStileTesto } from '@/ui/theme';
import { correzioneVerticale } from '@/ui/theme/testo-correzioni';

export type TestoProps = TextProps & {
  /** Stile di testo del design system (App/… in Figma), ad es. "body", "h1", "display". */
  stile: NomeStileTesto;
  /** Colore del testo; predefinito testo/primario. */
  colore?: string;
};

/**
 * Testo del design system: applica font, corpo, interlinea e spaziatura dello stile Figma, il colore dai
 * token e la correzione verticale misurata per lo stile (vedi theme/testo-correzioni.ts), così che la
 * posizione dei glifi coincida con Figma. Tutte le altre proprietà passano a Text (numberOfLines, ecc.).
 */
export function Testo({ stile, colore = colori.testo.primario, style, children, ...resto }: TestoProps) {
  const delta = correzioneVerticale[stile] ?? 0;
  return (
    <Text
      {...resto}
      style={[testi[stile], { color: colore }, delta !== 0 && { transform: [{ translateY: delta }] }, style]}
    >
      {children}
    </Text>
  );
}
