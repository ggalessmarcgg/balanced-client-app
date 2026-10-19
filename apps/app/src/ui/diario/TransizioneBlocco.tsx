import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, LayoutAnimation, Platform, StyleSheet, UIManager, View } from 'react-native';

import { useRiduciMovimento, TRANSIZIONI } from '@/ui/riduciMovimento';
import { colori } from '@/ui/theme';

export type TransizioneBloccoProps = {
  /** Indice del blocco mostrato: aumenta = avanti (il nuovo entra da destra), diminuisce = indietro. */
  indice: number;
  children: ReactNode;
};

if (Platform.OS === 'android') UIManager.setLayoutAnimationEnabledExperimental?.(true);

type Istantanea = { indice: number; nodo: ReactNode };

/**
 * Push del contenuto tra i blocchi del diario, come tra gli step finali del funnel (onboarding-v2, StepPush): 250 ms
 * ease-out, il blocco uscente resta montato in sovrapposizione e scorre nel verso opposto a quello entrante. L'altezza
 * della card segue il nuovo blocco con LayoutAnimation. Con "Riduci movimento": nessuno scorrimento, solo una
 * dissolvenza breve del blocco entrante.
 */
export function TransizioneBlocco({ indice, children }: TransizioneBloccoProps) {
  const riduci = useRiduciMovimento();
  const [larghezza, setLarghezza] = useState(0);
  const [uscente, setUscente] = useState<Istantanea | null>(null);
  const corrente = useRef<Istantanea>({ indice, nodo: children });
  const avanti = useRef(true);
  const [entrata] = useState(() => new Animated.Value(1));
  const [uscita] = useState(() => new Animated.Value(0));

  // Cambio di blocco (stato derivato in render, come in StepPush del funnel): si fotografa il blocco uscente con il suo
  // ultimo contenuto prima di sostituirlo. Il ref si legge in render apposta: uno stato terrebbe un'istantanea vecchia.
  /* eslint-disable react-hooks/refs */
  if (indice !== corrente.current.indice) {
    avanti.current = indice > corrente.current.indice;
    if (!riduci) setUscente(corrente.current);
    entrata.setValue(0);
    uscita.setValue(0);
    LayoutAnimation.configureNext(LayoutAnimation.create(TRANSIZIONI.scorrimentoMs, LayoutAnimation.Types.easeOut, LayoutAnimation.Properties.opacity));
  }
  corrente.current = { indice, nodo: children };
  const verso = avanti.current ? 1 : -1;
  /* eslint-enable react-hooks/refs */

  useEffect(() => {
    if (riduci) {
      Animated.timing(entrata, { toValue: 1, duration: TRANSIZIONI.dissolvenzaMs, easing: Easing.out(Easing.ease), useNativeDriver: true }).start();
      return;
    }
    const anim = Animated.parallel([
      Animated.timing(entrata, { toValue: 1, duration: TRANSIZIONI.scorrimentoMs, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      Animated.timing(uscita, { toValue: 1, duration: TRANSIZIONI.scorrimentoMs, easing: Easing.out(Easing.ease), useNativeDriver: true }),
    ]);
    anim.start(({ finished }) => {
      if (finished) setUscente(null);
    });
    return () => anim.stop();
    // Riparte a ogni cambio di blocco.
  }, [indice, entrata, uscita, riduci]);

  const spostamento = larghezza || 1;
  const stileEntrante = riduci
    ? { opacity: entrata }
    : { transform: [{ translateX: entrata.interpolate({ inputRange: [0, 1], outputRange: [verso * spostamento, 0] }) }] };
  const stileUscente = { transform: [{ translateX: uscita.interpolate({ inputRange: [0, 1], outputRange: [0, -verso * spostamento] }) }] };

  return (
    <View style={stili.contenitore} onLayout={(e) => setLarghezza(e.nativeEvent.layout.width)}>
      <Animated.View style={stileEntrante}>{children}</Animated.View>
      {uscente && (
        <Animated.View style={[stili.uscente, stileUscente]} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {uscente.nodo}
        </Animated.View>
      )}
    </View>
  );
}

const stili = StyleSheet.create({
  contenitore: { alignSelf: 'stretch', overflow: 'hidden' },
  // Opaco come il fondo della card in quella zona (la sfumatura è già arrivata a sfondo/campo): nessuna sovrapposizione visibile.
  uscente: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: colori.sfondo.campo },
});
