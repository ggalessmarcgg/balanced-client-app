import { Pressable, StyleSheet } from 'react-native';

import { useAreaToccabile } from '@/ui/areaToccabile';
import { Testo } from '@/ui/Testo';
import { colori } from '@/ui/theme';

/**
 * Azione testo (Figma 775:7814): azione testuale senza icona nello stile di Etichetta AI ma in testo/primario.
 * Usata per "Indicazioni" sulla riga del titolo del Piano. Area toccabile estesa a 44.
 */
export function AzioneTesto({ etichetta, onPress }: { etichetta: string; onPress?: () => void }) {
  const { hitSlop, onLayout } = useAreaToccabile();
  return (
    <Pressable onPress={onPress} hitSlop={hitSlop} onLayout={onLayout} accessibilityRole="button" style={stili.azione}>
      <Testo stile="etichettaAI" colore={colori.testo.primario} numberOfLines={1}>
        {etichetta}
      </Testo>
    </Pressable>
  );
}

const stili = StyleSheet.create({
  azione: { flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
});
