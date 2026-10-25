import { Fragment, type ComponentRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { RigaPiano } from '@/core/piano/composizione';
import { Separatore } from '@/ui/Separatore';
import { Testo } from '@/ui/Testo';
import { colori, opacita, spazio } from '@/ui/theme';

/** Collegamento al tutorial: `ref` e `onLayout` sul contenitore della prima riga del gruppo (useRiquadroTutorial). */
export type MisuraRiga = { ref: (v: ComponentRef<typeof View> | null) => void; onLayout: () => void };

export type GruppoRigheProps = {
  titolo: string;
  righe: RigaPiano[];
  /** Tocco su una riga (step 9: apre il pannello "Sostituisci"); una riga senza id non è toccabile. */
  onRiga?: (riga: RigaPiano) => void;
  /** Misura della prima riga per il tutorial della sostituzione. */
  misuraPrimaRiga?: MisuraRiga;
};

/**
 * Blocco di righe del Piano (Figma 527:2947 / 527:3070): intestazione App/Heading (il nome del pasto nel fisso, la
 * categoria nel variabile, a capo se lunga) con 8 sotto, poi le righe "nome · quantità" in App/Body con 10 sopra e
 * sotto e il Separatore tra una riga e l'altra. Ogni riga con id si tocca per cercare un'alternativa (step 9).
 */
export function GruppoRighe({ titolo, righe, onRiga, misuraPrimaRiga }: GruppoRigheProps) {
  return (
    <View style={stili.gruppo}>
      <Testo stile="heading" accessibilityRole="header">
        {titolo}
      </Testo>
      <View style={stili.elenco}>
        {righe.map((r, i) => (
          <Fragment key={i}>
            {i > 0 && <Separatore />}
            <View ref={i === 0 ? misuraPrimaRiga?.ref : undefined} onLayout={i === 0 ? misuraPrimaRiga?.onLayout : undefined} collapsable={false}>
              <RigaDelPiano riga={r} onPress={onRiga && r.id !== null ? () => onRiga(r) : undefined} />
            </View>
          </Fragment>
        ))}
      </View>
    </View>
  );
}

/** Una riga del piano; toccabile quando ha un'azione (opacità del pulsante premuto durante il tocco). */
export function RigaDelPiano({ riga, onPress }: { riga: RigaPiano; onPress?: () => void }) {
  if (!onPress)
    return (
      <View style={stili.riga}>
        <Testo stile="body">{riga.testo}</Testo>
      </View>
    );
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [stili.riga, pressed && stili.premuta]} accessibilityRole="button" accessibilityLabel={riga.testo} accessibilityHint="Cerca un'alternativa a questo alimento">
      <Testo stile="body">{riga.testo}</Testo>
    </Pressable>
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
  premuta: { opacity: opacita.pulsantePremuto },
  piede: { alignSelf: 'stretch', textAlign: 'center' },
});
