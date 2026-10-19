import { StyleSheet, View } from 'react-native';

import { Icona } from '@/ui/icone';
import { Testo } from '@/ui/Testo';
import { colori, raggio, spazio } from '@/ui/theme';

export type AvvisoConnessioneProps = {
  /** Fluttuante: pillola. Nel contenuto: raggio card, quando sta in cima al contenuto. Figma 638:410, "Posizione". */
  posizione?: 'fluttuante' | 'nelContenuto';
  testo?: string;
};

/** Avviso di assenza di connessione: icona Offline a 18 e Body details su sfondo/campo, alto 40. */
export function AvvisoConnessione({ posizione = 'fluttuante', testo = 'In questo momento sei offline.' }: AvvisoConnessioneProps) {
  return (
    <View style={[stili.avviso, posizione === 'fluttuante' ? stili.fluttuante : stili.nelContenuto]} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Icona misura={24} nome="Offline" dimensione={18} />
      <Testo stile="bodyDetails" style={stili.testo}>
        {testo}
      </Testo>
    </View>
  );
}

const stili = StyleSheet.create({
  avviso: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spazio[10],
    minHeight: 40,
    paddingVertical: spazio[10],
    paddingHorizontal: spazio[14],
    backgroundColor: colori.sfondo.campo,
  },
  fluttuante: { borderRadius: raggio.pieno },
  nelContenuto: { borderRadius: raggio.card },
  testo: { flex: 1 },
});
