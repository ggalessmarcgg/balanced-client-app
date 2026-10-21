import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { Icona } from '@/ui/icone';
import { TRANSIZIONI, useRiduciMovimento } from '@/ui/riduciMovimento';
import { colori, raggio, spazio, type IconaPerMisura } from '@/ui/theme';

export type Vista = 'grafico' | 'tabella';

const VISTE: { vista: Vista; etichetta: string; icona: IconaPerMisura[16] }[] = [
  { vista: 'grafico', etichetta: 'Grafico', icona: 'Grafico' },
  { vista: 'tabella', etichetta: 'Tabella', icona: 'Tabella' },
];

/**
 * Selettore vista (Figma 524:227): pillola sfondo/campo con padding 3 e gap 2, due pulsanti con icona 16 (px 12, py 6);
 * lo sfondo dell'opzione attiva (sfondo/card) scorre fino all'opzione toccata e le icone si dissolvono, in 300 ms
 * ease-out come la barra di navigazione; con "Riduci movimento" lo sfondo salta e resta una dissolvenza breve.
 * Area toccabile 44 con hitSlop.
 */
export function SelettoreVista({ vista, onChange }: { vista: Vista; onChange: (vista: Vista) => void }) {
  const riduci = useRiduciMovimento();
  const indice = Math.max(0, VISTE.findIndex((v) => v.vista === vista));
  const [posizione] = useState(() => new Animated.Value(indice));
  const [transizione] = useState(() => new Animated.Value(indice));
  const [ascisse, setAscisse] = useState<number[]>([]);
  const [larghezze, setLarghezze] = useState<number[]>([]);
  useEffect(() => {
    const easing = Easing.out(Easing.ease);
    Animated.timing(posizione, { toValue: indice, duration: riduci ? 0 : TRANSIZIONI.tacchetteMs, easing, useNativeDriver: true }).start();
    Animated.timing(transizione, { toValue: indice, duration: riduci ? TRANSIZIONI.comparsaMs : TRANSIZIONI.tacchetteMs, easing, useNativeDriver: true }).start();
  }, [indice, riduci, posizione, transizione]);
  const misurato = ascisse.length === VISTE.length && larghezze.length === VISTE.length && ascisse.every((x) => x !== undefined) && larghezze.every((l) => l !== undefined);
  const translateX = misurato ? posizione.interpolate({ inputRange: VISTE.map((_, i) => i), outputRange: ascisse }) : 0;
  const larghezzaEvidenza = misurato ? posizione.interpolate({ inputRange: VISTE.map((_, i) => i), outputRange: larghezze.map((l) => l / (larghezze[0] || 1)) }) : 1;
  return (
    <View style={stili.pillola} accessibilityRole="tablist">
      {misurato && <Animated.View style={[stili.evidenza, { width: larghezze[0], transform: [{ translateX }, { scaleX: larghezzaEvidenza }] }]} pointerEvents="none" />}
      {VISTE.map(({ vista: v, etichetta, icona }, i) => {
        const attivazione = transizione.interpolate({ inputRange: [i - 1, i, i + 1], outputRange: [0, 1, 0], extrapolate: 'clamp' });
        const onLayout = (e: LayoutChangeEvent) => {
          const { x, width } = e.nativeEvent.layout;
          setAscisse((a) => (a[i] === x ? a : Object.assign([...a], { [i]: x })));
          setLarghezze((l) => (l[i] === width ? l : Object.assign([...l], { [i]: width })));
        };
        return (
          <Pressable key={v} onPress={() => onChange(v)} onLayout={onLayout} hitSlop={spazio[12]} accessibilityRole="tab" accessibilityLabel={etichetta} accessibilityState={{ selected: v === vista }} style={[stili.voce, !misurato && v === vista && stili.voceAttivaSenzaMisura]}>
            <Animated.View style={{ opacity: attivazione.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }}>
              <Icona misura={16} nome={icona} colore={colori.icona.secondaria} />
            </Animated.View>
            <Animated.View style={[stili.sopra, { opacity: attivazione }]}>
              <Icona misura={16} nome={icona} colore={colori.icona.primaria} />
            </Animated.View>
          </Pressable>
        );
      })}
    </View>
  );
}

const stili = StyleSheet.create({
  pillola: { flexDirection: 'row', gap: spazio[2], padding: spazio[3], borderRadius: raggio.pieno, backgroundColor: colori.sfondo.campo },
  // L'evidenza è larga quanto la prima opzione e si scala verso la larghezza dell'opzione attiva (origine a sinistra).
  evidenza: { position: 'absolute', left: 0, top: spazio[3], bottom: spazio[3], borderRadius: raggio.pieno, backgroundColor: colori.sfondo.card, transformOrigin: 'left' },
  voce: { paddingHorizontal: spazio[12], paddingVertical: spazio[6], borderRadius: raggio.pieno, alignItems: 'center', justifyContent: 'center' },
  voceAttivaSenzaMisura: { backgroundColor: colori.sfondo.card },
  sopra: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
});
