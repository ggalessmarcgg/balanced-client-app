import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Animated, Modal, PanResponder, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colori, margine, opacita, raggio, spazio } from '@/ui/theme';

export type PannelloDalBassoProps = {
  aperto: boolean;
  onChiudi: () => void;
  children: ReactNode;
  /** Etichetta del pannello per lo screen reader. */
  etichetta?: string;
};

// Misure dalle schermate con pannello (es. 474:1430, 499:2709): raggi superiori 24, padding 12 / 20 / 34 (= area
// sicura inferiore) / 20, gap 20, maniglia 36 × 5 color `maniglia` centrata; velo testo/primario al 25 %.
const MANIGLIA = { larghezza: 36, altezza: 5 };
const DURATA_MS = 250;
const SOGLIA_CHIUSURA = 100;
const VELOCITA_CHIUSURA = 0.6;

/**
 * Pannello dal basso: velo semitrasparente, foglio con raggi superiori e maniglia. Si chiude toccando il velo
 * o trascinando il foglio verso il basso (oltre 100 pt o con un gesto veloce); il contenuto è a cura di chi lo usa.
 */
export function PannelloDalBasso({ aperto, onChiudi, children, etichetta }: PannelloDalBassoProps) {
  const { height: altezzaSchermo } = useWindowDimensions();
  const [scorrimento] = useState(() => new Animated.Value(altezzaSchermo));
  const [trascinamento] = useState(() => new Animated.Value(0));
  // Il pannello resta montato durante l'animazione di chiusura: stato derivato in render dal cambio di `aperto`.
  const [apertoPrecedente, setApertoPrecedente] = useState(aperto);
  const [inChiusura, setInChiusura] = useState(false);
  if (aperto !== apertoPrecedente) {
    setApertoPrecedente(aperto);
    if (!aperto) setInChiusura(true);
  }
  const montato = aperto || inChiusura;

  useEffect(() => {
    if (aperto) {
      trascinamento.setValue(0);
      Animated.timing(scorrimento, { toValue: 0, duration: DURATA_MS, useNativeDriver: true }).start();
    } else {
      Animated.timing(scorrimento, { toValue: altezzaSchermo, duration: DURATA_MS, useNativeDriver: true }).start(() => setInChiusura(false));
    }
  }, [aperto, scorrimento, trascinamento, altezzaSchermo]);

  const gesto = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => g.dy > 4 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderMove: (_, g) => trascinamento.setValue(Math.max(0, g.dy)),
        onPanResponderRelease: (_, g) => {
          if (g.dy > SOGLIA_CHIUSURA || g.vy > VELOCITA_CHIUSURA) {
            Animated.timing(trascinamento, { toValue: altezzaSchermo, duration: DURATA_MS, useNativeDriver: true }).start(onChiudi);
          } else {
            Animated.spring(trascinamento, { toValue: 0, useNativeDriver: true }).start();
          }
        },
      }),
    [trascinamento, onChiudi, altezzaSchermo],
  );

  if (!montato) return null;
  const opacitaVelo = scorrimento.interpolate({ inputRange: [0, altezzaSchermo], outputRange: [1, 0] });
  return (
    <Modal visible transparent animationType="none" onRequestClose={onChiudi} statusBarTranslucent>
      <View style={stili.schermo}>
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: opacitaVelo }]}>
          <Pressable style={stili.velo} onPress={onChiudi} accessibilityRole="button" accessibilityLabel="Chiudi" />
        </Animated.View>
        <Animated.View
          style={{ transform: [{ translateY: Animated.add(scorrimento, trascinamento) }] }}
          accessibilityViewIsModal
          accessibilityLabel={etichetta}
        >
          <Foglio maniglia={gesto.panHandlers}>{children}</Foglio>
        </Animated.View>
      </View>
    </Modal>
  );
}

/** Il foglio del pannello (maniglia + contenuto), riusato dalla pagina dei componenti per l'anteprima statica. */
export function Foglio({ children, maniglia }: { children: ReactNode; maniglia?: object }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[stili.foglio, { paddingBottom: Math.max(insets.bottom, spazio[20]) }]}>
      <View style={stili.areaManiglia} {...maniglia} accessible={false}>
        <View style={stili.maniglia} />
      </View>
      {children}
    </View>
  );
}


const stili = StyleSheet.create({
  schermo: { flex: 1, justifyContent: 'flex-end' },
  velo: { flex: 1, backgroundColor: colori.testo.primario, opacity: opacita.velo },
  foglio: {
    backgroundColor: colori.sfondo.pagina,
    borderTopLeftRadius: raggio.card,
    borderTopRightRadius: raggio.card,
    paddingTop: spazio[12],
    paddingHorizontal: margine.pagina,
    gap: spazio[20],
  },
  // Area della maniglia: alta quanto basta per essere afferrata (il disegno è 5), senza spostare il contenuto.
  areaManiglia: { alignItems: 'center', marginVertical: -spazio[12], paddingVertical: spazio[12] },
  maniglia: { width: MANIGLIA.larghezza, height: MANIGLIA.altezza, borderRadius: raggio.pieno, backgroundColor: colori.maniglia },
});
