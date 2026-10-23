import { useCallback, useEffect, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { LARGHEZZA_SUGGERIMENTO, Suggerimento } from '@/ui/Suggerimento';
import { colori, opacita, spazio } from '@/ui/theme';

/** Posizione nella finestra dell'elemento da evidenziare. */
export type RiquadroTutorial = { x: number; y: number; larghezza: number; altezza: number };

/**
 * Misura l'elemento da evidenziare: `ref` e `onLayout` vanno sul contenitore dell'elemento nella pagina; `riquadro`
 * è la sua posizione nella finestra (null finché non è misurato o se il tutorial non è attivo).
 */
export function useRiquadroTutorial(attivo: boolean): { ref: (v: ComponentRef<typeof View> | null) => void; onLayout: () => void; riquadro: RiquadroTutorial | null } {
  const vista = useRef<ComponentRef<typeof View> | null>(null);
  const [riquadro, setRiquadro] = useState<RiquadroTutorial | null>(null);
  const misura = useCallback(() => {
    if (!attivo) return;
    vista.current?.measureInWindow((x, y, larghezza, altezza) => {
      if (larghezza > 0 && altezza > 0) setRiquadro((r) => (r && r.x === x && r.y === y && r.larghezza === larghezza && r.altezza === altezza ? r : { x, y, larghezza, altezza }));
    });
  }, [attivo]);
  useEffect(() => {
    misura();
  }, [misura]);
  const ref = useCallback((v: ComponentRef<typeof View> | null) => {
    vista.current = v;
  }, []);
  // Da inattivo la misura non vale (l'elemento può essere cambiato): si rifà alla prossima attivazione.
  return { ref, onLayout: misura, riquadro: attivo ? riquadro : null };
}

export type TutorialProps = {
  /** Posizione dell'elemento evidenziato; finché è null il tutorial non compare. */
  riquadro: RiquadroTutorial | null;
  /** Copia dell'elemento evidenziato, resa sopra il velo nella stessa posizione (non toccabile). */
  elemento: ReactNode;
  testo: string;
  onHoCapito: () => void;
};

/** Distanza tra la punta del suggerimento e l'elemento evidenziato (Figma Tutorial · 3: 7 → spazio 8). */
const DISTANZA = spazio[8];

/**
 * Tutorial a schermo (sezione Figma 1.1, schema delle schermate Tutorial): velo testo/primario al 40 %, l'elemento
 * evidenziato sopra il velo nella sua posizione e il Suggerimento con la punta verso di lui; si chiude solo con "Ho capito".
 */
export function Tutorial({ riquadro, elemento, testo, onHoCapito }: TutorialProps) {
  const { width: larghezzaFinestra } = useWindowDimensions();
  const [altezzaSuggerimento, setAltezzaSuggerimento] = useState(0);
  if (!riquadro) return null;
  const sinistra = Math.round((larghezzaFinestra - LARGHEZZA_SUGGERIMENTO) / 2);
  return (
    <View style={StyleSheet.absoluteFill} accessibilityViewIsModal>
      <View style={[StyleSheet.absoluteFill, stili.velo]} accessible={false} />
      <View style={{ position: 'absolute', left: riquadro.x, top: riquadro.y, width: riquadro.larghezza, height: riquadro.altezza }} pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants">
        {elemento}
      </View>
      <View style={[stili.suggerimento, { left: sinistra, top: riquadro.y - DISTANZA - altezzaSuggerimento, opacity: altezzaSuggerimento > 0 ? 1 : 0 }]} onLayout={(e) => setAltezzaSuggerimento(e.nativeEvent.layout.height)}>
        <Suggerimento testo={testo} onHoCapito={onHoCapito} />
      </View>
    </View>
  );
}

const stili = StyleSheet.create({
  velo: { backgroundColor: colori.testo.primario, opacity: opacita.veloTutorial },
  suggerimento: { position: 'absolute' },
});
