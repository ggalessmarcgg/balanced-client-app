import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Animated, Keyboard, Modal, PanResponder, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions, type KeyboardEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colori, margine, opacita, raggio, spazio } from '@/ui/theme';

export type PannelloDalBassoProps = {
  aperto: boolean;
  onChiudi: () => void;
  children: ReactNode;
  /** Etichetta del pannello per lo screen reader. */
  etichetta?: string;
  /** Si può portare a schermo pieno trascinando la maniglia verso l'alto (Figma 475:1337: il foglio parte a 8 dall'area sicura superiore). */
  espandibile?: boolean;
  /** Schermo pieno forzato (modifica della giornata, Figma 475:1459). */
  pieno?: boolean;
  /** Blocco fisso in fondo al foglio (es. "Chiudi" / "Avanti"), sopra l'area sicura inferiore. */
  piede?: ReactNode;
  /** Elementi sopra il pannello (Notifica breve): la pagina sotto è coperta dal modale, quindi vanno qui. */
  sovrapposti?: ReactNode;
};

// Misure dalle schermate con pannello (es. 474:1430, 499:2709): raggi superiori 24, padding 12 / 20 / 34 (= area
// sicura inferiore) / 20, gap 20, maniglia 36 × 5 color `maniglia` centrata; velo testo/primario al 25 %.
// A schermo pieno il foglio parte a 8 dall'area sicura superiore (475:1337: y = 59 + 8).
const MANIGLIA = { larghezza: 36, altezza: 5 };
const DISTANZA_DALL_ALTO = spazio[8];
const DURATA_MS = 250;
const SOGLIA = 100;
const VELOCITA = 0.6;

/**
 * Pannello dal basso: velo semitrasparente, foglio con raggi superiori e maniglia, contenuto che scorre se non entra.
 * Si chiude toccando il velo o trascinando la maniglia verso il basso (oltre 100 pt o con un gesto veloce); se
 * espandibile, trascinando verso l'alto si porta a schermo pieno e verso il basso si riduce prima di chiudersi.
 * Il contenuto è a cura di chi lo usa; con la tastiera aperta il foglio si accorcia e resta sopra la tastiera.
 */
