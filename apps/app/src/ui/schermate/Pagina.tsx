import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Reanimated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colori } from '@/ui/theme';
import { FornitoreCampi, useScorrimentoConTastiera } from '@/ui/tastiera';

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
 * contenuto che cresce e scorre, piede fisso. Tastiera (regola unica dell'app): il contenuto scorre insieme alla
 * comparsa della tastiera perché il campo a fuoco stia per intero subito sopra (src/ui/tastiera.tsx); lo scorrimento
 * non chiude la tastiera; un tocco fuori dai campi la chiude; il piede non sale sopra la tastiera.
 */
export function Pagina({ children, piede, sfondo = colori.sfondo.pagina, scorrevole = true, sovrapposti }: PaginaProps) {
  const insets = useSafeAreaInsets();
  // Il piede sta sotto lo scorrimento: la tastiera copre lo scorrimento solo per la parte che supera piede e area sicura.
  const [altezzaPiede, setAltezzaPiede] = useState(0);
  const { riferimento: scorrimento, stileSpazio: spazioTastiera, contesto: campi } = useScorrimentoConTastiera(altezzaPiede + insets.bottom);
  return (
    <View style={[stili.pagina, { backgroundColor: sfondo }]}>
      <View style={[stili.pagina, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        {scorrevole ? (
          <Reanimated.ScrollView ref={scorrimento} style={stili.pagina} contentContainerStyle={stili.contenuto} keyboardShouldPersistTaps="handled" keyboardDismissMode="none">
            <FornitoreCampi value={campi}>{children}</FornitoreCampi>
            <Reanimated.View style={spazioTastiera} />
          </Reanimated.ScrollView>
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
