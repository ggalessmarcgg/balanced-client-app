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
  /**
   * Dove sta la punta (proprietà "Freccia" del componente Figma 585:267): "sotto" quando il fumetto sta sopra l'elemento
   * (Racconta, punta centrata); "sopra" quando sta sotto (Tutorial · 1 del Piano 586:5457, punta a 32 dal bordo sinistro).
   */
  freccia?: 'sotto' | 'sopra';
};

/** Larghezza del fumetto e misure della punta (Figma "Suggerimento" nelle schermate Tutorial · 3, 4, 5). */
export const LARGHEZZA_SUGGERIMENTO = 280;
const PUNTA = { larghezza: 14, altezza: 7.5, riga: 10 };
/** Centro della punta con Freccia=Sopra (Figma 586:5590: il triangolo va da 25 a 39 nella riga larga 280). */
const CENTRO_PUNTA_SOPRA = 32;

function tracciatoPunta(freccia: 'sotto' | 'sopra'): string {
  if (freccia === 'sopra') {
    const c = CENTRO_PUNTA_SOPRA;
    return `M${c} 0L${c + PUNTA.larghezza / 2} ${PUNTA.altezza}L${c - PUNTA.larghezza / 2} ${PUNTA.altezza}Z`;
  }
  const c = LARGHEZZA_SUGGERIMENTO / 2;
  return `M${c} ${PUNTA.riga}L${c - PUNTA.larghezza / 2} ${PUNTA.riga - PUNTA.altezza}L${c + PUNTA.larghezza / 2} ${PUNTA.riga - PUNTA.altezza}Z`;
}

/**
 * Suggerimento del tutorial: fumetto su testo/primario (raggio foto, padding 14 / 16, gap 10) con il testo in Body
 * details su azione, il piede con il passo e "Ho capito" (Link in badge/sfondo), e la punta verso l'elemento evidenziato.
 */
export function Suggerimento({ testo, passo = ' ', onHoCapito, freccia = 'sotto' }: SuggerimentoProps) {
  const { hitSlop, onLayout } = useAreaToccabile();
  const punta = (
    <Svg width={LARGHEZZA_SUGGERIMENTO} height={PUNTA.riga} accessible={false} importantForAccessibility="no-hide-descendants">
      <Path d={tracciatoPunta(freccia)} fill={colori.testo.primario} />
    </Svg>
  );
  return (
    <View style={stili.suggerimento} accessibilityRole="alert" accessibilityLiveRegion="polite">
      {freccia === 'sopra' && punta}
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
      {freccia === 'sotto' && punta}
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
