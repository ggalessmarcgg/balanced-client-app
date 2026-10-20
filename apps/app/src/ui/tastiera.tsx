// Regola unica della tastiera (CLAUDE.md): il campo a fuoco sta per intero subito sopra la tastiera con un piccolo
// margine (anche mentre cresce), lo scorrimento non la chiude, si chiude toccando fuori dai campi o con
// Avanti/Chiudi/Invia/Invio, i piedi fissi restano coperti, aspetto sempre chiaro.
// KeyboardAwareScrollView (react-native-keyboard-controller) tiene visibile il cursore; qui sopra si aggiunge lo
// scorrimento che porta il bordo inferiore di tutto il campo sopra la tastiera: i contenitori scorrevoli (Pagina,
// Pannello dal basso) forniscono il contesto, i campi si registrano quando prendono il fuoco.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ComponentRef, type RefObject } from 'react';
import { useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent, type TextInputProps, type View } from 'react-native';
import { KeyboardEvents, type KeyboardAwareScrollViewRef } from 'react-native-keyboard-controller';

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

/**
 * Per i contenitori scorrevoli: tiene il campo a fuoco sopra la tastiera. Restituisce il valore del contesto da
 * fornire ai campi e l'onScroll da collegare allo scorrimento (serve la posizione corrente).
 */
export function useGestoreCampi(scorrimento: RefObject<KeyboardAwareScrollViewRef | null>): { contesto: ContestoCampi; onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => void } {
  const { height: altezzaFinestra } = useWindowDimensions();
  const posizione = useRef(0);
  const tastiera = useRef(0);
  const campoAFuoco = useRef<RefObject<Vista | null> | null>(null);

  const mostra = useCallback(() => {
    const campo = campoAFuoco.current?.current;
    const scroll = scorrimento.current;
    if (!campo || !scroll || tastiera.current <= 0) return;
    campo.measureInWindow((_x, y, _w, h) => {
      const limite = altezzaFinestra - tastiera.current - MARGINE_SOPRA_TASTIERA;
      const eccesso = y + h - limite;
      if (eccesso > 0) scroll.scrollTo({ y: posizione.current + eccesso, animated: true });
    });
  }, [scorrimento, altezzaFinestra]);

  useEffect(() => {
    const mostraTastiera = KeyboardEvents.addListener('keyboardDidShow', (e) => {
      tastiera.current = e.height;
      mostra();
    });
    const nascondiTastiera = KeyboardEvents.addListener('keyboardDidHide', () => {
      tastiera.current = 0;
    });
    return () => {
      mostraTastiera.remove();
      nascondiTastiera.remove();
    };
  }, [mostra]);

  const contesto = useMemo<ContestoCampi>(
    () => ({
      registra: (campo) => {
        campoAFuoco.current = campo;
        // Tastiera già aperta (fuoco passato da un altro campo): si scorre appena il layout è assestato.
        if (tastiera.current > 0) setTimeout(mostra, ATTESA_LAYOUT_MS);
      },
      rimuovi: (campo) => {
        if (campoAFuoco.current === campo) campoAFuoco.current = null;
      },
      aggiorna: () => setTimeout(mostra, ATTESA_LAYOUT_MS),
    }),
    [mostra],
  );
  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    posizione.current = e.nativeEvent.contentOffset.y;
  }, []);
  return { contesto, onScroll };
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
