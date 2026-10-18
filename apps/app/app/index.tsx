import { Link, Redirect } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { APP_NAME, STEP_LABEL } from '@/core/appInfo';
import { Centered } from '@/ui/Centered';
import { colori, spazio, testi, tocco } from '@/ui/theme';

// Solo in sviluppo: EXPO_PUBLIC_ROTTA_SVILUPPO=/sviluppo/confronto-testi npx expo start
// apre direttamente una rotta di sviluppo (serve per gli screenshot automatici dal simulatore).
const ROTTA_SVILUPPO = __DEV__ ? process.env.EXPO_PUBLIC_ROTTA_SVILUPPO : undefined;

export default function HomeScreen() {
  if (ROTTA_SVILUPPO) return <Redirect href={ROTTA_SVILUPPO as never} />;
  return (
    <Centered>
      <Text style={stili.nome}>{APP_NAME}</Text>
      <Text style={stili.passo}>{STEP_LABEL}</Text>
      {__DEV__ && (
        <Link href="/sviluppo/componenti" style={stili.link} accessibilityRole="link">
          Componenti (sviluppo)
        </Link>
      )}
    </Centered>
  );
}

const stili = StyleSheet.create({
  nome: { ...testi.accentoSerif, color: colori.testo.primario },
  passo: { ...testi.bodyDetails, color: colori.testo.secondario, marginTop: spazio[8] },
  link: { ...testi.link, color: colori.azione.primaria, marginTop: spazio[32], minHeight: tocco.minimoIos, paddingVertical: spazio[12] },
});