export function PannelloDalBasso({ aperto, onChiudi, children, etichetta, espandibile = false, pieno = false, piede, sovrapposti }: PannelloDalBassoProps) {
  const { height: altezzaSchermo } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const tastiera = useAltezzaTastiera();
  const altezzaMax = altezzaSchermo - insets.top - DISTANZA_DALL_ALTO - tastiera;
  const [scorrimento] = useState(() => new Animated.Value(altezzaSchermo));
  const [trascinamento] = useState(() => new Animated.Value(0));
  // 0 = alto quanto il contenuto, 1 = schermo pieno (altezza minima animata, senza driver nativo).
  const [estensione] = useState(() => new Animated.Value(pieno ? 1 : 0));
  const [espanso, setEspanso] = useState(pieno);
  // Altezza naturale del contenuto (non cambia durante il trascinamento): serve a dosare la crescita verso l'alto.
  const [altezzaContenuto, setAltezzaContenuto] = useState(0);
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
      Animated.timing(scorrimento, { toValue: altezzaSchermo, duration: DURATA_MS, useNativeDriver: true }).start(() => {
        setInChiusura(false);
        setEspanso(pieno);
        estensione.setValue(pieno ? 1 : 0);
      });
    }
  }, [aperto, scorrimento, trascinamento, altezzaSchermo, estensione, pieno]);

  // Schermo pieno forzato (modifica) e ritorno all'altezza del contenuto quando finisce.
  const [pienoPrecedente, setPienoPrecedente] = useState(pieno);
  if (pieno !== pienoPrecedente) {
    setPienoPrecedente(pieno);
    setEspanso(pieno);
  }
  useEffect(() => {
    Animated.timing(estensione, { toValue: pieno ? 1 : 0, duration: DURATA_MS, useNativeDriver: false }).start();
  }, [pieno, estensione]);

  const paddingInferiore = tastiera > 0 ? spazio[20] : Math.max(insets.bottom, spazio[20]);
  const altezzaFoglio = Math.min(altezzaMax, altezzaContenuto + spazio[12] + paddingInferiore);
  const gesto = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderMove: (_, g) => {
          if (g.dy >= 0) {
            trascinamento.setValue(g.dy);
          } else if (espandibile && !espanso && !pieno) {
            // Verso l'alto: il foglio cresce seguendo il dito fino allo schermo pieno.
            const margineCrescita = Math.max(1, altezzaMax - altezzaFoglio);
            trascinamento.setValue(0);
            estensione.setValue(Math.min(1, -g.dy / margineCrescita));
          }
        },
        onPanResponderRelease: (_, g) => {
          if (g.dy < 0) {
            if (!espandibile || pieno) return;
            const apri = -g.dy > SOGLIA || g.vy < -VELOCITA;
            setEspanso(apri);
            Animated.spring(estensione, { toValue: apri ? 1 : 0, useNativeDriver: false }).start();
            return;
          }
          const chiudi = g.dy > SOGLIA || g.vy > VELOCITA;
          if (chiudi && espanso && !pieno) {
            // Da schermo pieno: prima si torna all'altezza del contenuto.
            setEspanso(false);
            Animated.parallel([
              Animated.spring(trascinamento, { toValue: 0, useNativeDriver: true }),
              Animated.timing(estensione, { toValue: 0, duration: DURATA_MS, useNativeDriver: false }),
            ]).start();
          } else if (chiudi) {
            Animated.timing(trascinamento, { toValue: altezzaSchermo, duration: DURATA_MS, useNativeDriver: true }).start(onChiudi);
          } else {
            Animated.spring(trascinamento, { toValue: 0, useNativeDriver: true }).start();
          }
        },
      }),
    [trascinamento, estensione, espanso, altezzaFoglio, onChiudi, altezzaSchermo, altezzaMax, espandibile, pieno],
  );

  if (!montato) return null;
  const opacitaVelo = scorrimento.interpolate({ inputRange: [0, altezzaSchermo], outputRange: [1, 0] });
  const altezzaMinima = estensione.interpolate({ inputRange: [0, 1], outputRange: [0, altezzaMax] });
  return (
    <Modal visible transparent animationType="none" onRequestClose={onChiudi} statusBarTranslucent>
      <View style={[stili.schermo, { paddingBottom: tastiera }]}>
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: opacitaVelo }]}>
          <Pressable style={stili.velo} onPress={onChiudi} accessibilityRole="button" accessibilityLabel="Chiudi" />
        </Animated.View>
        <Animated.View style={{ transform: [{ translateY: Animated.add(scorrimento, trascinamento) }] }} accessibilityViewIsModal accessibilityLabel={etichetta}>
          <Animated.View style={[stili.foglio, { maxHeight: altezzaMax, minHeight: altezzaMinima }]}>
            <View style={stili.areaManiglia} {...gesto.panHandlers} accessible={false}>
              <View style={stili.maniglia} />
            </View>
            <ScrollView
              style={stili.scorrimento}
              contentContainerStyle={[stili.contenuto, { paddingBottom: piede ? spazio[20] : paddingInferiore }]}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
              onContentSizeChange={(_, h) => setAltezzaContenuto(h)}
            >
              {children}
            </ScrollView>
            {piede && <View style={[stili.piede, { paddingBottom: paddingInferiore }]}>{piede}</View>}
          </Animated.View>
        </Animated.View>
        {sovrapposti}
      </View>
    </Modal>
  );
}

/** Altezza della tastiera a schermo (0 se chiusa): su iOS segue l'animazione di comparsa, su Android gli eventi did show/hide. */
function useAltezzaTastiera(): number {
  const [altezza, setAltezza] = useState(0);
  useEffect(() => {
    const mostra = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', (e: KeyboardEvent) => setAltezza(e.endCoordinates.height));
    const nascondi = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setAltezza(0));
    return () => {
      mostra.remove();
      nascondi.remove();
    };
  }, []);
  return altezza;
}

/** Il foglio del pannello (maniglia + contenuto), riusato dalla pagina dei componenti per l'anteprima statica. */
export function Foglio({ children, maniglia }: { children: ReactNode; maniglia?: object }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[stili.foglio, { paddingBottom: Math.max(insets.bottom, spazio[20]) }]}>
      <View style={stili.areaManiglia} {...maniglia} accessible={false}>
        <View style={stili.maniglia} />
      </View>
      <View style={stili.contenuto}>{children}</View>
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
    overflow: 'hidden',
  },
  // Area della maniglia: alta quanto basta per essere afferrata (il disegno è 5), senza spostare il contenuto.
  areaManiglia: { alignItems: 'center', marginVertical: -spazio[12], paddingVertical: spazio[12], zIndex: 1 },
  maniglia: { width: MANIGLIA.larghezza, height: MANIGLIA.altezza, borderRadius: raggio.pieno, backgroundColor: colori.maniglia },
  scorrimento: { flexGrow: 0 },
  contenuto: { paddingTop: spazio[20], paddingHorizontal: margine.pagina, gap: spazio[20] },
  piede: { paddingHorizontal: margine.pagina, paddingTop: spazio[20] },
});
