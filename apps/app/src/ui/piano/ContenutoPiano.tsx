import { Fragment } from 'react';
import { StyleSheet, View } from 'react-native';

import type { RigaPiano } from '@/core/piano/composizione';
import { Separatore } from '@/ui/Separatore';
import { Testo } from '@/ui/Testo';
import { colori, spazio } from '@/ui/theme';

/**
 * Blocco di righe del Piano (Figma 527:2947 / 527:3070): intestazione App/Heading (il nome del pasto nel fisso, la
 * categoria nel variabile, a capo se lunga) con 8 sotto, poi le righe "nome · quantità" in App/Body con 10 sopra e
 * sotto e il Separatore tra una riga e l'altra.
 */
export function GruppoRighe({ titolo, righe }: { titolo: string; righe: RigaPiano[] }) {
  return (
    <View style={stili.gruppo}>
      <Testo stile="heading" accessibilityRole="header">
        {titolo}
      </Testo>
      <View style={stili.elenco}>
        {righe.map((r, i) => (
          <Fragment key={i}>
            {i > 0 && <Separatore />}
            <View style={stili.riga}>
              <Testo stile="body">{r.testo}</Testo>
            </View>
          </Fragment>
        ))}
      </View>
    </View>
  );
}

/** "Aggiornato il 12 ottobre" in App/Caption testo/terziario, centrato, in fondo al contenuto. */
export function PieDiPaginaPiano({ testo }: { testo: string }) {
  return (
    <Testo stile="caption" colore={colori.testo.terziario} style={stili.piede}>
      {testo}
    </Testo>
  );
}

const stili = StyleSheet.create({
  gruppo: { alignSelf: 'stretch', gap: spazio[8] },
  elenco: { alignSelf: 'stretch' },
  riga: { alignSelf: 'stretch', paddingVertical: spazio[10], gap: spazio[2] },
  piede: { alignSelf: 'stretch', textAlign: 'center' },
});
