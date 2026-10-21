import { StyleSheet, View } from 'react-native';

import { PannelloDalBasso } from '@/ui/PannelloDalBasso';
import { Pulsante } from '@/ui/Pulsante';
import { Testo } from '@/ui/Testo';
import { spazio } from '@/ui/theme';

export type DialogoProps = {
  aperto: boolean;
  titolo: string;
  testo: string;
  /** Azione sicura, a sinistra (Etichetta): chiude il dialogo. */
  annulla: { etichetta: string; onPress: () => void };
  /** Azione che conferma, a destra (Body). */
  conferma: { etichetta: string; onPress: () => void };
};

/**
 * Dialogo di conferma (Figma 499:2568 e 499:2709, "Elimina account"): Pannello dal basso con titolo H2, testo Body
 * e due azioni terziarie centrate con gap 24. Toccare il velo o il tasto indietro equivale ad annullare.
 */
export function Dialogo({ aperto, titolo, testo, annulla, conferma }: DialogoProps) {
  return (
    <PannelloDalBasso aperto={aperto} onChiudi={annulla.onPress} etichetta={titolo}>
      <Testo stile="h2" accessibilityRole="header">
        {titolo}
      </Testo>
      <Testo stile="body">{testo}</Testo>
      <View style={stili.azioni}>
        <Pulsante etichetta={annulla.etichetta} livello="terziarioEvidenziato" onPress={annulla.onPress} />
        <Pulsante etichetta={conferma.etichetta} livello="terziario" onPress={conferma.onPress} />
      </View>
    </PannelloDalBasso>
  );
}

const stili = StyleSheet.create({
  azioni: { alignSelf: 'stretch', flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start', gap: spazio[24] },
});
