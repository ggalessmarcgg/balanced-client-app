import { Pressable, StyleSheet, View } from 'react-native';

import { Icona } from '@/ui/icone';
import { colori, raggio, spazio } from '@/ui/theme';

export type Vista = 'grafico' | 'tabella';

/** Selettore vista (Figma 524:227): pillola sfondo/campo con padding 3 e gap 2, due pulsanti con icona 16 (px 12, py 6); il selezionato su sfondo/card. Area toccabile 44 con hitSlop. */
export function SelettoreVista({ vista, onChange }: { vista: Vista; onChange: (vista: Vista) => void }) {
  return (
    <View style={stili.pillola} accessibilityRole="tablist">
      <Pressable onPress={() => onChange('grafico')} hitSlop={spazio[12]} accessibilityRole="tab" accessibilityLabel="Grafico" accessibilityState={{ selected: vista === 'grafico' }} style={[stili.voce, vista === 'grafico' && stili.selezionata]}>
        <Icona misura={16} nome="Grafico" />
      </Pressable>
      <Pressable onPress={() => onChange('tabella')} hitSlop={spazio[12]} accessibilityRole="tab" accessibilityLabel="Tabella" accessibilityState={{ selected: vista === 'tabella' }} style={[stili.voce, vista === 'tabella' && stili.selezionata]}>
        <Icona misura={16} nome="Tabella" />
      </Pressable>
    </View>
  );
}

const stili = StyleSheet.create({
  pillola: { flexDirection: 'row', gap: spazio[2], padding: spazio[3], borderRadius: raggio.pieno, backgroundColor: colori.sfondo.campo },
  voce: { paddingHorizontal: spazio[12], paddingVertical: spazio[6], borderRadius: raggio.pieno, alignItems: 'center', justifyContent: 'center' },
  selezionata: { backgroundColor: colori.sfondo.card },
});
