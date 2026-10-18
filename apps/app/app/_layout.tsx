import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Appearance } from 'react-native';

import { colori, useFontTema } from '@/ui/theme';

// La schermata di avvio resta visibile finché i font del tema non sono pronti.
SplashScreen.preventAutoHideAsync();
// Tema chiaro forzato (anche con il telefono in modalità scura); in app.json userInterfaceStyle = "light".
Appearance.setColorScheme('light');

export default function RootLayout() {
  const [fontPronti, erroreFont] = useFontTema();

  useEffect(() => {
    if (fontPronti || erroreFont) SplashScreen.hideAsync();
  }, [fontPronti, erroreFont]);

  if (!fontPronti && !erroreFont) return null;

  return (
    <>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colori.sfondo.pagina } }}>
        <Stack.Screen name="index" />
        {/* Rotte di sviluppo: escluse dalle versioni per i clienti. */}
        <Stack.Protected guard={__DEV__}>
          <Stack.Screen name="sviluppo/componenti" />
          <Stack.Screen name="sviluppo/confronto-testi" />
          <Stack.Screen name="sviluppo/confronto-icone" />
        </Stack.Protected>
      </Stack>
      <StatusBar style="dark" />
    </>
  );
}
