// Regola unica della tastiera (CLAUDE.md): il campo a fuoco sta per intero subito sopra la tastiera con un piccolo
// margine (anche mentre cresce), lo scorrimento non la chiude, si chiude toccando fuori dai campi o con
// Avanti/Chiudi/Invia/Invio, i piedi fissi restano coperti, aspetto sempre chiaro.
// Lo scorrimento verso il campo segue la stessa animazione della tastiera: all'inizio della comparsa
// (useKeyboardHandler.onStart, altezza finale nota) si calcola di quanto scorrere e a ogni fotogramma (onMove) si
// scorre in proporzione all'avanzamento, sul thread dell'interfaccia (Reanimated). In fondo al contenuto uno spazio
// alto quanto la parte di tastiera che copre lo scorrimento, così c'è sempre dove scorrere.
// Campi lunghi (decisione del 23/10/2026): quando il campo è più alto dello spazio libero sopra la tastiera non si
// porta sopra la tastiera il bordo inferiore del campo intero ma la riga del cursore, che si segue mentre si scrive
// o si tocca in un altro punto del testo. La posizione del cursore e del campo arrivano da react-native-keyboard-
// controller sul thread dell'interfaccia (useReanimatedFocusedInput, useFocusedInputHandler), senza misure dal JS.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ComponentRef, type ReactNode, type RefObject } from 'react';
import { findNodeHandle, Keyboard, TextInput, useWindowDimensions, View, type GestureResponderEvent, type NativeScrollEvent, type NativeSyntheticEvent, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';
import { useFocusedInputHandler, useKeyboardHandler, useReanimatedFocusedInput } from 'react-native-keyboard-controller';
import Reanimated, { runOnUI, scrollTo, useAnimatedReaction, useAnimatedRef, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, type AnimatedRef, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { toccoChiudeCampo } from '@/core/tastiera/tocco';
import { campoLungo, spostamentoPerCursore } from '@/core/tastiera/cursore';
import { colori, spazio } from '@/ui/theme';

/** Distanza tra il bordo inferiore del campo (o della riga del cursore) e la tastiera. */
export const MARGINE_SOPRA_TASTIERA = spazio[16];

/** Proprietà comuni a tutti i campi di testo dell'app: tastiera chiara, cursore e selezione nel colore dell'azione. */
export const PROPRIETA_CAMPO: Pick<TextInputProps, 'keyboardAppearance' | 'selectionColor' | 'cursorColor' | 'placeholderTextColor'> = {
  keyboardAppearance: 'light',
  selectionColor: colori.azione.primaria,
  cursorColor: colori.azione.primaria,
  placeholderTextColor: colori.testo.segnaposto,
};

/** Elemento nativo di una View (ha measureInWindow). */
type Vista = ComponentRef<typeof View>;

/**
 * Un tocco su un punto non interattivo toglie il fuoco al campo e chiude la tastiera (regola in CLAUDE.md). Lo
 * ScrollView di React Native lo fa da sé solo se ha visto la tastiera software aprirsi: con una tastiera fisica (o nel
 * simulatore con la tastiera software spenta) il cursore restava nel campo (difetto del 23/10/2026). Qui la regola non
 * dipende dalla tastiera: la vista diventa responder di un tocco iniziato fuori dal campo a fuoco (gli elementi
 * interattivi e gli altri campi lo prendono prima) e al rilascio chiude il campo; uno scorrimento la interrompe e
 * non chiude nulla.
 */
export function ChiudiCampiAlTocco({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const deveChiudere = useCallback((e: GestureResponderEvent) => toccoChiudeCampo(TextInput.State.currentlyFocusedInput(), e.target), []);
  const chiudi = useCallback(() => Keyboard.dismiss(), []);
  return (
    <View style={style} onStartShouldSetResponder={deveChiudere} onResponderRelease={chiudi} onResponderTerminationRequest={sempre}>
      {children}
    </View>
  );
}
const sempre = () => true;

type ContestoCampi = {
  /** Il campo (il suo contenitore) ha preso il fuoco: da ora in poi si tiene sopra la tastiera. */
  registra: (campo: RefObject<Vista | null>) => void;
  rimuovi: (campo: RefObject<Vista | null>) => void;
  /** Il campo a fuoco è cambiato di misura (testo su più righe): si riporta sopra la tastiera. */
  aggiorna: () => void;
};

const Contesto = createContext<ContestoCampi | null>(null);
export const FornitoreCampi = Contesto.Provider;

const ATTESA_LAYOUT_MS = 50;

export type ScorrimentoConTastiera = {
  /** Da passare come `ref` al Reanimated.ScrollView del contenitore. */
  riferimento: AnimatedRef<Reanimated.ScrollView>;
  /** Posizione corrente dello scorrimento (contentOffset.y), aggiornata dagli eventi di scorrimento sul thread dell'interfaccia. */
  posizione: SharedValue<number>;
  /** Da passare come `onScroll` (con scrollEventThrottle 16): tiene la posizione corrente sul thread dell'interfaccia. */
  onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
  /** Stile dello spazio in fondo al contenuto (un Reanimated.View vuoto dopo i figli). */
  stileSpazio: ReturnType<typeof useAnimatedStyle<ViewStyle>>;
  /** Valore del contesto da fornire ai campi (FornitoreCampi). */
  contesto: ContestoCampi;
};

/**
 * Per i contenitori scorrevoli. `spazioSotto` è quanto dello schermo sta sotto lo scorrimento (piede fisso + area
 * sicura): la tastiera copre lo scorrimento solo per la parte che lo supera.
 */
export function useScorrimentoConTastiera(spazioSotto: number): ScorrimentoConTastiera {
  const { height: altezzaFinestra } = useWindowDimensions();
  const { top: cimaSicura } = useSafeAreaInsets();
  const riferimento = useAnimatedRef<Reanimated.ScrollView>();
  const posizione = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    'worklet';
    posizione.value = e.contentOffset.y;
  });
  /** Bordo inferiore del contenitore del campo a fuoco nella finestra (−1 = nessun campo), misurato dal JS al fuoco. */
  const fondoCampo = useSharedValue(-1);
  /** Altezza del contenitore del campo a fuoco (0 = non misurata): decide se il campo è lungo. */
  const altezzaCampo = useSharedValue(0);
  const inizio = useSharedValue(0);
  const spostamento = useSharedValue(0);
  /** Altezza della tastiera: quella corrente durante l'animazione e quella finale della comparsa in corso o conclusa. */
  const tastiera = useSharedValue(0);
  const tastieraFinale = useSharedValue(0);
  const campoAFuoco = useRef<RefObject<Vista | null> | null>(null);

  // Campo di testo a fuoco e cursore, dal thread dell'interfaccia (react-native-keyboard-controller): la cima del
  // TextInput nelle coordinate del contenuto (posizione nella finestra + scorrimento al momento della misura, così
  // resta valida mentre la pagina scorre) e la riga del cursore rispetto alla cima del TextInput. Gli eventi sono
  // globali: contano solo se il campo sta dentro QUESTO scorrimento (tag dello ScrollView genitore riportato
  // dall'evento, oppure campo registrato dal contesto), altrimenti ogni pagina montata scorrerebbe per conto suo.
  const { input } = useReanimatedFocusedInput();
  const tagScorrimento = useSharedValue(-1);
  const haCampoRegistrato = useSharedValue(false);
  useEffect(() => {
    const vista = riferimento.current;
    tagScorrimento.value = vista ? (findNodeHandle(vista) ?? -1) : -1;
  }, [riferimento, tagScorrimento]);
  const cimaCampoNelContenuto = useSharedValue(-1);
  const altezzaTextInput = useSharedValue(0);
  const cursoreCima = useSharedValue(0);
  const cursoreFondo = useSharedValue(0);
  useAnimatedReaction(
    () => input.value,
    (v) => {
      'worklet';
      const mio = v && v.layout && (v.parentScrollViewTarget === tagScorrimento.value || haCampoRegistrato.value);
      if (mio) {
        cimaCampoNelContenuto.value = v.layout.absoluteY + posizione.value;
        altezzaTextInput.value = v.layout.height;
      } else {
        cimaCampoNelContenuto.value = -1;
        altezzaTextInput.value = 0;
      }
    },
  );
  /** Vero se il campo a fuoco appartiene a questo scorrimento. */
  const campoMio = (): boolean => {
    'worklet';
    return cimaCampoNelContenuto.value >= 0 || haCampoRegistrato.value;
  };

  // Di quanto scorrere perché il campo (breve: il bordo inferiore del contenitore; lungo: la riga del cursore, che
  // deve stare anche sotto la cima visibile) stia sopra la tastiera alta `altezzaTastiera`. 0 se è già a posto.
  const spostamentoNecessario = (altezzaTastiera: number): number => {
    'worklet';
    if (!campoMio()) return 0;
    const cimaCampo = cimaCampoNelContenuto.value < 0 ? -1 : cimaCampoNelContenuto.value - posizione.value;
    const altezza = altezzaCampo.value > 0 ? altezzaCampo.value : altezzaTextInput.value;
    const lungo = campoLungo(altezza, { altezzaFinestra, altezzaTastiera, cimaSicura, margine: MARGINE_SOPRA_TASTIERA });
    if (lungo && cimaCampo >= 0) {
      return spostamentoPerCursore(
        { cima: cimaCampo + cursoreCima.value, fondo: cimaCampo + cursoreFondo.value },
        { altezzaFinestra, altezzaTastiera, cimaSicura, margine: MARGINE_SOPRA_TASTIERA },
      );
    }
    // Campo breve: il contenitore misurato dal JS; se non ancora misurato, il TextInput stesso.
    const fondo = fondoCampo.value >= 0 ? fondoCampo.value : cimaCampo >= 0 ? cimaCampo + altezzaTextInput.value : -1;
    if (fondo < 0) return 0;
    return Math.max(0, fondo - (altezzaFinestra - altezzaTastiera - MARGINE_SOPRA_TASTIERA));
  };

  // Cursore spostato (tocco in un altro punto, nuova riga mentre si scrive) con la tastiera già aperta: la riga del
  // cursore si riporta in vista con uno scorrimento animato (fluido, mai a scatti).
  useFocusedInputHandler(
    {
      onSelectionChange: (e) => {
        'worklet';
        if (!campoMio()) return;
        cursoreCima.value = e.selection.start.y;
        cursoreFondo.value = e.selection.end.y;
        if (tastieraFinale.value <= 0 || spostamento.value !== 0) return;
        const delta = spostamentoNecessario(tastieraFinale.value);
        if (Math.abs(delta) >= 1) scrollTo(riferimento, 0, Math.max(0, posizione.value + delta), true);
      },
    },
    [altezzaFinestra, cimaSicura],
  );

  // Tastiera già aperta (fuoco passato da un altro campo, campo cresciuto): misura e scorrimento animato dal JS.
  const riporta = useCallback(() => {
    const campo = campoAFuoco.current?.current;
    if (!campo) return;
    campo.measureInWindow((_x, y, _w, h) => {
      fondoCampo.value = y + h;
      altezzaCampo.value = h;
      if (tastieraFinale.value <= 0) return;
      // Campo lungo: lo scorrimento lo decide il cursore (useFocusedInputHandler), non il bordo del contenitore.
      if (campoLungo(h, { altezzaFinestra, altezzaTastiera: tastieraFinale.value, cimaSicura, margine: MARGINE_SOPRA_TASTIERA })) return;
      const eccesso = y + h - (altezzaFinestra - tastieraFinale.value - MARGINE_SOPRA_TASTIERA);
      if (eccesso <= 0) return;
      const destinazione = posizione.value + eccesso;
      runOnUI(() => {
        'worklet';
        scrollTo(riferimento, 0, destinazione, true);
      })();
    });
  }, [riferimento, posizione, fondoCampo, altezzaCampo, tastieraFinale, altezzaFinestra, cimaSicura]);

  useKeyboardHandler(
    {
      onStart: (e) => {
        'worklet';
        // eslint-disable-next-line react-hooks/immutability
        tastieraFinale.value = e.height;
        if (e.height > 0) {
          inizio.value = posizione.value;
          spostamento.value = spostamentoNecessario(e.height);
        } else {
          spostamento.value = 0;
        }
      },
      onMove: (e) => {
        'worklet';
        tastiera.value = e.height;
        if (spostamento.value !== 0) scrollTo(riferimento, 0, Math.max(0, inizio.value + spostamento.value * e.progress), false);
      },
      onEnd: (e) => {
        'worklet';
        tastiera.value = e.height;
        if (spostamento.value !== 0) {
          scrollTo(riferimento, 0, Math.max(0, inizio.value + spostamento.value), false);
          spostamento.value = 0;
        }
      },
    },
    [altezzaFinestra, cimaSicura],
  );

  const stileSpazio = useAnimatedStyle<ViewStyle>(() => ({ height: Math.max(0, tastiera.value - spazioSotto) }));

  const contesto = useMemo<ContestoCampi>(
    () => ({
      registra: (campo) => {
        campoAFuoco.current = campo;
        // eslint-disable-next-line react-hooks/immutability
        haCampoRegistrato.value = true;
        riporta();
      },
      rimuovi: (campo) => {
        if (campoAFuoco.current !== campo) return;
        campoAFuoco.current = null;
        // eslint-disable-next-line react-hooks/immutability
        haCampoRegistrato.value = false;
        // eslint-disable-next-line react-hooks/immutability
        fondoCampo.value = -1;
        // eslint-disable-next-line react-hooks/immutability
        altezzaCampo.value = 0;
      },
      aggiorna: () => setTimeout(riporta, ATTESA_LAYOUT_MS),
    }),
    [riporta, fondoCampo, altezzaCampo, haCampoRegistrato],
  );

  return { riferimento, posizione, onScroll, stileSpazio, contesto };
}

/**
 * Per i campi di testo: `ref` va sul contenitore del campo (quello che deve restare visibile), le tre callback sul
 * TextInput. Senza un contenitore scorrevole intorno non fa nulla.
 */
export function useCampoSopraTastiera(): {
  ref: RefObject<Vista | null>;
  onFocus: () => void;
  onBlur: () => void;
  onContentSizeChange: () => void;
} {
  const contesto = useContext(Contesto);
  const ref = useRef<Vista | null>(null);
  const onFocus = useCallback(() => contesto?.registra(ref), [contesto]);
  const onBlur = useCallback(() => contesto?.rimuovi(ref), [contesto]);
  const onContentSizeChange = useCallback(() => contesto?.aggiorna(), [contesto]);
  return { ref, onFocus, onBlur, onContentSizeChange };
}
