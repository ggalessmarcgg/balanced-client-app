import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet } from 'react-native';

import { useAreaToccabile } from '@/ui/areaToccabile';
import { TRANSIZIONI, useRiduciMovimento } from '@/ui/riduciMovimento';
import { colori, raggio, spazio } from '@/ui/theme';

export type InterruttoreProps = {
  acceso: boolean;
  onChange?: (acceso: boolean) => void;
  /** Etichetta per lo screen reader (di norma il testo della riga che lo contiene). */
  etichetta?: string;
  disabilitato?: boolean;
};

// Interruttore (Figma 498:208): 51 × 31 come iOS, pomello 27 a 2 dal bordo, ombra 0/2 sfocatura 4 al 15 %.
const LARGHEZZA = 51;
const ALTEZZA = 31;
const POMELLO = 27;
const BORDO = 2;
const CORSA = LARGHEZZA - BORDO - POMELLO - BORDO;

/**
 * Interruttore acceso/spento. Al cambio di stato (dal tocco o da un altro interruttore, es. diario → weekend) il
 * pomello scorre e il fondo passa in dissolvenza da sfondo/campo ad azione/primaria, 300 ms ease-out come il
 * selettore grafico/tabella e la barra di navigazione (TRANSIZIONI.tacchetteMs); con "Riduci movimento" il pomello
 * salta e resta solo la dissolvenza breve. Area toccabile portata a 44 con l'hitSlop (in Figma vale l'intera riga).
 */
export function Interruttore({ acceso, onChange, etichetta, disabilitato = false }: InterruttoreProps) {
  const { hitSlop, onLayout } = useAreaToccabile();
  const riduci = useRiduciMovimento();
  // 0 = spento, 1 = acceso. Due valori: la posizione del pomello (driver nativo) e il colore del fondo (senza driver).
  const [posizione] = useState(() => new Animated.Value(acceso ? 1 : 0));
  const [colore] = useState(() => new Animated.Value(acceso ? 1 : 0));
  useEffect(() => {
    const easing = Easing.out(Easing.ease);
    const verso = acceso ? 1 : 0;
    Animated.timing(posizione, { toValue: verso, duration: riduci ? 0 : TRANSIZIONI.tacchetteMs, easing, useNativeDriver: true }).start();
    Animated.timing(colore, { toValue: verso, duration: riduci ? TRANSIZIONI.comparsaMs : TRANSIZIONI.tacchetteMs, easing, useNativeDriver: false }).start();
  }, [acceso, riduci, posizione, colore]);
  const translateX = posizione.interpolate({ inputRange: [0, 1], outputRange: [0, CORSA] });
  const backgroundColor = colore.interpolate({ inputRange: [0, 1], outputRange: [colori.sfondo.campo, colori.azione.primaria] });
  return (
    <Pressable
      onPress={() => onChange?.(!acceso)}
      disabled={disabilitato}
      hitSlop={hitSlop}
      onLayout={onLayout}
      accessibilityRole="switch"
      accessibilityLabel={etichetta}
      accessibilityState={{ checked: acceso, disabled: disabilitato }}
      style={stili.binario}
    >
      <Animated.View style={[StyleSheet.absoluteFill, stili.fondo, { backgroundColor }]} />
      <Animated.View style={[stili.pomello, { transform: [{ translateX }] }]} />
    </Pressable>
  );
}

const stili = StyleSheet.create({
  binario: { width: LARGHEZZA, height: ALTEZZA, borderRadius: raggio.pieno, overflow: 'visible' },
  fondo: { borderRadius: raggio.pieno },
  pomello: {
    position: 'absolute',
    top: BORDO,
    left: BORDO,
    width: POMELLO,
    height: POMELLO,
    borderRadius: raggio.pieno,
    backgroundColor: colori.sfondo.pagina,
    shadowColor: colori.primitivi.black,
    shadowOpacity: 0.15,
    shadowRadius: spazio[4] / 2,
    shadowOffset: { width: 0, height: spazio[2] },
    elevation: 2,
  },
});
