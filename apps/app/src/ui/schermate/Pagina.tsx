import { useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView, type KeyboardAwareScrollViewRef } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colori } from '@/ui/theme';
import { FornitoreCampi, MARGINE_SOPRA_TASTIERA, useGestoreCampi } from '@/ui/tastiera';

export type PaginaProps = {
  children: ReactNode;
  /** Blocco fisso in fondo (Azioni / Comandi di Figma), sopra l'area sicura inferiore. Resta al suo posto anche con la tastiera aperta (regola in CLAUDE.md). */
  piede?: ReactNode;
  /** Colore di fondo: sfondo/pagina (in-app) o sfondo/card (schermate di accesso). */
  sfondo?: string;
  /** Il contenuto scorre se non entra (predefinito); false per schermate fisse. */
  scorrevole?: boolean;
  /** Elementi sopra tutto (barra di navigazione fluttuante, pannello dal basso, notifica breve): posizionati da chi li passa. */
  sovrapposti?: ReactNode;
};

/**
 * Impalcatura di una schermata: area sicura in alto e in basso (Figma: barra di stato 59, indicatore home 34),
 * contenuto che cresre e scorre, piede fisso. Tastiera (regola unica dell'app): il contenuto scorre da solo perché il
 * campo a fuoco stia subito sopra la tastiera (KeyboardAwareScrollView, margine MARGINE_SOPRA_TASTIERA); lo
 * scorrimento non chiude la tastiera; un tocco fuori dai campi la chiude; il piede non sale sopra la tastiera.
 */
export function Pagina({ children, piede, sfondo = colori.sfondo.pagina, scorrevole = true, sovrapposti }: PaginaProps) {
  const insets = useSafeAreaInsets();
  // Il piede sta sotto lo scorrimento: la tastiera copre lo scorrimento solo per la parte che supera piede e area sicura.
  const [altezzaPiede, setAltezzaPiede] = useState(0);
  const scorrimento = useRef<KeyboardAwareScrollViewRef>(null);
  const campi = useGestoreCampi(scorrimento);
  return (
    <View style={[stili.pagina, { backgroundColor: sfondo }]}>
      <View style={[stili.pagina, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        {scorrevole ? (
          <KeyboardAwareScrollView
            ref={scorrimento}
            style={stili.pagina}
            contentContainerStyle={stili.contenuto}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="none"
            bottomOffset={MARGINE_SOPRA_TASTIERA}
            extraKeyboardSpace={-(altezzaPiede + insets.bottom)}
            onScroll={campi.onScroll}
            scrollEventThrottle={16}
          >
            <FornitoreCampi value={campi.contesto}>{children}</FornitoreCampi>
          </KeyboardAwareScrollView>
        ) : (
          <View style={stili.contenuto}>{children}</View>
        )}
        {piede && <View onLayout={(e) => setAltezzaPiede(e.nativeEvent.layout.height)}>{piede}</View>}
      </View>
      {sovrapposti}
    </View>
  );
}

const stili = StyleSheet.create({
  pagina: { flex: 1 },
  contenuto: { flexGrow: 1 },
});
