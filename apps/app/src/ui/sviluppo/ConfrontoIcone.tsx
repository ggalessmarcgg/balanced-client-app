import { StyleSheet, View } from 'react-native';

import { Icona } from '@/ui/icone';
import { colori, icone, spazio, type ChiaveIcona } from '@/ui/theme';

// Griglia per il confronto a pixel con i componenti icona di Figma (esportati a 3×):
// celle 48 × 48 su fondo crema con 8 di distacco, 7 per riga, icona centrata; ordine = ordine dei token
// (per nome, come la lettura da Figma). Ritaglio automatico con strumenti/ritaglia-celle.mjs.
export const ORDINE_ICONE = Object.keys(icone) as ChiaveIcona[];

export function ConfrontoIcone({ da = 0, quante = ORDINE_ICONE.length }: { da?: number; quante?: number }) {
  const chiavi = ORDINE_ICONE.slice(da, da + quante);
  return (
    <View style={stili.pagina}>
      {chiavi.map((chiave) => {
        const v = icone[chiave];
        return (
          <View key={chiave} style={stili.cella}>
            <Icona misura={v.misura as 24} nome={v.nome as never} />
          </View>
        );
      })}
    </View>
  );
}

const stili = StyleSheet.create({
  pagina: {
    flex: 1,
    backgroundColor: colori.sfondo.pagina,
    paddingTop: 80,
    paddingLeft: spazio[20],
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spazio[8],
    alignContent: 'flex-start',
  },
  cella: { width: 48, height: 48, backgroundColor: colori.sfondo.card, alignItems: 'center', justifyContent: 'center' },
});
