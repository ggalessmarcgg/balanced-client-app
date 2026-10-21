import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { etichettaLettura, paragrafi, type Contenuto } from '@/core/contenuti/contenuti';
import { Intestazione } from '@/ui/Intestazione';
import { Pagina } from '@/ui/schermate/Pagina';
import { Testo } from '@/ui/Testo';
import { margine, spazio } from '@/ui/theme';

export type SchermataContenutoProps = {
  contenuto: Contenuto;
  corpo: string;
  onIndietro: () => void;
  sovrapposti?: ReactNode;
};

/**
 * Menu · 5.1 · Contenuto (Figma 520:3086): intestazione senza titolo (12 sopra), contenuto 16 sopra, margini 20,
 * gap 20, 40 sotto: titolo Heading con "Tempo di lettura" in Caption (gap 5), paragrafi Body e titoletti Etichetta.
 */
export function SchermataContenuto({ contenuto, corpo, onIndietro, sovrapposti }: SchermataContenutoProps) {
  const lettura = etichettaLettura(contenuto.minutiLettura);
  return (
    <Pagina scorrevole={false} sovrapposti={sovrapposti}>
      <View style={stili.intestazione}>
        <Intestazione mostraTitolo={false} onIndietro={onIndietro} />
      </View>
      <ScrollView style={stili.scorrimento} contentContainerStyle={stili.contenuto} showsVerticalScrollIndicator={false}>
        <View style={stili.titolo}>
          <Testo stile="heading" accessibilityRole="header">
            {contenuto.titolo}
          </Testo>
          {lettura && <Testo stile="caption">{lettura}</Testo>}
        </View>
        {paragrafi(corpo).map((p, i) => (
          <Testo key={i} stile={p.tipo === 'titolo' ? 'etichetta' : 'body'} accessibilityRole={p.tipo === 'titolo' ? 'header' : undefined}>
            {p.testo}
          </Testo>
        ))}
      </ScrollView>
    </Pagina>
  );
}

const stili = StyleSheet.create({
  intestazione: { paddingTop: spazio[12], paddingHorizontal: margine.pagina },
  scorrimento: { flex: 1 },
  contenuto: { paddingTop: spazio[16], paddingHorizontal: margine.pagina, paddingBottom: spazio[40], gap: spazio[20] },
  titolo: { alignSelf: 'stretch', gap: spazio[5] },
});
