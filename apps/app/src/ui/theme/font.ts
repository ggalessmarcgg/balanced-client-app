// Font del design system (Figma: DM Sans Regular/SemiBold/Light Italic, DM Serif Display Italic).
// Le istanze predefinite (dimensione ottica 14) vengono dai pacchetti @expo-google-fonts (OFL, nessuna
// rete a runtime); per gli stili grandi si usano le istanze alla dimensione ottica di Figma
// (assets/font, vedi README). Le chiavi sono i fontFamily usati in tokens.generated.ts (mappa del generatore).
import { DMSans_300Light_Italic, DMSans_400Regular, DMSans_600SemiBold } from '@expo-google-fonts/dm-sans';
import { DMSerifDisplay_400Regular_Italic } from '@expo-google-fonts/dm-serif-display';
import { useFonts } from 'expo-font';

export const fontDelTema = {
  DMSans_400Regular,
  DMSans_600SemiBold,
  DMSans_300Light_Italic,
  DMSerifDisplay_400Regular_Italic,
  // Dimensioni ottiche di Figma per gli stili grandi
  DMSans_40pt_600SemiBold: require('../../../assets/font/DMSans_40pt_600SemiBold.ttf'),
  DMSans_36pt_600SemiBold: require('../../../assets/font/DMSans_36pt_600SemiBold.ttf'),
  DMSans_32pt_400Regular: require('../../../assets/font/DMSans_32pt_400Regular.ttf'),
} as const;

/** Carica i font del tema. Restituisce [pronti, errore]; la schermata di avvio resta finché non sono pronti. */
export function useFontTema(): [boolean, Error | null] {
  return useFonts(fontDelTema);
}
