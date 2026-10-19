import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';

import { TRANSIZIONI } from '@/ui/riduciMovimento';

export type TransizioneBloccoProps = {
  /** Indice del blocco mostrato: a ogni cambio il nuovo blocco compare con una dissolvenza brevissima. */
  indice: number;
  children: ReactNode;
};

/**
 * Comparsa del blocco al cambio di passaggio: nessuno scorrimento, solo una dissolvenza brevissima del blocco nuovo
 * (decisione del 19/10/2026 dopo le prove: l'unica animazione visibile del cambio di blocco è quella delle tacchette).
 * Il blocco viene rimontato a ogni cambio (chiave = indice), così la dissolvenza riparte da zero.
 */
export function TransizioneBlocco({ indice, children }: TransizioneBloccoProps) {
  return <Comparsa key={indice}>{children}</Comparsa>;
}

function Comparsa({ children }: { children: ReactNode }) {
  const [opacita] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const anim = Animated.timing(opacita, { toValue: 1, duration: TRANSIZIONI.comparsaMs, easing: Easing.out(Easing.ease), useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [opacita]);
  return <Animated.View style={[stili.blocco, { opacity: opacita }]}>{children}</Animated.View>;
}

const stili = StyleSheet.create({
  blocco: { alignSelf: 'stretch' },
});
