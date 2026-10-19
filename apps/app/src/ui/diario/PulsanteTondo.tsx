import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Testo } from '@/ui/Testo';
import { colori, opacita, raggio, spazio } from '@/ui/theme';

export type PulsanteTondoProps = {
  etichetta: string;
  /** Icona a 32 (es. Icona 32/Matita, Icona 24/Microfono resa a 32). */
  icona: ReactNode;
  onPress?: () => void;
  accessibilityHint?: string;
  /** Colore dell'etichetta (predefinito testo/primario; "Continua" della bozza usa colore/dark-green = azione/primaria). */
  colore?: string;
};

// Pulsante tondo della Card diario chiusa (Figma 456:1263): cerchio 100 su sfondo/card, icona 32 ed etichetta Caption, gap 4.
const DIAMETRO = 100;

/** Pulsante tondo "Scrivi" / "Racconta" della Card diario. */
export function PulsanteTondo({ etichetta, icona, onPress, accessibilityHint, colore }: PulsanteTondoProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={etichetta}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [stili.cerchio, pressed && stili.premuto]}
    >
      <View style={stili.contenuto}>
        {icona}
        <Testo stile="caption" colore={colore} style={stili.etichetta}>
          {etichetta}
        </Testo>
      </View>
    </Pressable>
  );
}

const stili = StyleSheet.create({
  cerchio: { width: DIAMETRO, height: DIAMETRO, borderRadius: raggio.pieno, backgroundColor: colori.sfondo.card, alignItems: 'center', justifyContent: 'center' },
  contenuto: { alignItems: 'center', gap: spazio[4] },
  etichetta: { textAlign: 'center' },
  premuto: { opacity: opacita.pulsantePremuto },
});
