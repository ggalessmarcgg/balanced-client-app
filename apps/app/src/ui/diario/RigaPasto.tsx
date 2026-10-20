import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Icona } from '@/ui/icone';
import { PROPRIETA_CAMPO, useCampoSopraTastiera } from '@/ui/tastiera';
import { Testo } from '@/ui/Testo';
import { colori, raggio, spazio, testi, tocco } from '@/ui/theme';

// La riga è alta quanto il testo (20) e le righe distano 16, come in Figma: l'area toccabile si estende con l'hitSlop
// fino al minimo di 44 senza cambiare il layout.
const HIT_SLOP = { top: (tocco.minimoIos - 20) / 2, bottom: (tocco.minimoIos - 20) / 2 };

export type StatoRigaPasto = 'daCompilare' | 'aperta' | 'compilata';

export type RigaPastoProps = {
  etichetta: string;
  valore: string;
  stato: StatoRigaPasto;
  /** Tocco sulla riga chiusa: apre il campo. Sulla riga aperta: chiude il campo. */
  onToggle: () => void;
  onChangeText: (testo: string) => void;
  segnaposto?: string;
};

// Riga pasto diario (Figma 449:83). Aperta: spunta al 50 % (dalla descrizione del componente), campo alto 64 su sfondo/card con raggio piccolo.
const OPACITA_SPUNTA_APERTA = 0.5;
const ALTEZZA_CAMPO = 64;

/**
 * Riga di un pasto nella card del diario: etichetta piccola e icona 20 a destra ("+" nero da compilare, spunta verde
 * compilata, spunta al 50 % quando è aperta); aperta mostra sotto il campo di testo su più righe.
 */
export function RigaPasto({ etichetta, valore, stato, onToggle, onChangeText, segnaposto = 'Cosa hai mangiato?' }: RigaPastoProps) {
  const aperta = stato === 'aperta';
  const { ref: contenitore, onFocus: fuocoTastiera, onBlur: sfuocoTastiera, onContentSizeChange: crescitaTastiera } = useCampoSopraTastiera();
  return (
    <View ref={contenitore} style={[stili.riga, aperta && stili.rigaAperta]}>
      <Pressable
        onPress={onToggle}
        hitSlop={HIT_SLOP}
        style={stili.intestazione}
        accessibilityRole="button"
        accessibilityLabel={etichetta}
        accessibilityState={{ expanded: aperta }}
        accessibilityHint={aperta ? 'Chiude il campo' : stato === 'compilata' ? 'Compilato, tocca per modificare' : 'Da compilare, tocca per scrivere'}
      >
        <Testo stile="etichettaPiccola" style={stili.etichetta}>
          {etichetta}
        </Testo>
        {stato === 'daCompilare' && <Icona misura={20} nome="Più" />}
        {stato === 'compilata' && <Icona misura={20} nome="Spunta" colore={colori.azione.primaria} />}
        {aperta && (
          <View style={stili.spuntaAperta}>
            <Icona misura={20} nome="Spunta" />
          </View>
        )}
      </Pressable>
      {aperta && (
        <TextInput
          {...PROPRIETA_CAMPO}
          value={valore}
          onChangeText={onChangeText}
          placeholder={segnaposto}
          multiline
          autoFocus
          textAlignVertical="top"
          onFocus={fuocoTastiera}
          onBlur={sfuocoTastiera}
          onContentSizeChange={crescitaTastiera}
          accessibilityLabel={`${etichetta}, testo`}
          style={stili.campo}
        />
      )}
    </View>
  );
}

const stili = StyleSheet.create({
  riga: { alignSelf: 'stretch' },
  rigaAperta: { gap: spazio[8] },
  intestazione: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: spazio[12] },
  etichetta: { flex: 1 },
  spuntaAperta: { opacity: OPACITA_SPUNTA_APERTA },
  campo: {
    ...testi.bodyDetails,
    color: colori.testo.primario,
    alignSelf: 'stretch',
    minHeight: ALTEZZA_CAMPO,
    paddingVertical: spazio[12],
    paddingHorizontal: spazio[16],
    backgroundColor: colori.sfondo.card,
    borderRadius: raggio.piccolo,
  },
});
