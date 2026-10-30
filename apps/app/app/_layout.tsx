import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Appearance } from 'react-native';
import { KeyboardProvider } from 'react-native-keyboard-controller';

import { avviaAscoltoNotifiche } from '@/servizi/aperturaNotifiche';
import { colori, useFontTema } from '@/ui/theme';

// La schermata di avvio resta visibile finché i font del tema non sono pronti.
SplashScreen.preventAutoHideAsync();
// Tema chiaro forzato (anche con il telefono in modalità scura); in app.json userInterfaceStyle = "light".
Appearance.setColorScheme('light');

/**
 * Pagine interne aperte sopra le schede (menu e sue pagine, notifiche, revisione, Racconta, storico, Indicazioni):
 * entrano da destra e si chiudono verso destra con la freccia o con il gesto dal bordo che segue il dito. Un solo
 * punto per tutte: nessuna variante per pagina.
 */
const OPZIONI_PAGINA_INTERNA = { animation: 'default' } as const;

export default function RootLayout() {
  const [fontPronti, erroreFont] = useFontTema();

  useEffect(() => {
    if (fontPronti || erroreFont) SplashScreen.hideAsync();
  }, [fontPronti, erroreFont]);
  // Notifiche push (step 6): ascolto delle notifiche ricevute e toccate, compresa quella che ha avviato l'app da chiusa.
  useEffect(() => {
    avviaAscoltoNotifiche();
  }, []);

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
        {/* Carosello del primo accesso (step 6): una volta per telefono, prima della schermata dello stato. */}
        <Stack.Screen name="primo-accesso" options={{ contentStyle: { backgroundColor: colori.sfondo.card }, gestureEnabled: false }} />
        {/* Stati del cliente e app dell'abbonato. */}
        <Stack.Screen name="stato/prenotazione" />
        <Stack.Screen name="stato/prenotato" />
        <Stack.Screen name="stato/percorso-non-attivo" />
        <Stack.Screen name="stato/consulenza-non-svolta" />
        <Stack.Screen name="stato/percorso-concluso" />
        <Stack.Screen name="stato/account-non-collegato" />
        {/* Schede dell'abbonato (Oggi, Piano, Revisioni, Account): una sola barra di navigazione persistente nel layout del gruppo. */}
        <Stack.Screen name="(abbonato)" />
        <Stack.Screen name="revisione/[id]" options={OPZIONI_PAGINA_INTERNA} />
        {/* Indicazioni del piano e ricetta appena preparata: stesse opzioni delle pagine del menu. */}
        <Stack.Screen name="indicazioni" options={OPZIONI_PAGINA_INTERNA} />
        <Stack.Screen name="ricetta" options={OPZIONI_PAGINA_INTERNA} />
        {/* Menu a tutta pagina (dall'icona Menu della barra superiore) e le sue schermate. */}
        <Stack.Screen name="menu" options={OPZIONI_PAGINA_INTERNA} />
        <Stack.Screen name="notifiche" options={OPZIONI_PAGINA_INTERNA} />
        <Stack.Screen name="nutrizionista" options={OPZIONI_PAGINA_INTERNA} />
        <Stack.Screen name="appuntamenti" options={OPZIONI_PAGINA_INTERNA} />
        <Stack.Screen name="peso-misure" options={OPZIONI_PAGINA_INTERNA} />
        <Stack.Screen name="contenuti/index" options={OPZIONI_PAGINA_INTERNA} />
        <Stack.Screen name="contenuti/[id]" options={OPZIONI_PAGINA_INTERNA} />
        <Stack.Screen name="ricette/index" options={OPZIONI_PAGINA_INTERNA} />
        <Stack.Screen name="ricette/[id]" options={OPZIONI_PAGINA_INTERNA} />
        <Stack.Screen name="racconta" options={OPZIONI_PAGINA_INTERNA} />
        <Stack.Screen name="racconta-riepilogo" options={OPZIONI_PAGINA_INTERNA} />
        <Stack.Screen name="storico" options={OPZIONI_PAGINA_INTERNA} />
        {/* Rotte di sviluppo: escluse dalle versioni per i clienti. */}
        <Stack.Protected guard={__DEV__}>
          <Stack.Screen name="sviluppo/componenti" />
          <Stack.Screen name="sviluppo/confronto-testi" />
          <Stack.Screen name="sviluppo/confronto-icone" />
          <Stack.Screen name="sviluppo/confronto-componenti" />
          <Stack.Screen name="sviluppo/stati" />
          <Stack.Screen name="sviluppo/prova-accesso" />
          <Stack.Screen name="sviluppo/titoli" />
          <Stack.Screen name="sviluppo/notifiche-prova" />
        </Stack.Protected>
      </Stack>
      <StatusBar style="dark" />
    </KeyboardProvider>
  );
}
