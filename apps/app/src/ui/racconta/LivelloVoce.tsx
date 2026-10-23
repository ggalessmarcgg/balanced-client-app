import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Reanimated, { Easing, useAnimatedStyle, useFrameCallback, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';

import { ALTEZZA_BARRETTA, ALTEZZE_FIGMA, altezzaBarretta, BARRETTE_LIVELLO, INTERVALLO_LETTURA_MS } from '@/core/racconta/audio';
import { useRiduciMovimento } from '@/ui/riduciMovimento';
import { colori, raggio, spazio } from '@/ui/theme';

export type LivelloVoceProps = {
  /** Livello 0–1 misurato dal microfono (una lettura ogni 100 ms); null = fermo sulle altezze del disegno. */
  livello: number | null;
};

const LARGHEZZA_BARRETTA = 2;
const INDICI = Array.from({ length: BARRETTE_LIVELLO }, (_, i) => i);

/**
 * Livello voce (Figma 459:833): otto barrette larghe 2 con gap 2, alte da 4 a 16, color icona/primaria. Le barrette
 * seguono il livello reale del microfono: il livello arriva dal JS ogni 100 ms e viene ammorbidito con una
 * transizione; l'onda che muove ogni barretta è calcolata fotogramma per fotogramma sul thread dell'interfaccia
 * (Reanimated), così il movimento è continuo e nel silenzio quasi fermo. Con "Riduci movimento" (o senza livello)
 * le barrette restano ferme sulle altezze del disegno.
 */
export function LivelloVoce({ livello }: LivelloVoceProps) {
  const riduci = useRiduciMovimento();
  const ferme = riduci || livello === null;
  return (
    <View style={stili.riga} accessible={false} importantForAccessibility="no-hide-descendants">
      {ferme ? INDICI.map((i) => <View key={i} style={[stili.barretta, { height: ALTEZZE_FIGMA[i] ?? ALTEZZA_BARRETTA.minima }]} />) : <BarretteAnimate livello={livello} />}
    </View>
  );
}

function BarretteAnimate({ livello }: { livello: number }) {
  const livelloAnimato = useSharedValue(0);
  const tempo = useSharedValue(0);
  useEffect(() => {
    // Il livello si ammorbidisce sulla durata di una lettura: nessuno scatto tra una misura e la successiva.
    livelloAnimato.value = withTiming(livello, { duration: INTERVALLO_LETTURA_MS, easing: Easing.out(Easing.quad) });
  }, [livello, livelloAnimato]);
  // L'orologio dell'onda avanza a ogni fotogramma sul thread dell'interfaccia.
  useFrameCallback((frame) => {
    tempo.value += (frame.timeSincePreviousFrame ?? 16) / 1000;
  });
  return (
    <>
      {INDICI.map((i) => (
        <Barretta key={i} indice={i} livello={livelloAnimato} tempo={tempo} />
      ))}
    </>
  );
}

function Barretta({ indice, livello, tempo }: { indice: number; livello: SharedValue<number>; tempo: SharedValue<number> }) {
  const stile = useAnimatedStyle(() => ({ height: altezzaBarretta(indice, livello.value, tempo.value) }));
  return <Reanimated.View style={[stili.barretta, stile]} />;
}

const stili = StyleSheet.create({
  riga: { flexDirection: 'row', alignItems: 'center', gap: spazio[2], height: ALTEZZA_BARRETTA.massima },
  barretta: { width: LARGHEZZA_BARRETTA, borderRadius: raggio.pieno, backgroundColor: colori.icona.primaria },
});
