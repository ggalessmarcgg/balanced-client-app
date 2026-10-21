import { Fragment } from 'react';
import { StyleSheet, View } from 'react-native';

import { RigaElenco } from '@/ui/RigaElenco';
import { Separatore } from '@/ui/Separatore';
import { colori, raggio, spazio } from '@/ui/theme';

export type VoceElencoRevisioni = { id: string; titolo: string; incipit: string };

export type ElencoRevisioniProps = {
  voci: VoceElencoRevisioni[];
  onApri: (id: string) => void;
};

/**
 * Revisioni passate (Figma 494:2039): card crema con padding 24 / 8, una Riga elenco "Due righe" per revisione
 * ("Revisione 12 · 2 ottobre" + inizio del testo con ellissi, freccia 20) e Separatore tra le righe.
 */
export function ElencoRevisioni({ voci, onApri }: ElencoRevisioniProps) {
  if (voci.length === 0) return null;
  return (
    <View style={stili.card} accessibilityRole="list">
      {voci.map((v, i) => (
        <Fragment key={v.id}>
          {i > 0 && <Separatore />}
          <RigaElenco tipo="dueRighe" titolo={v.titolo} sottotitolo={v.incipit} onPress={() => onApri(v.id)} />
        </Fragment>
      ))}
    </View>
  );
}

const stili = StyleSheet.create({
  card: { alignSelf: 'stretch', paddingHorizontal: spazio[24], paddingVertical: spazio[8], backgroundColor: colori.sfondo.card, borderRadius: raggio.card },
});
