import { useEffect, useMemo, useState } from 'react';
import { Animated, Easing, PanResponder, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';

import { SAZIETA_MAX, SAZIETA_MIN } from '@/core/diario/modello';
import { Testo } from '@/ui/Testo';
import { colori, raggio, spazio, testi } from '@/ui/theme';

export type CursoreSazietaProps = {
  /** 1..10, null = stato "Vuoto": pallino a sinistra senza numero, nessun riempimento; satiety_level resta null finché non si trascina. */
  valore: number | null;
  /** Chiamata al rilascio (o al tocco sulla traccia) con il valore intero agganciato. */
  onChange: (valore: number) => void;
  etichettaMinimo?: string;
  etichettaMassimo?: string;
};

// Cursore sazietà (Figma 691:7467, stati Vuoto | Con valore): traccia alta 28 con base 6 sempre grigia (linea/avanzamento),
// riempimento verde fino al pallino, pallino 24 verde con il valore in SemiBold 9,5 (misura del solo pallino, senza stile
// Figma), estremi in Caption al 60 % con gap 8.
const ALTEZZA_TRACCIA = 28;
const SPESSORE = 6;
const PALLINO = 24;
const CORPO_VALORE = 9.5;
const AGGANCIO_MS = 150;

/** Centro del pallino per un valore intero, tenuto dentro la traccia. */
const centroDi = (v: number, l: number) => Math.min(Math.max((v / SAZIETA_MAX) * l, PALLINO / 2), Math.max(l - PALLINO / 2, PALLINO / 2));
/** Valore intero più vicino a una posizione del dito. */
const valoreDi = (x: number, l: number) => Math.min(SAZIETA_MAX, Math.max(SAZIETA_MIN, Math.round((x / l) * SAZIETA_MAX)));

/**
 * Cursore della sazietà 1–10. Pallino e riempimento seguono il dito in modo continuo: la posizione è un valore animato
 * aggiornato direttamente dal gesto (nessun render a ogni movimento); il numero mostrato è l'intero più vicino e cambia
 * solo quando cambia. Al rilascio il pallino si aggancia alla posizione dell'intero e il valore viene comunicato.
 * Anche il tocco sulla traccia imposta il valore. Accessibile come controllo regolabile.
 */
export function CursoreSazieta({ valore, onChange, etichettaMinimo = 'Poco sazio', etichettaMassimo = 'Pieno' }: CursoreSazietaProps) {
  const [larghezza, setLarghezza] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setLarghezza(e.nativeEvent.layout.width);

  // Centro del pallino in punti dal bordo sinistro della traccia.
  const [posizione] = useState(() => new Animated.Value(PALLINO / 2));
  const [trascinando, setTrascinando] = useState(false);
  // Intero mostrato durante il trascinamento; fuori dal trascinamento si mostra il valore ricevuto.
  const [interoTrascinato, setInteroTrascinato] = useState<number | null>(null);
  const mostrato = trascinando ? interoTrascinato : valore;

  // Fuori dal trascinamento la posizione segue il valore (anche al cambio di larghezza).
  useEffect(() => {
    if (trascinando) return;
    posizione.setValue(valore === null || larghezza <= 0 ? PALLINO / 2 : centroDi(valore, larghezza));
  }, [valore, larghezza, trascinando, posizione]);

  // Il gesto si ricrea solo al cambio di larghezza o di callback; durante il movimento non c'è nessun render:
  // la posizione animata si aggiorna direttamente e l'intero mostrato cambia solo quando cambia davvero.
  const gesto = useMemo(() => {
    const segui = (x: number) => {
      if (larghezza <= 0) return;
      posizione.setValue(Math.min(Math.max(x, PALLINO / 2), larghezza - PALLINO / 2));
      setInteroTrascinato(valoreDi(x, larghezza));
    };
    const rilascia = (x: number) => {
      if (larghezza <= 0) return;
      const intero = valoreDi(x, larghezza);
      Animated.timing(posizione, { toValue: centroDi(intero, larghezza), duration: AGGANCIO_MS, easing: Easing.out(Easing.ease), useNativeDriver: false }).start(() => {
        onChange(intero);
        setTrascinando(false);
      });
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      // Il cursore non cede il gesto allo scorrimento orizzontale della card.
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        setTrascinando(true);
        segui(e.nativeEvent.locationX);
      },
      onPanResponderMove: (e) => segui(e.nativeEvent.locationX),
      onPanResponderRelease: (e) => rilascia(e.nativeEvent.locationX),
      onPanResponderTerminate: (e) => rilascia(e.nativeEvent.locationX),
    });
  }, [larghezza, onChange, posizione]);

  const vuoto = mostrato === null;
  const sinistraPallino = Animated.subtract(posizione, PALLINO / 2);

  return (
    <View style={stili.cursore}>
      <View
        style={stili.traccia}
        onLayout={onLayout}
        {...gesto.panHandlers}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Sazietà"
        accessibilityValue={{ min: SAZIETA_MIN, max: SAZIETA_MAX, now: valore ?? undefined, text: valore === null ? 'Non indicata' : `${valore} su ${SAZIETA_MAX}` }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => {
          const attuale = valore ?? SAZIETA_MIN - 1;
          if (e.nativeEvent.actionName === 'increment') onChange(Math.min(SAZIETA_MAX, attuale + 1));
          if (e.nativeEvent.actionName === 'decrement') onChange(Math.max(SAZIETA_MIN, attuale - 1));
        }}
      >
        <View style={stili.base} />
        {!vuoto && <Animated.View style={[stili.riempimento, { width: posizione }]} />}
        <Animated.View style={[stili.pallino, { transform: [{ translateX: sinistraPallino }] }]}>
          {!vuoto && (
            <Text style={stili.valore} allowFontScaling={false}>
              {mostrato}
            </Text>
          )}
        </Animated.View>
      </View>
      <View style={stili.estremi}>
        <Testo stile="caption" colore={colori.testo.secondario}>
          {etichettaMinimo}
        </Testo>
        <Testo stile="caption" colore={colori.testo.secondario}>
          {etichettaMassimo}
        </Testo>
      </View>
    </View>
  );
}

const stili = StyleSheet.create({
  cursore: { alignSelf: 'stretch', gap: spazio[8] },
  traccia: { alignSelf: 'stretch', height: ALTEZZA_TRACCIA, justifyContent: 'center' },
  base: { position: 'absolute', left: 0, right: 0, height: SPESSORE, borderRadius: raggio.pieno, backgroundColor: colori.linea.avanzamento },
  riempimento: { position: 'absolute', left: 0, height: SPESSORE, borderRadius: raggio.pieno, backgroundColor: colori.azione.primaria },
  pallino: {
    position: 'absolute',
    top: (ALTEZZA_TRACCIA - PALLINO) / 2,
    left: 0,
    width: PALLINO,
    height: PALLINO,
    borderRadius: raggio.pieno,
    backgroundColor: colori.azione.primaria,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valore: { fontFamily: testi.captionSemiBold.fontFamily, fontSize: CORPO_VALORE, lineHeight: PALLINO, color: colori.testo.suAzione, textAlign: 'center' },
  estremi: { alignSelf: 'stretch', flexDirection: 'row', justifyContent: 'space-between' },
});
