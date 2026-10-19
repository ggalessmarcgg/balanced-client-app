import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import type { ReactNode } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colori, coloriCodice } from '@/ui/theme';

export type VetroProps = {
  children: ReactNode;
  /** Tinta del vetro (predefinita sfondo/barra: sfondo/card all'80 %). */
  tinta?: string;
  /** Stile del contenitore (raggio, larghezza); il contenuto viene ritagliato al raggio. */
  style?: StyleProp<ViewStyle>;
};

const VETRO_NATIVO = Platform.OS === 'ios' && isLiquidGlassAvailable();

/**
 * Effetto vetro del design system (App/Vetro, usato dalla Barra di navigazione e dalla Card settimana): vetro nativo
 * iOS con expo-glass-effect (Liquid Glass, iOS 26+); su Android, e dove il vetro non è disponibile, fondo
 * sfondo/card al 90 % senza sfocatura (coloriCodice.sfondoBarraAndroid). Decisione del 19/10/2026.
 */
export function Vetro({ children, tinta = colori.sfondo.barra, style }: VetroProps) {
  if (VETRO_NATIVO) {
    return (
      <GlassView glassEffectStyle="regular" colorScheme="light" tintColor={tinta} style={[stili.vetro, style]}>
        {children}
      </GlassView>
    );
  }
  return <View style={[stili.vetro, stili.senzaVetro, style]}>{children}</View>;
}

const stili = StyleSheet.create({
  vetro: { overflow: 'hidden' },
  senzaVetro: { backgroundColor: coloriCodice.sfondoBarraAndroid },
});
