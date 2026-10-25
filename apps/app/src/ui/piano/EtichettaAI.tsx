import { StyleSheet, View } from 'react-native';

import { Icona } from '@/ui/icone';
import { Testo } from '@/ui/Testo';
import { colori, spazio } from '@/ui/theme';

/**
 * Etichetta AI (Figma 532:3430): introduce una funzione AI con l'icona a sfumatura (Icona AI / 20 / Sostituisci) e il
 * nome della funzione in App/Etichetta AI su azione/primaria, gap 4. Usata come testata del pannello "Sostituisci".
 */
export function EtichettaAI({ etichetta }: { etichetta: string }) {
  return (
    <View style={stili.riga} accessibilityRole="header">
      <Icona misura={20} nome="Sostituisci" />
      <Testo stile="etichettaAI" colore={colori.azione.primaria}>
        {etichetta}
      </Testo>
    </View>
  );
}

const stili = StyleSheet.create({
  riga: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: spazio[4] },
});
