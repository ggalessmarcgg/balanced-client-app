import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from "react-native";
import Reanimated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from "react-native-reanimated";

import { Testo } from "@/ui/Testo";
import { colori, raggio, spazio } from "@/ui/theme";

export type SelettoreSegmentatoProps = {
  /** Etichette delle voci (iniziali dei giorni o nomi brevi dei pasti), tutte a larghezza uguale. */
  voci: string[];
  /** Posizione dell'evidenza in "voci" (frazionaria mentre si scorre): la muove chi possiede lo scorrimento. */
  posizione: SharedValue<number>;
  /** Voce selezionata (per l'accessibilità e la resa prima della misura). */
  indice: number;
  onSeleziona: (indice: number) => void;
};

/** Altezza del riquadro di testo di ogni voce (Figma: 20, uguale per selezionata e non). */
const ALTEZZA_TESTO = 20;
/** La voce è alta 32: l'area toccabile si estende a 44 in verticale. */
const HIT_SLOP = { top: spazio[6], bottom: spazio[6], left: 0, right: 0 };

/**
 * Selettore segmentato del Piano (Figma 528:3221, Segmento 528:221): pillola sfondo/campo con padding 3 / 4 e spazio 2,
 * voci a larghezza uguale (px 12, py 6), evidenza sfondo/card che scorre fino alla voce attiva e testi che si
 * dissolvono tra Body details (testo/secondario) ed Etichetta piccola (testo/primario). L'evidenza segue `posizione`,
 * condivisa con lo scorrimento orizzontale delle pagine: il tocco e il gesto restano sempre allineati.
 */
export function SelettoreSegmentato({
  voci,
  posizione,
  indice,
  onSeleziona,
}: SelettoreSegmentatoProps) {
  const [ascisse, setAscisse] = useState<number[]>([]);
  const [larghezze, setLarghezze] = useState<number[]>([]);
  const misurato =
    voci.length > 0 &&
    voci.every(
      (_, i) => ascisse[i] !== undefined && larghezze[i] !== undefined,
    );
  const indici = voci.map((_, i) => i);
  const stileEvidenza = useAnimatedStyle(() => {
    if (!misurato) return { opacity: 0 };
    const x =
      indici.length === 1
        ? (ascisse[0] ?? 0)
        : interpolate(posizione.value, indici, ascisse, Extrapolation.CLAMP);
    const larghezza =
      indici.length === 1
        ? (larghezze[0] ?? 0)
        : interpolate(posizione.value, indici, larghezze, Extrapolation.CLAMP);
    return { opacity: 1, width: larghezza, transform: [{ translateX: x }] };
  });
  return (
    <View style={stili.pillola} accessibilityRole="tablist">
      <Reanimated.View
        style={[stili.evidenza, stileEvidenza]}
        pointerEvents="none"
      />
      {voci.map((etichetta, i) => (
        <Segmento
          key={`${i}-${etichetta}`}
          etichetta={etichetta}
          i={i}
          posizione={posizione}
          selezionato={i === indice}
          evidenzaSenzaMisura={!misurato && i === indice}
          onPress={() => onSeleziona(i)}
          onLayout={(e: LayoutChangeEvent) => {
            const { x, width } = e.nativeEvent.layout;
            setAscisse((a) =>
              a[i] === x ? a : Object.assign([...a], { [i]: x }),
            );
            setLarghezze((l) =>
              l[i] === width ? l : Object.assign([...l], { [i]: width }),
            );
          }}
        />
      ))}
    </View>
  );
}

function Segmento({
  etichetta,
  i,
  posizione,
  selezionato,
  evidenzaSenzaMisura,
  onPress,
  onLayout,
}: {
  etichetta: string;
  i: number;
  posizione: SharedValue<number>;
  selezionato: boolean;
  evidenzaSenzaMisura: boolean;
  onPress: () => void;
  onLayout: (e: LayoutChangeEvent) => void;
}) {
  const stileAttivo = useAnimatedStyle(() => ({
    opacity: interpolate(
      posizione.value,
      [i - 1, i, i + 1],
      [0, 1, 0],
      Extrapolation.CLAMP,
    ),
  }));
  const stileInattivo = useAnimatedStyle(() => ({
    opacity:
      1 -
      interpolate(
        posizione.value,
        [i - 1, i, i + 1],
        [0, 1, 0],
        Extrapolation.CLAMP,
      ),
  }));
  return (
    <Pressable
      onPress={onPress}
      onLayout={onLayout}
      hitSlop={HIT_SLOP}
      accessibilityRole="tab"
      accessibilityLabel={etichetta}
      accessibilityState={{ selected: selezionato }}
      style={[stili.voce, evidenzaSenzaMisura && stili.voceAttivaSenzaMisura]}
    >
      <Reanimated.View style={[stili.riquadroTesto, stileInattivo]}>
        <Testo
          stile="bodyDetails"
          colore={colori.testo.secondario}
          numberOfLines={1}
          style={stili.testo}
        >
          {etichetta}
        </Testo>
      </Reanimated.View>
      <Reanimated.View style={[stili.riquadroTesto, stili.sopra, stileAttivo]}>
        <Testo
          stile="etichettaPiccola"
          colore={colori.testo.primario}
          numberOfLines={1}
          style={stili.testo}
        >
          {etichetta}
        </Testo>
      </Reanimated.View>
    </Pressable>
  );
}

const stili = StyleSheet.create({
  pillola: {
    alignSelf: "stretch",
    flexDirection: "row",
    gap: spazio[2],
    paddingHorizontal: spazio[3],
    paddingVertical: spazio[4],
    borderRadius: raggio.pieno,
    backgroundColor: colori.sfondo.campo,
  },
  evidenza: {
    position: "absolute",
    left: 0,
    top: spazio[4],
    bottom: spazio[4],
    borderRadius: raggio.pieno,
    backgroundColor: colori.sfondo.card,
  },
  voce: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: spazio[12],
    paddingVertical: spazio[6],
    borderRadius: raggio.pieno,
    alignItems: "center",
    justifyContent: "center",
  },
  voceAttivaSenzaMisura: { backgroundColor: colori.sfondo.card },
  riquadroTesto: {
    alignSelf: "stretch",
    height: ALTEZZA_TESTO,
    alignItems: "center",
    justifyContent: "center",
  },
  sopra: { position: "absolute", left: 0, right: 0, top: spazio[6] },
  testo: { textAlign: "center" },
});
