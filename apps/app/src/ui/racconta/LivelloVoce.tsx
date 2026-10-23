import { StyleSheet, View } from 'react-native';

import { ALTEZZA_BARRETTA, altezzeBarrette } from '@/core/racconta/audio';
import { colori, raggio, spazio } from '@/ui/theme';

export type LivelloVoceProps = {
  /** Ultimi livelli 0–1 (uno per lettura); le barrette più vecchie a sinistra. */
  livelli: readonly number[];
};

const LARGHEZZA_BARRETTA = 2;

/** Livello voce (Figma 459:833): otto barrette larghe 2 con gap 2, alte da 4 a 16, color icona/primaria. */
export function LivelloVoce({ livelli }: LivelloVoceProps) {
  return (
    <View style={stili.riga} accessible={false} importantForAccessibility="no-hide-descendants">
      {altezzeBarrette(livelli).map((altezza, i) => (
        <View key={i} style={[stili.barretta, { height: altezza }]} />
      ))}
    </View>
  );
}

const stili = StyleSheet.create({
  riga: { flexDirection: 'row', alignItems: 'center', gap: spazio[2], height: ALTEZZA_BARRETTA.massima },
  barretta: { width: LARGHEZZA_BARRETTA, borderRadius: raggio.pieno, backgroundColor: colori.icona.primaria },
});
