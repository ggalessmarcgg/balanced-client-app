import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NotificaBreve, type NotificaBreveProps } from '@/ui/NotificaBreve';
import { margine, spazio } from '@/ui/theme';

/**
 * Notifica breve nella posizione delle schermate Figma (Trasversali 4 e 5, 563:5122): margini 20 e 16 sopra
 * l'area sicura inferiore, sopra il contenuto. Nelle pagine con la barra di navigazione va sopra la barra:
 * chi la usa passa `sopra` (altezza della barra + 8). Sta sopra anche al Pannello dal basso (zIndex 10): con un
 * pannello aperto (es. "Elimina account" con la rete assente) la notifica resta visibile.
 */
export function NotificaInBasso({ sopra = 0, ...props }: NotificaBreveProps & { sopra?: number }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[stili.posizione, { bottom: insets.bottom + spazio[16] + sopra }]} pointerEvents="box-none">
      <NotificaBreve {...props} />
    </View>
  );
}

const stili = StyleSheet.create({
  posizione: { position: 'absolute', left: margine.pagina, right: margine.pagina, zIndex: 20, elevation: 20 },
});
