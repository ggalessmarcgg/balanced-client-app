import { StyleSheet, View } from 'react-native';

import { TESTI_ACCOUNT } from '@/core/account/account';
import { RigaElenco } from '@/ui/RigaElenco';
import { colori, raggio, spazio } from '@/ui/theme';

export type CardAccountProps = {
  nomeCompleto: string;
  iniziali: string;
  onPress?: () => void;
};

/**
 * Card "Il tuo account" (Figma 840:8607, stati 1, 2, 3, 6, 7 e 12 prima dell'abbonamento, 31/10/2026): stessa card
 * della nutrizionista (crema, padding 24 / 20 / 16, Riga elenco con avatar 44) con le iniziali del cliente al posto
 * della foto, etichetta "Il tuo account" sopra e nome sotto, freccia. Apre l'Account a schermo intero, senza barra.
 */
export function CardAccount({ nomeCompleto, iniziali, onPress }: CardAccountProps) {
  return (
    <View style={stili.card}>
      <RigaElenco tipo="conAvatar" etichetta={TESTI_ACCOUNT.tuoAccount} nome={nomeCompleto} iniziali={iniziali} onPress={onPress} />
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
