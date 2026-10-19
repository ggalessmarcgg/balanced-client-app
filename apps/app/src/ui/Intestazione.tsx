import { Pressable, StyleSheet, View } from 'react-native';

import { useAreaToccabile } from '@/ui/areaToccabile';
import { Icona } from '@/ui/icone';
import { Testo } from '@/ui/Testo';
import { misuraIcona } from '@/ui/theme';

export type IntestazioneProps = {
  titolo?: string;
  /** Proprietà Figma "Mostra titolo" (predefinito: mostrato). */
  mostraTitolo?: boolean;
  /** App: titolo App/Heading. Accesso: titolo App/Body (regola delle schermate di accesso). */
  contesto?: 'app' | 'accesso';
  onIndietro?: () => void;
};

/**
 * Intestazione di schermata (Figma 638:416): icona Indietro 24 con area toccabile 44, titolo centrato
 * opzionale e un riquadro di bilanciamento a destra così il titolo resta al centro dello schermo.
 */
export function Intestazione({ titolo, mostraTitolo = true, contesto = 'app', onIndietro }: IntestazioneProps) {
  const { hitSlop, onLayout } = useAreaToccabile();
  return (
    <View style={stili.riga}>
      <Pressable onPress={onIndietro} hitSlop={hitSlop} onLayout={onLayout} accessibilityRole="button" accessibilityLabel="Indietro">
        <Icona misura={24} nome="Indietro" />
      </Pressable>
      {mostraTitolo && titolo ? (
        <Testo stile={contesto === 'accesso' ? 'body' : 'heading'} style={stili.titolo} accessibilityRole="header" numberOfLines={1}>
          {titolo}
        </Testo>
      ) : (
        <View style={stili.titolo} />
      )}
      <View style={stili.bilanciamento} />
    </View>
  );
}

const stili = StyleSheet.create({
  riga: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', minHeight: misuraIcona[24] },
  titolo: { flex: 1, textAlign: 'center' },
  bilanciamento: { width: misuraIcona[24], height: misuraIcona[24] },
});
