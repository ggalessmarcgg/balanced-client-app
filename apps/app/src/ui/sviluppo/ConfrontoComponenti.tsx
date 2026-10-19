import { ScrollView, StyleSheet, View } from 'react-native';

import { RiquadroVariante, variantiDi, type NomeComponente } from '@/ui/sviluppo/VariantiComponenti';
import { colori, margine, spazio } from '@/ui/theme';

// Rotta di confronto con Figma (lotto 2): tutte le varianti di un componente in colonna, senza altro
// intorno, così lo screenshot del simulatore si affianca allo screenshot del set Figma alla stessa scala.
export function ConfrontoComponenti({ componente }: { componente: NomeComponente }) {
  const gruppo = variantiDi(componente);
  return (
    <ScrollView style={stili.pagina} contentContainerStyle={stili.contenuto}>
      {gruppo.varianti.map((v) => (
        <View key={v.nome} style={stili.cella}>
          <RiquadroVariante variante={v} />
        </View>
      ))}
    </ScrollView>
  );
}

const stili = StyleSheet.create({
  pagina: { flex: 1, backgroundColor: colori.sfondo.pagina },
  contenuto: { paddingTop: spazio[40] + spazio[20], paddingHorizontal: margine.pagina, paddingBottom: spazio[40], gap: spazio[8], alignItems: 'flex-start' },
  cella: { alignSelf: 'stretch' },
});
