import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { useRiduciMovimento, TRANSIZIONI } from '@/ui/riduciMovimento';
import { colori, raggio, spazio, tocco } from '@/ui/theme';

export type IndicatoreAvanzamentoProps = {
  /** Indice del passaggio attivo (0..passi−1). */
  attivo: number;
  passi?: number;
  /** Etichette dei passaggi per lo screen reader (es. "Pasti"). */
  etichette?: string[];
  /** Tocco su una tacchetta: porta a quel passaggio (avanti o indietro). */
  onSeleziona?: (indice: number) => void;
  /**
   * Larghezza della tacchetta attiva: 125 nel diario (Figma 449:241); "doppia" nel carosello del primo accesso
   * (586:4923), dove l'attiva è lunga il doppio delle altre e tutte si dividono la larghezza disponibile.
   */
  larghezzaAttivo?: number | 'doppia';
  /** Nome del passaggio per lo screen reader ("Passaggio" nel diario, "Pagina" nel carosello). */
  nomePassaggio?: string;
};

// Indicatore di avanzamento (Figma 449:241): segmenti alti 4 con gap 4; l'attivo è verde e lungo 125, gli altri si
// dividono lo spazio restante su linea/guida. Al cambio di passaggio larghezza e colore animano in 300 ms ease-out come
// le tacchette del funnel (onboarding-v2, segmented-indicator.css). Ogni tacchetta è toccabile con area alta 44.
const ALTEZZA = 4;
const LARGHEZZA_ATTIVO = 125;
const GAP = spazio[4];
const HIT_SLOP = { top: (tocco.minimoIos - ALTEZZA) / 2, bottom: (tocco.minimoIos - ALTEZZA) / 2, left: GAP / 2, right: GAP / 2 };

/** Indicatore a segmenti dei passaggi del diario (stesso disegno del questionario di onboarding), animato e toccabile. */
export function IndicatoreAvanzamento({ attivo, passi = 4, etichette, onSeleziona, larghezzaAttivo = LARGHEZZA_ATTIVO, nomePassaggio = 'Passaggio' }: IndicatoreAvanzamentoProps) {
  const [larghezza, setLarghezza] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setLarghezza(e.nativeEvent.layout.width);
  const spazioLibero = larghezza - GAP * (passi - 1);
  // Attiva fissa: le altre si dividono il resto. Attiva doppia: lo spazio si divide in passi + 1 parti, due all'attiva.
  const larghezzaInattivo = larghezza > 0 ? Math.max(0, larghezzaAttivo === 'doppia' ? spazioLibero / (passi + 1) : (spazioLibero - larghezzaAttivo) / (passi - 1)) : 0;
  const larghezzaAttiva = larghezzaAttivo === 'doppia' ? larghezzaInattivo * 2 : larghezzaAttivo;
  return (
    <View
      style={stili.riga}
      onLayout={onLayout}
      accessibilityRole="progressbar"
      accessibilityLabel={`${nomePassaggio} ${attivo + 1} di ${passi}`}
      accessibilityValue={{ min: 1, max: passi, now: attivo + 1 }}
    >
      {Array.from({ length: passi }, (_, i) => (
        <Tacchetta
          key={i}
          attiva={i === attivo}
          larghezzaInattivo={larghezzaInattivo}
          larghezzaAttiva={larghezzaAttiva}
          etichetta={etichette?.[i] ?? `${nomePassaggio} ${i + 1}`}
          onPress={onSeleziona ? () => onSeleziona(i) : undefined}
        />
      ))}
    </View>
  );
}

function Tacchetta({ attiva, larghezzaInattivo, larghezzaAttiva, etichetta, onPress }: { attiva: boolean; larghezzaInattivo: number; larghezzaAttiva: number; etichetta: string; onPress?: () => void }) {
  const riduci = useRiduciMovimento();
  // 0 = inattiva, 1 = attiva: larghezza e colore interpolati dallo stesso valore.
  const [stato] = useState(() => new Animated.Value(attiva ? 1 : 0));
  useEffect(() => {
    Animated.timing(stato, { toValue: attiva ? 1 : 0, duration: riduci ? 0 : TRANSIZIONI.tacchetteMs, easing: Easing.out(Easing.ease), useNativeDriver: false }).start();
  }, [attiva, stato, riduci]);
  // Prima della misura le tacchette inattive sono a riempimento; dopo, la larghezza è animata (interpolazione in pixel).
  // Al cambio delle misure (es. la riga del carosello che si allunga) le larghezze seguono, e il cambio di stato resta animato.
  const misurata = larghezzaInattivo > 0;
  const larghezza = stato.interpolate({ inputRange: [0, 1], outputRange: [larghezzaInattivo, larghezzaAttiva] });
  const colore = stato.interpolate({ inputRange: [0, 1], outputRange: [colori.linea.guida, colori.azione.primaria] });
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      hitSlop={HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel={etichetta}
      accessibilityState={{ selected: attiva }}
      style={!misurata && !attiva && stili.riempimento}
    >
      <Animated.View style={[stili.segmento, misurata ? { width: larghezza } : attiva ? { width: larghezzaAttiva } : stili.inattivaSenzaMisura, { backgroundColor: colore }]} />
    </Pressable>
  );
}

const stili = StyleSheet.create({
  riga: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'flex-start', gap: GAP },
  segmento: { height: ALTEZZA, borderRadius: raggio.pieno },
  riempimento: { flex: 1 },
  inattivaSenzaMisura: { alignSelf: 'stretch' },
});
