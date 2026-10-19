import { StyleSheet, View } from 'react-native';

import { colori, raggio, spazio } from '@/ui/theme';

export type IndicatoreAvanzamentoProps = {
  /** Indice del passaggio attivo (0..passi−1). */
  attivo: number;
  passi?: number;
};

// Indicatore di avanzamento (Figma 449:241): segmenti alti 4 con gap 4; l'attivo è verde e lungo 125, gli altri a riempimento su linea/guida.
const ALTEZZA = 4;
const LARGHEZZA_ATTIVO = 125;

/** Indicatore a segmenti dei passaggi del diario (stesso disegno del questionario di onboarding). */
export function IndicatoreAvanzamento({ attivo, passi = 4 }: IndicatoreAvanzamentoProps) {
  return (
    <View style={stili.riga} accessibilityRole="progressbar" accessibilityLabel={`Passaggio ${attivo + 1} di ${passi}`} accessibilityValue={{ min: 1, max: passi, now: attivo + 1 }}>
      {Array.from({ length: passi }, (_, i) => (
        <View key={i} style={[stili.segmento, i === attivo ? stili.segmentoAttivo : stili.segmentoInattivo]} />
      ))}
    </View>
  );
}

const stili = StyleSheet.create({
  riga: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'flex-start', gap: spazio[4] },
  segmento: { height: ALTEZZA, borderRadius: raggio.pieno },
  segmentoAttivo: { width: LARGHEZZA_ATTIVO, backgroundColor: colori.azione.primaria },
  segmentoInattivo: { flex: 1, backgroundColor: colori.linea.guida },
});
