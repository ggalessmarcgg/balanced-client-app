import { StyleSheet, View } from 'react-native';

import { colori } from '@/ui/theme';

/**
 * Separatore (Figma 625:383): linea di 1 tra le righe di un elenco, colore linea/separatore, larghezza a
 * riempimento. Lo inserisce il contenitore tra una riga e l'altra, non la riga.
 */
export function Separatore() {
  return <View style={stili.linea} accessible={false} importantForAccessibility="no" />;
}

const stili = StyleSheet.create({
  linea: { alignSelf: 'stretch', height: 1, backgroundColor: colori.linea.separatore },
});
