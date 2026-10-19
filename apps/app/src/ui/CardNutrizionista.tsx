import { StyleSheet, View } from 'react-native';

import { RigaElenco } from '@/ui/RigaElenco';
import { colori, raggio, spazio } from '@/ui/theme';

export type CardNutrizionistaProps = {
  nome: string;
  /** URL della foto quadrata (nutritionist_profiles.app_square_photo_url). */
  foto?: string | null;
  onPress?: () => void;
};

/**
 * Card della nutrizionista (Figma 638:435, versione scelta il 18/10/2026): card crema con padding 24 / 20 / 16,
 * Riga elenco con avatar 44, etichetta "La tua nutrizionista" sopra e nome sotto, freccia.
 */
export function CardNutrizionista({ nome, foto, onPress }: CardNutrizionistaProps) {
  return (
    <View style={stili.card}>
      <RigaElenco tipo="conAvatar" etichetta="La tua nutrizionista" nome={nome} avatar={foto ? { uri: foto } : undefined} onPress={onPress} />
    </View>
  );
}

const stili = StyleSheet.create({
  card: {
    alignSelf: 'stretch',
    paddingLeft: spazio[24],
    paddingRight: spazio[20],
    paddingVertical: spazio[16],
    backgroundColor: colori.sfondo.card,
    borderRadius: raggio.card,
  },
});
