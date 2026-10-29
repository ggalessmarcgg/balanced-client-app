import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Animated,
  BackHandler,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type PanResponderCallbacks,
} from "react-native";
import Reanimated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { paddingInferioreSicuro } from "@/ui/areaSicura";
import { colori, margine, opacita, raggio, spazio } from "@/ui/theme";
import {
  ChiudiCampiAlTocco,
  FornitoreCampi,
  useScorrimentoConTastiera,
} from "@/ui/tastiera";

export type PannelloDalBassoProps = {
  aperto: boolean;
  onChiudi: () => void;
  children: ReactNode;
  /** Etichetta del pannello per lo screen reader. */
  etichetta?: string;
  /** Si può portare a schermo pieno trascinando verso l'alto (Figma 475:1337: il foglio parte a 8 dall'area sicura superiore). */
  espandibile?: boolean;
  /** Schermo pieno forzato (modifica della giornata, Figma 475:1459). */
  pieno?: boolean;
  /** Blocco fisso in fondo al foglio (es. "Chiudi" / "Avanti"), sopra l'area sicura inferiore; con la tastiera aperta resta coperto. */
  piede?: ReactNode;
  /**
   * Spazio tra il contenuto e il piede oltre ai 20 di fondo del contenuto: 20 (40 in tutto) per i comandi del diario,
   * 0 quando Figma disegna le azioni a gap 20 dall'ultimo elemento (Pannello scelta orario 555:422).
   */
  distanzaPiede?: number;
  /** Spazio tra gli elementi del contenuto e tra la maniglia e il primo elemento: 20 (predefinito) o 24 (Pannello sostituzione, Figma 531:3209). */
  spaziatura?: number;
  /**
   * Quando `aperto` passa a false il foglio sparisce subito, senza scorrere verso il basso: per chiudere il pannello sotto
   * una pagina che lo ha già coperto (pannello "Ricetta" dopo la transizione della pagina della ricetta).
   */
  chiusuraIstantanea?: boolean;
};

// Misure dalle schermate con pannello (es. 474:1430, 499:2709): raggi superiori 24, padding 12 / 20 / 34 (= area
// sicura inferiore) / 20, gap 20, maniglia 36 × 5 color `maniglia` centrata; velo testo/primario al 25 %.
// A schermo pieno il foglio parte a 8 dall'area sicura superiore (475:1337: y = 59 + 8).
const MANIGLIA = { larghezza: 36, altezza: 5 };
const DISTANZA_DALL_ALTO = spazio[8];
const DURATA_MS = 250;
const SOGLIA = 100;
const VELOCITA = 0.6;
const SOGLIA_INIZIO = 6;

/**
 * Pannello dal basso: velo semitrasparente, foglio con raggi superiori e maniglia, contenuto che scorre se non entra.
 * È uno strato sopra la pagina (non un Modal: così la tastiera e lo scorrimento al campo funzionano come nel resto
 * dell'app). Si chiude toccando il velo, con il tasto indietro di Android o trascinando verso il basso (oltre 100 pt o
 * con un gesto veloce) la maniglia o, quando il contenuto non scorre, il foglio intero; se espandibile, trascinando
 * verso l'alto si porta a schermo pieno e verso il basso si riduce prima di chiudersi.
 */
