import { StyleSheet, TextInput, View } from 'react-native';

import { titoloRacconto } from '@/core/racconta/audio';
import { CardSfumata } from '@/ui/diario/CardDiario';
import { PROPRIETA_CAMPO, useCampoSopraTastiera } from '@/ui/tastiera';
import { Testo } from '@/ui/Testo';
import { colori, spazio, testi } from '@/ui/theme';

export type CardRaccontoProps = {
  durataMs: number;
  /** Racconto trascritto, modificabile a mano (Card trascrizione · Completo, Figma 467:378). */
  testo: string;
  onChangeText?: (testo: string) => void;
  /** Testo fisso al posto del campo (senza connessione, errore). */
  soloLettura?: boolean;
  aFuoco?: boolean;
};

/**
 * Card del racconto: sfumatura della Card diario, padding 20, gap 8, titolo "Il tuo racconto · m:ss" in Body details
 * al 60 % e il testo in Body. Riempie lo spazio che resta nella schermata. Modificabile: il campo cresce con il testo
 * e resta sopra la tastiera (regola unica della tastiera).
 */
export function CardRacconto({ durataMs, testo, onChangeText, soloLettura = false, aFuoco = false }: CardRaccontoProps) {
  const { ref: contenitore, onFocus, onBlur, onContentSizeChange } = useCampoSopraTastiera();
  return (
    <View ref={contenitore} style={stili.riempie}>
      <CardSfumata style={stili.card}>
        <Testo stile="bodyDetails" colore={colori.testo.secondario}>
          {titoloRacconto(durataMs)}
        </Testo>
        {soloLettura ? (
          <Testo stile="body">{testo}</Testo>
        ) : (
          <TextInput
            {...PROPRIETA_CAMPO}
            value={testo}
            onChangeText={onChangeText}
            multiline
            autoFocus={aFuoco}
            textAlignVertical="top"
            scrollEnabled={false}
            onFocus={onFocus}
            onBlur={onBlur}
            onContentSizeChange={onContentSizeChange}
            accessibilityLabel="Il tuo racconto"
            accessibilityHint="Puoi correggere il testo prima di creare il diario"
            style={stili.campo}
          />
        )}
      </CardSfumata>
    </View>
  );
}

const stili = StyleSheet.create({
  riempie: { alignSelf: 'stretch', flex: 1 },
  card: { flex: 1, padding: spazio[20], gap: spazio[8] },
  campo: { ...testi.body, color: colori.testo.primario, alignSelf: 'stretch', padding: 0, margin: 0 },
});
