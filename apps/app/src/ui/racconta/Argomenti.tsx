import { StyleSheet, View } from 'react-native';

import { Icona } from '@/ui/icone';
import { Opzione } from '@/ui/Opzione';
import { spazio, type IconaPerMisura } from '@/ui/theme';

/** Gli argomenti di cui parlare (Figma 459:749): icona 20 "Argomento · …" e Opzione su più righe, non toccabile. */
const ARGOMENTI: { icona: IconaPerMisura[20]; testo: string }[] = [
  { icona: 'Argomento · Pasti', testo: 'Cosa hai mangiato' },
  { icona: 'Argomento · Energia', testo: 'L’energia della giornata' },
  { icona: 'Argomento · Sazietà', testo: 'Quanto sei stato sazio' },
  { icona: 'Argomento · Acqua', testo: 'Quanta acqua hai bevuto' },
  { icona: 'Argomento · Movimento', testo: 'Allenamento e movimento' },
  { icona: 'Argomento · Altro', testo: 'Altro che vuoi condividere' },
];

export function Argomenti() {
  return (
    <View style={stili.elenco} accessibilityRole="list">
      {ARGOMENTI.map((a) => (
        <View key={a.icona} style={stili.riga}>
          <Icona misura={20} nome={a.icona} />
          <Opzione etichetta={a.testo} forma="suPiuRighe" selezionata={false} cresce />
        </View>
      ))}
    </View>
  );
}

const stili = StyleSheet.create({
  elenco: { alignSelf: 'stretch', gap: spazio[4] },
  riga: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: spazio[4] },
});