export function PannelloDalBasso({
  aperto,
  onChiudi,
  children,
  etichetta,
  espandibile = false,
  pieno = false,
  piede,
  distanzaPiede = spazio[20],
  spaziatura = spazio[20],
  chiusuraIstantanea = false,
}: PannelloDalBassoProps) {
  const { height: altezzaSchermo } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const altezzaMax = altezzaSchermo - insets.top - DISTANZA_DALL_ALTO;
  const [scorrimento] = useState(() => new Animated.Value(altezzaSchermo));
  const [trascinamento] = useState(() => new Animated.Value(0));
  // 0 = alto quanto il contenuto, 1 = schermo pieno (altezza minima animata, senza driver nativo).
  const [estensione] = useState(() => new Animated.Value(pieno ? 1 : 0));
  const [espanso, setEspanso] = useState(pieno);
  // Misure dello scorrimento interno: se il contenuto non entra, scorre lui e il foglio si trascina solo dalla maniglia.
  const [altezzaContenuto, setAltezzaContenuto] = useState(0);
  const [altezzaArea, setAltezzaArea] = useState(0);
  const [altezzaPiede, setAltezzaPiede] = useState(0);
  const contenutoScorre = altezzaContenuto > altezzaArea + 1;
  // Sotto lo scorrimento c'è solo il piede (che include la sua area sicura); senza piede lo scorrimento arriva al bordo.
  const {
    riferimento: scorrimentoInterno,
    onScroll: segnaPosizione,
    stileSpazio: spazioTastiera,
    contesto: campi,
  } = useScorrimentoConTastiera(piede ? altezzaPiede : 0);
  // Il pannello resta montato durante l'animazione di chiusura: stato derivato in render dal cambio di `aperto`.
  const [apertoPrecedente, setApertoPrecedente] = useState(aperto);
  const [inChiusura, setInChiusura] = useState(false);
  if (aperto !== apertoPrecedente) {
    setApertoPrecedente(aperto);
    // Chiusura istantanea: niente fase di chiusura, il foglio si smonta subito (gli Animated.Value si azzerano nell'effetto).
    if (!aperto && !chiusuraIstantanea) setInChiusura(true);
    if (!aperto && chiusuraIstantanea) setEspanso(pieno);
  }
  const montato = aperto || inChiusura;

  useEffect(() => {
    if (aperto) {
      trascinamento.setValue(0);
      Animated.timing(scorrimento, {
        toValue: 0,
        duration: DURATA_MS,
        useNativeDriver: true,
      }).start();
    } else if (chiusuraIstantanea) {
      scorrimento.setValue(altezzaSchermo);
      estensione.setValue(pieno ? 1 : 0);
    } else {
      Animated.timing(scorrimento, {
        toValue: altezzaSchermo,
        duration: DURATA_MS,
        useNativeDriver: true,
      }).start(() => {
        setInChiusura(false);
        setEspanso(pieno);
        estensione.setValue(pieno ? 1 : 0);
      });
    }
  }, [aperto, scorrimento, trascinamento, altezzaSchermo, estensione, pieno, chiusuraIstantanea]);

  // Tasto indietro di Android: chiude il pannello.
  useEffect(() => {
    if (!aperto) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      onChiudi();
      return true;
    });
    return () => sub.remove();
  }, [aperto, onChiudi]);

  // Schermo pieno forzato (modifica) e ritorno all'altezza del contenuto quando finisce.
  const [pienoPrecedente, setPienoPrecedente] = useState(pieno);
  if (pieno !== pienoPrecedente) {
    setPienoPrecedente(pieno);
    setEspanso(pieno);
  }
  useEffect(() => {
    Animated.timing(estensione, {
      toValue: pieno ? 1 : 0,
      duration: DURATA_MS,
      useNativeDriver: false,
    }).start();
  }, [pieno, estensione]);

  const paddingInferiore = paddingInferioreSicuro(insets.bottom);
  // Il foglio è alto quanto il contenuto (più maniglia e piede, che include la sua area sicura) e mai oltre il massimo.
  const altezzaFoglio = Math.min(
    altezzaMax,
    altezzaContenuto + spazio[12] + (piede ? altezzaPiede : paddingInferiore),
  );
  const gesti = useMemo(() => {
    const verticale = (dy: number, dx: number) =>
      Math.abs(dy) > SOGLIA_INIZIO && Math.abs(dy) > Math.abs(dx) * 1.5;
    const comuni: PanResponderCallbacks = {
      onPanResponderTerminationRequest: () => false,
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
          Animated.spring(estensione, {
            toValue: apri ? 1 : 0,
            useNativeDriver: false,
          }).start();
          return;
        }
        const chiudi = g.dy > SOGLIA || g.vy > VELOCITA;
        if (chiudi && espanso && !pieno) {
          // Da schermo pieno: prima si torna all'altezza del contenuto.
          setEspanso(false);
          Animated.parallel([
            Animated.spring(trascinamento, {
              toValue: 0,
              useNativeDriver: true,
            }),
            Animated.timing(estensione, {
              toValue: 0,
              duration: DURATA_MS,
              useNativeDriver: false,
            }),
          ]).start();
        } else if (chiudi) {
          Animated.timing(trascinamento, {
            toValue: altezzaSchermo,
            duration: DURATA_MS,
            useNativeDriver: true,
          }).start(onChiudi);
        } else {
          Animated.spring(trascinamento, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    };
    return {
      // Maniglia: prende il tocco fin dall'inizio (non ha figli da toccare), come il cursore della sazietà.
      maniglia: PanResponder.create({
        ...comuni,
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
      }),
      // Foglio intero: solo quando il contenuto non deve scorrere (altrimenti il gesto verticale è dello scorrimento).
      foglio: PanResponder.create({
        ...comuni,
        onMoveShouldSetPanResponderCapture: (_, g) =>
          !contenutoScorre && verticale(g.dy, g.dx),
      }),
    };
  }, [
    trascinamento,
    estensione,
    espanso,
    altezzaFoglio,
    onChiudi,
    altezzaSchermo,
    altezzaMax,
    espandibile,
    pieno,
    contenutoScorre,
  ]);

  if (!montato) return null;
  const opacitaVelo = scorrimento.interpolate({
    inputRange: [0, altezzaSchermo],
    outputRange: [1, 0],
  });
  const altezzaMinima = estensione.interpolate({
    inputRange: [0, 1],
    outputRange: [0, altezzaMax],
  });
  const riempie = pieno || espanso;
  return (
    <View style={stili.schermo}>
      <Animated.View
        style={[StyleSheet.absoluteFill, { opacity: opacitaVelo }]}
      >
        <Pressable
          style={stili.velo}
          onPress={onChiudi}
          accessibilityRole="button"
          accessibilityLabel="Chiudi"
        />
      </Animated.View>
      <Animated.View
        style={{
          transform: [{ translateY: Animated.add(scorrimento, trascinamento) }],
        }}
        accessibilityViewIsModal
        accessibilityLabel={etichetta}
      >
        <Animated.View
          style={[
            stili.foglio,
            { maxHeight: altezzaMax, minHeight: altezzaMinima },
          ]}
          {...gesti.foglio.panHandlers}
        >
          <View
            style={stili.areaManiglia}
            {...gesti.maniglia.panHandlers}
            accessible={false}
          >
            <View style={stili.maniglia} />
          </View>
          {/* Un tocco fuori dai campi, ovunque nel foglio (anche nello spazio vuoto sotto il contenuto e nel piede), chiude il campo a fuoco e la tastiera. */}
          <ChiudiCampiAlTocco
            style={riempie ? stili.scorrimentoPieno : stili.scorrimento}
          >
            <Reanimated.ScrollView
              ref={scorrimentoInterno}
              onScroll={segnaPosizione}
              scrollEventThrottle={16}
              style={riempie ? stili.scorrimentoPieno : stili.scorrimento}
              contentContainerStyle={[
                stili.contenitore,
                {
                  // Il contenuto parte `spaziatura` sotto la maniglia (12 li dà l'area della maniglia).
                  paddingTop: spaziatura - spazio[12],
                  paddingBottom: piede ? spazio[20] : paddingInferiore,
                },
              ]}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="none"
              showsVerticalScrollIndicator={false}
              scrollEnabled={contenutoScorre}
              bounces={false}
              onContentSizeChange={(_, h) => setAltezzaContenuto(h)}
              onLayout={(e) => setAltezzaArea(e.nativeEvent.layout.height)}
            >
              {/* Il gap sta su un contenitore interno: lo spazio per la tastiera (alto 0 da chiusa) non deve aggiungere un gap in fondo. */}
              <View style={[stili.interno, { gap: spaziatura }]}>
                <FornitoreCampi value={campi}>{children}</FornitoreCampi>
              </View>
              <Reanimated.View style={spazioTastiera} />
            </Reanimated.ScrollView>
            {piede && (
              <View
                style={[
                  stili.piede,
                  {
                    paddingTop: distanzaPiede,
                    paddingBottom: paddingInferiore,
                  },
                ]}
                onLayout={(e) => setAltezzaPiede(e.nativeEvent.layout.height)}
              >
                {piede}
              </View>
            )}
          </ChiudiCampiAlTocco>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

/** Il foglio del pannello (maniglia + contenuto), riusato dalla pagina dei componenti per l'anteprima statica. */
export function Foglio({
  children,
  maniglia,
}: {
  children: ReactNode;
  maniglia?: object;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        stili.foglio,
        { paddingBottom: paddingInferioreSicuro(insets.bottom) },
      ]}
    >
      <View style={stili.areaManiglia} {...maniglia} accessible={false}>
        <View style={stili.maniglia} />
      </View>
      <View style={stili.contenuto}>{children}</View>
    </View>
  );
}

