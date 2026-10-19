import { useCallback, useState } from 'react';
import type { Insets, LayoutChangeEvent } from 'react-native';

import { tocco } from '@/ui/theme';

const NESSUNO: Insets = { top: 0, bottom: 0, left: 0, right: 0 };

/**
 * Estende l'area toccabile di un Pressable fino al minimo (44 su iOS) senza cambiare il layout:
 * misura l'elemento con onLayout e calcola l'hitSlop mancante su ogni lato. Per i componenti il cui
 * disegno in Figma è più piccolo dell'area minima (icone 24, link compatti, pillole di 33).
 */
export function useAreaToccabile(minimo: number = tocco.minimoIos) {
  const [hitSlop, setHitSlop] = useState<Insets>(NESSUNO);
  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const { width, height } = e.nativeEvent.layout;
      const verticale = Math.max(0, (minimo - height) / 2);
      const orizzontale = Math.max(0, (minimo - width) / 2);
      setHitSlop((attuale) =>
        attuale.top === verticale && attuale.left === orizzontale
          ? attuale
          : { top: verticale, bottom: verticale, left: orizzontale, right: orizzontale },
      );
    },
    [minimo],
  );
  return { hitSlop, onLayout };
}
