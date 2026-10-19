import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colori } from '@/ui/theme';

export type PaginaProps = {
  children: ReactNode;
  /** Blocco fisso in fondo (Azioni / Comandi di Figma), sopra l'area sicura inferiore. */
  piede?: ReactNode;
  /** Colore di fondo: sfondo/pagina (in-app) o sfondo/card (schermate di accesso). */
  sfondo?: string;
  /** Il contenuto scorre se non entra (predefinito); false per schermate fisse. */
  scorrevole?: boolean;
  /** Elementi sopra tutto (barra di navigazione fluttuante, notifica breve): posizionati da chi li passa. */
  sovrapposti?: ReactNode;
};

/**
 * Impalcatura di una schermata: area sicura in alto e in basso (Figma: barra di stato 59, indicatore home 34),
 * contenuto che cresce e scorre, piede fisso. Su iOS la tastiera spinge in alto contenuto e piede.
 */
export function Pagina({ children, piede, sfondo = colori.sfondo.pagina, scorrevole = true, sovrapposti }: PaginaProps) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView style={[stili.pagina, { backgroundColor: sfondo }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[stili.pagina, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        {scorrevole ? (
          <ScrollView style={stili.pagina} contentContainerStyle={stili.contenuto} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
            {children}
          </ScrollView>
        ) : (
          <View style={stili.contenuto}>{children}</View>
        )}
        {piede}
      </View>
      {sovrapposti}
    </KeyboardAvoidingView>
  );
}

const stili = StyleSheet.create({
  pagina: { flex: 1 },
  contenuto: { flexGrow: 1 },
});