const stili = StyleSheet.create({
  schermo: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "flex-end",
    zIndex: 10,
    elevation: 10,
  },
  velo: {
    flex: 1,
    backgroundColor: colori.testo.primario,
    opacity: opacita.velo,
  },
  foglio: {
    backgroundColor: colori.sfondo.pagina,
    borderTopLeftRadius: raggio.card,
    borderTopRightRadius: raggio.card,
    paddingTop: spazio[12],
    overflow: "hidden",
  },
  // Area della maniglia: alta quanto basta per essere afferrata (12 + 5 + 12); il contenuto parte 20 sotto la maniglia (Figma: titolo a 37).
  areaManiglia: {
    alignItems: "center",
    marginTop: -spazio[12],
    paddingVertical: spazio[12],
  },
  maniglia: {
    width: MANIGLIA.larghezza,
    height: MANIGLIA.altezza,
    borderRadius: raggio.pieno,
    backgroundColor: colori.maniglia,
  },
  // Lo scorrimento è alto quanto il contenuto e si restringe (flexShrink) quando il foglio tocca il massimo: così il
  // piede resta sempre visibile e scorre solo il contenuto (in React Native flexShrink è 0 se non dichiarato).
  scorrimento: { flexGrow: 0, flexShrink: 1 },
  scorrimentoPieno: { flex: 1 },
  contenitore: { paddingHorizontal: margine.pagina },
  interno: { gap: spazio[20] },
  contenuto: {
    paddingTop: spazio[8],
    paddingHorizontal: margine.pagina,
    gap: spazio[20],
  },
  piede: { paddingHorizontal: margine.pagina },
});
