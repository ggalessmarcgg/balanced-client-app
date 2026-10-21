import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Testo } from '@/ui/Testo';
import { colori, raggio, spazio } from '@/ui/theme';

/** Card crema delle schermate del menu (Figma 515:2980 e simili): padding 32, gap 12, titolo Heading. */
export function CardSezione({ titolo, children, style }: { titolo: string; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[stili.card, style]}>
      <Testo stile="heading" accessibilityRole="header">
        {titolo}
      </Testo>
      {children}
    </View>
  );
}

const stili = StyleSheet.create({
  card: { alignSelf: 'stretch', padding: spazio[32], gap: spazio[12], backgroundColor: colori.sfondo.card, borderRadius: raggio.card },
});
