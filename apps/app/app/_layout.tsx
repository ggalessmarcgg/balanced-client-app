import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Appearance } from 'react-native';
import { KeyboardProvider } from 'react-native-keyboard-controller';

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

  // KeyboardProvider: regola unica della tastiera (CLAUDE.md), usata da Pagina e dal Pannello dal basso.
  return (
    <KeyboardProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colori.sfondo.pagina }, animation: 'none' }}>
        {/* Avvio: legge sessione e stato e smista. */}
        <Stack.Screen name="index" />
        {/* Accesso (sfondo card): login con le sue varianti e recupero password. */}
        <Stack.Screen name="accesso/index" options={{ contentStyle: { backgroundColor: colori.sfondo.card } }} />
        <Stack.Screen name="accesso/recupero" options={{ contentStyle: { backgroundColor: colori.sfondo.card }, animation: 'default' }} />
        {/* Stati del cliente e app dell'abbonato. */}
        <Stack.Screen name="stato/prenotazione" />
        <Stack.Screen name="stato/prenotato" />
        <Stack.Screen name="stato/percorso-non-attivo" />
        <Stack.Screen name="stato/consulenza-non-svolta" />
        <Stack.Screen name="stato/percorso-concluso" />
        <Stack.Screen name="stato/account-non-collegato" />
        <Stack.Screen name="abbonato" />
        <Stack.Screen name="racconta" options={{ animation: 'default' }} />
        <Stack.Screen name="account" options={{ animation: 'default' }} />
        {/* Rotte di sviluppo: escluse dalle versioni per i clienti. */}
        <Stack.Protected guard={__DEV__}>
          <Stack.Screen name="sviluppo/componenti" />
          <Stack.Screen name="sviluppo/confronto-testi" />
          <Stack.Screen name="sviluppo/confronto-icone" />
          <Stack.Screen name="sviluppo/confronto-componenti" />
          <Stack.Screen name="sviluppo/stati" />
          <Stack.Screen name="sviluppo/prova-accesso" />
          <Stack.Screen name="sviluppo/titoli" />
        </Stack.Protected>
      </Stack>
      <StatusBar style="dark" />
    </KeyboardProvider>
  );
}
