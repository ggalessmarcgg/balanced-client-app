import { StyleSheet, View } from 'react-native';

import { colori, raggio, spazio } from '@/ui/theme';

export type IndicatoreAvanzamentoProps = {
  /** Indice del passaggio attivo (0..passi−1). */
  attivo: number;
  passi?: number;
};

// Indicatore di avanzamento (Figma 449:241): segmenti alti 4 con gap 4; l'attivo è verde e lungo 125, gli altri a riempimento su linea/guida.
// Attivo e inattivo definiscono tutte le stesse proprietà flex: cambiando passaggio un segmento che era attivo torna corto
// (una proprietà solo rimossa dallo stile non viene sempre azzerata dalla vista nativa).
const ALTEZZA = 4;
const LARGHEZZA_ATTIVO = 125;

/** Indicatore a segmenti dei passaggi del diario (stesso disegno del questionario di onboarding). */
export function IndicatoreAvanzamento({ attivo, passi = 4 }: IndicatoreAvanzamentoProps) {
  return (
    <View style={stili.riga} accessibilityRole="progressbar" accessibilityLabel={`Passaggio ${attivo + 1} di ${passi}`} accessibilityValue={{ min: 1, max: passi, now: attivo + 1 }}>
      {Array.from({ length: passi }, (_, i) => (
        <View key={`${i}-${i === attivo ? 'attivo' : 'inattivo'}`} style={[stili.segmento, i === attivo ? stili.segmentoAttivo : stili.segmentoInattivo]} />
      ))}
    </View>
  );
}

const stili = StyleSheet.create({
  riga: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'flex-start', gap: spazio[4] },
  segmento: { height: ALTEZZA, borderRadius: raggio.pieno },
  segmentoAttivo: { flexGrow: 0, flexShrink: 0, flexBasis: LARGHEZZA_ATTIVO, backgroundColor: colori.azione.primaria },
  segmentoInattivo: { flexGrow: 1, flexShrink: 1, flexBasis: 0, backgroundColor: colori.linea.guida },
});
