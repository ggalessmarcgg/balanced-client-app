// Regola unica della tastiera (CLAUDE.md): il campo a fuoco sta per intero subito sopra la tastiera con un piccolo
// margine (anche mentre cresce), lo scorrimento non la chiude, si chiude toccando fuori dai campi o con
// Avanti/Chiudi/Invia/Invio, i piedi fissi restano coperti, aspetto sempre chiaro.
// Lo scorrimento verso il campo segue la stessa animazione della tastiera: all'inizio della comparsa
// (useKeyboardHandler.onStart, altezza finale nota) si calcola di quanto scorrere e a ogni fotogramma (onMove) si
// scorre in proporzione all'avanzamento, sul thread dell'interfaccia (Reanimated). In fondo al contenuto uno spazio
// alto quanto la parte di tastiera che copre lo scorrimento, così c'è sempre dove scorrere.
import { createContext, useCallback, useContext, useMemo, useRef, type ComponentRef, type RefObject } from 'react';
import { useWindowDimensions, type TextInputProps, type View, type ViewStyle } from 'react-native';
import { useKeyboardHandler } from 'react-native-keyboard-controller';
import Reanimated, { scrollTo, useAnimatedRef, useAnimatedStyle, useScrollOffset, useSharedValue, type AnimatedRef } from 'react-native-reanimated';

import { colori, spazio } from '@/ui/theme';

/** Distanza tra il bordo inferiore del campo e la tastiera. */
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
  const riferimento = useAnimatedRef<Reanimated.ScrollView>();
  const posizione = useScrollOffset(riferimento);
  /** Bordo inferiore del campo a fuoco nella finestra (−1 = nessun campo). */
  const fondoCampo = useSharedValue(-1);
  const inizio = useSharedValue(0);
  const spostamento = useSharedValue(0);
  /** Altezza della tastiera: quella corrente durante l'animazione e quella finale della comparsa in corso o conclusa. */
  const tastiera = useSharedValue(0);
  const tastieraFinale = useSharedValue(0);
  const campoAFuoco = useRef<RefObject<Vista | null> | null>(null);

  // Tastiera già aperta (fuoco passato da un altro campo, campo cresciuto): misura e scorrimento animato dal JS.
  const riporta = useCallback(() => {
    const campo = campoAFuoco.current?.current;
    if (!campo) return;
    campo.measureInWindow((_x, y, _w, h) => {
      fondoCampo.value = y + h;
      if (tastieraFinale.value <= 0) return;
      const eccesso = y + h - (altezzaFinestra - tastieraFinale.value - MARGINE_SOPRA_TASTIERA);
      if (eccesso > 0) riferimento.current?.scrollTo({ y: posizione.value + eccesso, animated: true });
    });
  }, [riferimento, posizione, fondoCampo, tastieraFinale, altezzaFinestra]);

  useKeyboardHandler(
    {
      onStart: (e) => {
        'worklet';
        // I valori condivisi di Reanimated si aggiornano per `.value` anche dentro i worklet: la regola del React
        // Compiler non li riconosce.
        // eslint-disable-next-line react-hooks/immutability
        tastieraFinale.value = e.height;
        if (e.height > 0 && fondoCampo.value >= 0) {
          inizio.value = posizione.value;
          spostamento.value = Math.max(0, fondoCampo.value - (altezzaFinestra - e.height - MARGINE_SOPRA_TASTIERA));
        } else {
          spostamento.value = 0;
        }
      },
      onMove: (e) => {
        'worklet';
        tastiera.value = e.height;
        if (spostamento.value > 0) scrollTo(riferimento, 0, inizio.value + spostamento.value * e.progress, false);
      },
      onEnd: (e) => {
        'worklet';
        tastiera.value = e.height;
        if (spostamento.value > 0) {
          scrollTo(riferimento, 0, inizio.value + spostamento.value, false);
          spostamento.value = 0;
        }
      },
    },
    [altezzaFinestra],
  );

  const stileSpazio = useAnimatedStyle<ViewStyle>(() => ({ height: Math.max(0, tastiera.value - spazioSotto) }), [spazioSotto]);

  const contesto = useMemo<ContestoCampi>(
    () => ({
      registra: (campo) => {
        campoAFuoco.current = campo;
        riporta();
      },
      rimuovi: (campo) => {
        if (campoAFuoco.current !== campo) return;
        campoAFuoco.current = null;
        // eslint-disable-next-line react-hooks/immutability
        fondoCampo.value = -1;
      },
      aggiorna: () => setTimeout(riporta, ATTESA_LAYOUT_MS),
    }),
    [riporta, fondoCampo],
  );

  return { riferimento, stileSpazio, contesto };
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
