import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colori, raggio, spazio } from '@/ui/theme';

export type SegnapostoProps = {
  /** Larghezze delle righe a pillola (Figma: 180, 280, 120). */
  righe?: number[];
  /** Altezza del blocco; se assente segue le righe (Figma: liberamente ridimensionabile). */
  altezza?: number;
  style?: StyleProp<ViewStyle>;
};

const RIGHE_FIGMA = [180, 280, 120];
const ALTEZZA_RIGA = 14;
const DURATA_PULSAZIONE_MS = 2000;
const OPACITA_MINIMA = 0.5;

// Un solo valore animato per tutta l'app: tutti i segnaposti pulsano insieme (come animate-pulse del CRM).
const pulsazione = new Animated.Value(1);
let cicloAvviato = false;
let ridurreMovimento = false;
function avviaPulsazione() {
  if (cicloAvviato || ridurreMovimento) return;
  cicloAvviato = true;
  Animated.loop(
    Animated.sequence([
      Animated.timing(pulsazione, { toValue: OPACITA_MINIMA, duration: DURATA_PULSAZIONE_MS / 2, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(pulsazione, { toValue: 1, duration: DURATA_PULSAZIONE_MS / 2, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]),
  ).start();
}
function fermaPulsazione() {
  pulsazione.stopAnimation();
  pulsazione.setValue(1);
  cicloAvviato = false;
}

/**
 * Segnaposto di caricamento (Figma 563:308): blocco crema scuro con righe a pillola crema, opacità che pulsa
 * 100 % → 50 % → 100 % in 2 s, uguale e sincronizzata per tutti i segnaposti; ferma con "Riduci movimento".
 */
export function Segnaposto({ righe = RIGHE_FIGMA, altezza, style }: SegnapostoProps) {
  const [riduci, setRiduci] = useState(ridurreMovimento);
  useEffect(() => {
    let attivo = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => attivo && applica(v));
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', applica);
    function applica(v: boolean) {
      ridurreMovimento = v;
      setRiduci(v);
      if (v) fermaPulsazione();
      else avviaPulsazione();
    }
    return () => {
      attivo = false;
      sub.remove();
    };
  }, []);
  return (
    <Animated.View
      style={[stili.blocco, altezza !== undefined && { height: altezza }, { opacity: riduci ? 1 : pulsazione }, style]}
      accessibilityRole="progressbar"
      accessibilityLabel="Caricamento"
    >
      {righe.map((larghezza, i) => (
        <View key={i} style={[stili.riga, { width: larghezza }]} />
      ))}
    </Animated.View>
  );
}

const stili = StyleSheet.create({
  blocco: {
    alignSelf: 'stretch',
    gap: spazio[10],
    padding: spazio[20],
    backgroundColor: colori.sfondo.campo,
    borderRadius: raggio.card,
    overflow: 'hidden',
  },
  riga: { maxWidth: '100%', height: ALTEZZA_RIGA, borderRadius: raggio.pieno, backgroundColor: colori.sfondo.card },
});
