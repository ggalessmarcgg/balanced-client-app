// Font del design system (Figma: DM Sans Regular/SemiBold/Light Italic, DM Serif Display Italic).
// I file .ttf sono nei pacchetti @expo-google-fonts (licenza OFL), quindi nessuna rete a runtime.
// I nomi delle chiavi sono i fontFamily usati in tokens.generated.ts (mappa FONT del generatore).
import { DMSans_300Light_Italic, DMSans_400Regular, DMSans_600SemiBold } from '@expo-google-fonts/dm-sans';
import { DMSerifDisplay_400Regular_Italic } from '@expo-google-fonts/dm-serif-display';
import { useFonts } from 'expo-font';

export const fontDelTema = {
  DMSans_400Regular,
  DMSans_600SemiBold,
  DMSans_300Light_Italic,
  DMSerifDisplay_400Regular_Italic,
} as const;

/** Carica i font del tema. Restituisce [pronti, errore]; la schermata di avvio resta finché non sono pronti. */
export function useFontTema(): [boolean, Error | null] {
  return useFonts(fontDelTema);
}
