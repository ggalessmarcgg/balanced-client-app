import { StyleSheet, View } from 'react-native';

import type { Indicazione } from '@/core/piano/composizione';
import { Intestazione } from '@/ui/Intestazione';
import { Pagina } from '@/ui/schermate/Pagina';
import { Testo } from '@/ui/Testo';
import { margine, spazio } from '@/ui/theme';

/**
 * Piano · 1.1 · Indicazioni (Figma 775:7878): intestazione con la sola freccia (12 sopra, margini 20), poi il
 * contenuto (16 sopra, margini 20, 40 sotto, gap 24) con il titolo "Indicazioni" in Accento serif e, per ogni
 * indicazione, titolo App/Heading e testo App/Body (gap 8), nell'ordine del piano. Senza barra di navigazione.
 */
export function SchermataIndicazioni({ indicazioni, onIndietro }: { indicazioni: Indicazione[]; onIndietro: () => void }) {
  return (
    <Pagina>
      <View style={stili.intestazione}>
        <Intestazione mostraTitolo={false} onIndietro={onIndietro} />
      </View>
      <View style={stili.contenuto}>
        <Testo stile="accentoSerif" accessibilityRole="header">
          Indicazioni
        </Testo>
        {indicazioni.map((ind, i) => (
          <View key={i} style={stili.indicazione}>
            {ind.titolo ? (
              <Testo stile="heading" accessibilityRole="header">
                {ind.titolo}
              </Testo>
            ) : null}
            {ind.testo ? <Testo stile="body">{ind.testo}</Testo> : null}
          </View>
        ))}
      </View>
    </Pagina>
  );
}

const stili = StyleSheet.create({
  intestazione: { paddingTop: spazio[12], paddingHorizontal: margine.pagina },
  contenuto: { paddingTop: spazio[16], paddingHorizontal: margine.pagina, paddingBottom: spazio[40], gap: spazio[24] },
  indicazione: { alignSelf: 'stretch', gap: spazio[8] },
});
