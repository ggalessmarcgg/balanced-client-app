import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colori, raggio, spazio } from '@/ui/theme';

/** Riga a pillola: larghezza (altezza 14) oppure larghezza e altezza (ricerca delle alternative e delle idee: 160 × 16 e 240 × 12). */
export type RigaSegnaposto = number | { larghezza: number; altezza: number };

export type SegnapostoProps = {
  /** Righe a pillola (Figma: 180, 280, 120). */
  righe?: RigaSegnaposto[];
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
let ciclo: Animated.CompositeAnimation | null = null;
let montati = 0;
let ridurreMovimento = false;
/**
 * Avvia il ciclo se c'è almeno un segnaposto montato e non è già in corso. Quando l'ultimo segnaposto si smonta,
 * React Native stacca il valore animato e ferma da sé il ciclo (`AnimatedValue.__detach` → `stopAnimation`): il
 * callback di fine lo registra, così il montaggio successivo lo fa ripartire (difetto del 28/10/2026: dopo il primo
 * caricamento nessun segnaposto pulsava più, neanche nella ricerca delle alternative).
 */
function avviaPulsazione() {
  if (ciclo || ridurreMovimento || montati === 0) return;
  pulsazione.setValue(1);
  const avviato = Animated.loop(
    Animated.sequence([
      Animated.timing(pulsazione, { toValue: OPACITA_MINIMA, duration: DURATA_PULSAZIONE_MS / 2, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(pulsazione, { toValue: 1, duration: DURATA_PULSAZIONE_MS / 2, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]),
  );
  ciclo = avviato;
  avviato.start(() => {
    if (ciclo === avviato) ciclo = null;
  });
}
function fermaPulsazione() {
  ciclo?.stop();
  ciclo = null;
  pulsazione.setValue(1);
}

/**
 * Segnaposto di caricamento (Figma 563:308): blocco crema scuro con righe a pillola crema, opacità che pulsa
 * 100 % → 50 % → 100 % in 2 s, uguale e sincronizzata per tutti i segnaposti; ferma con "Riduci movimento".
 */
export function Segnaposto({ righe = RIGHE_FIGMA, altezza, style }: SegnapostoProps) {
  const [riduci, setRiduci] = useState(ridurreMovimento);
  useEffect(() => {
    let attivo = true;
    montati += 1;
    avviaPulsazione();
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
      montati -= 1;
      if (montati === 0) fermaPulsazione();
    };
  }, []);
  return (
    <Animated.View
      style={[stili.blocco, altezza !== undefined && { height: altezza }, { opacity: riduci ? 1 : pulsazione }, style]}
      accessibilityRole="progressbar"
      accessibilityLabel="Caricamento"
    >
      {righe.map((riga, i) => (
        <View key={i} style={[stili.riga, typeof riga === 'number' ? { width: riga } : { width: riga.larghezza, height: riga.altezza }]} />
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
