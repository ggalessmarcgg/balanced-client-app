import { useEffect, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Reanimated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { TRANSIZIONI, useRiduciMovimento } from '@/ui/riduciMovimento';
import { Testo } from '@/ui/Testo';
import { colori, spazio } from '@/ui/theme';

/** Tempo atteso della ricetta (docs/server-ricette.md §5: 10 s con RICETTE_EFFORT=low, com'è pubblicato il server). */
export const ATTESA_RICETTA_MS = 10_000;
/** Dove si ferma la barra se la ricetta tarda ("quasi piena": Figma 5.3.2 826:8207, 335 su 353). */
const RIEMPIMENTO_MASSIMO = 335 / 353;
const ALTEZZA_BARRA = 4;
export const TESTI_ATTESA = { stimato: 'Circa 10 secondi', oltre: 'Ancora qualche secondo…' } as const;

export type BarraAttesaProps = {
  /** Spazio tra gli elementi del pannello, che la barra "apre" comparendo (l'animazione parte da sotto l'elemento precedente). */
  spaziatura: number;
  /** Prove e pagina di sviluppo: la barra parte già a questo punto dell'attesa (ms). */
  trascorsoIniziale?: number;
  /** Pagina di sviluppo: la barra resta ferma al punto iniziale (per i confronti con Figma). */
  ferma?: boolean;
};

/**
 * Indicatore del tempo d'attesa della ricetta (Figma Piano · 5.3.1 824:8208 e 5.3.2 826:8207): barra sottile (4,
 * sfondo/card, raggio 2) che si riempie di azione/primaria nel tempo atteso con "Circa 10 secondi" in Body details
 * secondario centrato (gap 8); oltre, la barra si ferma quasi piena e il testo diventa "Ancora qualche secondo…". Compare aprendosi in 300 ms
 * ease-out (come il selettore del Piano), senza animazione con "Riduci movimento".
 */
export function BarraAttesa({ spaziatura, trascorsoIniziale = 0, ferma = false }: BarraAttesaProps) {
  const riduci = useRiduciMovimento();
  const [larghezza, setLarghezza] = useState(0);
  const [altezzaNaturale, setAltezzaNaturale] = useState(0);
  const [oltre, setOltre] = useState(trascorsoIniziale >= ATTESA_RICETTA_MS);
  const comparsa = useSharedValue(0);
  const avanzamento = useSharedValue(Math.min(RIEMPIMENTO_MASSIMO, trascorsoIniziale / ATTESA_RICETTA_MS));

  useEffect(() => {
    if (altezzaNaturale === 0) return;
    comparsa.value = riduci ? 1 : withTiming(1, { duration: TRANSIZIONI.tacchetteMs, easing: Easing.out(Easing.ease) });
  }, [altezzaNaturale, riduci, comparsa]);
  useEffect(() => {
    if (ferma) return undefined;
    const restante = Math.max(0, ATTESA_RICETTA_MS - trascorsoIniziale);
    if (riduci) {
      // Senza movimento: la barra avanza a scatti di un secondo.
      const passo = 1000;
      const timer = setInterval(() => {
        avanzamento.value = Math.min(RIEMPIMENTO_MASSIMO, avanzamento.value + passo / ATTESA_RICETTA_MS);
      }, passo);
      return () => clearInterval(timer);
    }
    avanzamento.value = withTiming(RIEMPIMENTO_MASSIMO, { duration: restante, easing: Easing.out(Easing.quad) });
    return undefined;
  }, [riduci, trascorsoIniziale, avanzamento, ferma]);
  useEffect(() => {
    if (ferma) return undefined;
    const restante = Math.max(0, ATTESA_RICETTA_MS - trascorsoIniziale);
    const timer = setTimeout(() => setOltre(true), restante);
    return () => clearTimeout(timer);
  }, [trascorsoIniziale, ferma]);

  const stileContenitore = useAnimatedStyle(() => ({
    opacity: comparsa.value,
    height: altezzaNaturale * comparsa.value,
    marginTop: -spaziatura * (1 - comparsa.value),
  }));
  const stileAvanzamento = useAnimatedStyle(() => ({ width: larghezza * avanzamento.value }));

  const onLayoutInterno = (e: LayoutChangeEvent) => {
    const { height } = e.nativeEvent.layout;
    setAltezzaNaturale((h) => (h === height ? h : height));
  };

  return (
    <Reanimated.View style={[stili.contenitore, altezzaNaturale > 0 ? stileContenitore : { opacity: 0, height: 0, marginTop: -spaziatura }]} accessibilityLiveRegion="polite">
      <View style={stili.interno} onLayout={onLayoutInterno}>
        <View style={stili.barra} onLayout={(e) => setLarghezza(e.nativeEvent.layout.width)} accessible={false} importantForAccessibility="no-hide-descendants">
          <Reanimated.View style={[stili.avanzamento, stileAvanzamento]} />
        </View>
        <Testo stile="bodyDetails" colore={colori.testo.secondario} style={stili.testo}>
          {oltre ? TESTI_ATTESA.oltre : TESTI_ATTESA.stimato}
        </Testo>
      </View>
    </Reanimated.View>
  );
}

const stili = StyleSheet.create({
  contenitore: { alignSelf: 'stretch', overflow: 'hidden' },
  // Finché non è misurata la barra è presente ma invisibile e senza ingombro (l'altezza naturale la dà il contenuto interno, assoluto).
  interno: { position: 'absolute', left: 0, right: 0, top: 0, gap: spazio[8] },
  barra: { alignSelf: 'stretch', height: ALTEZZA_BARRA, borderRadius: ALTEZZA_BARRA / 2, backgroundColor: colori.sfondo.card, overflow: 'hidden' },
  avanzamento: { height: ALTEZZA_BARRA, borderRadius: ALTEZZA_BARRA / 2, backgroundColor: colori.azione.primaria },
  testo: { alignSelf: 'stretch', textAlign: 'center' },
});
