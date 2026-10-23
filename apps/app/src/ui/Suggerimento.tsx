import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useAreaToccabile } from '@/ui/areaToccabile';
import { Testo } from '@/ui/Testo';
import { colori, raggio, spazio } from '@/ui/theme';

export type SuggerimentoProps = {
  testo: string;
  /** Indicazione del passo (Caption al 60 %, a sinistra del piede); vuota nei tutorial di Racconta. */
  passo?: string;
  onHoCapito: () => void;
};

/** Larghezza del fumetto e misure della punta (Figma "Suggerimento" nelle schermate Tutorial · 3, 4, 5). */
export const LARGHEZZA_SUGGERIMENTO = 280;
const PUNTA = { larghezza: 14, altezza: 7.5, riga: 10 };

/**
 * Suggerimento del tutorial: fumetto su testo/primario (raggio foto, padding 14 / 16, gap 10) con il testo in Body
 * details su azione, il piede con il passo e "Ho capito" (Link in badge/sfondo), e la punta verso l'elemento evidenziato.
 */
export function Suggerimento({ testo, passo = ' ', onHoCapito }: SuggerimentoProps) {
  const { hitSlop, onLayout } = useAreaToccabile();
  return (
    <View style={stili.suggerimento} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <View style={stili.fumetto}>
        <Testo stile="bodyDetails" colore={colori.testo.suAzione}>
          {testo}
        </Testo>
        <View style={stili.piede}>
          <Testo stile="caption" colore={colori.testo.suAzione} style={stili.passo}>
            {passo}
          </Testo>
          <Pressable onPress={onHoCapito} hitSlop={hitSlop} onLayout={onLayout} accessibilityRole="button" accessibilityLabel="Ho capito">
            <Testo stile="link" colore={colori.badge.sfondo}>
              Ho capito
            </Testo>
          </Pressable>
        </View>
      </View>
      <Svg width={LARGHEZZA_SUGGERIMENTO} height={PUNTA.riga} accessible={false} importantForAccessibility="no-hide-descendants">
        <Path d={`M${LARGHEZZA_SUGGERIMENTO / 2} ${PUNTA.riga}L${LARGHEZZA_SUGGERIMENTO / 2 - PUNTA.larghezza / 2} ${PUNTA.riga - PUNTA.altezza}L${LARGHEZZA_SUGGERIMENTO / 2 + PUNTA.larghezza / 2} ${PUNTA.riga - PUNTA.altezza}Z`} fill={colori.testo.primario} />
      </Svg>
    </View>
  );
}

const stili = StyleSheet.create({
  suggerimento: { width: LARGHEZZA_SUGGERIMENTO, alignItems: 'stretch' },
  fumetto: { paddingVertical: spazio[14], paddingHorizontal: spazio[16], gap: spazio[10], backgroundColor: colori.testo.primario, borderRadius: raggio.foto, overflow: 'hidden' },
  piede: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  // Il passo è al 60 % su testo scuro: lo stesso dell'opacità del Figma (opacity-60 sul testo su azione).
  passo: { opacity: 0.6 },
});
