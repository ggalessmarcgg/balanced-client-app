// Configurazione lint ufficiale di Expo: https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

// Colori scritti a mano: esadecimali (#fff, #FAF8F5, #RRGGBBAA), rgb()/rgba()/hsl()/hsla()
// e i nomi di colore CSS più comuni. Ammessi solo dentro src/ui/theme (token generati da Figma).
const COLORE_ESADECIMALE = '/#[0-9a-fA-F]{3,8}\\b/';
const COLORE_FUNZIONE = '/\\b(rgba?|hsla?)\\(/';
const COLORE_NOME = '/^(white|black|red|green|blue|gray|grey|transparent|yellow|orange|pink|purple)$/i';
const MESSAGGIO_COLORI =
  'Colore scritto a mano: usare i token di @/ui/theme (colori.*). I valori vengono da Figma e si rigenerano con `npm run tokens`.';

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'ios/*', 'android/*', '.expo/*', 'src/ui/theme/tokens.generated.ts'],
  },
  {
    // src/core è TypeScript puro: niente React, React Native, Expo o ui/.
    files: ['src/core/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react/*', 'react-native', 'react-native/*', 'react-native-*', 'expo', 'expo-*', '@expo/*', '**/ui', '**/ui/*', '@/ui', '@/ui/*'],
              message: 'src/core deve restare TypeScript puro: nessun import da React, React Native, Expo o src/ui.',
            },
          ],
        },
      ],
    },
  },
  {
    // Nessun colore scritto a mano fuori da src/ui/theme: solo token del design system.
    files: ['app/**/*.{ts,tsx}', 'src/**/*.{ts,tsx}'],
    ignores: ['src/ui/theme/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        { selector: `Literal[value=${COLORE_ESADECIMALE}]`, message: MESSAGGIO_COLORI },
        { selector: `Literal[value=${COLORE_FUNZIONE}]`, message: MESSAGGIO_COLORI },
        { selector: `TemplateElement[value.raw=${COLORE_ESADECIMALE}]`, message: MESSAGGIO_COLORI },
        { selector: `TemplateElement[value.raw=${COLORE_FUNZIONE}]`, message: MESSAGGIO_COLORI },
        { selector: `Property[key.name=/^(color|backgroundColor|borderColor|borderTopColor|borderBottomColor|borderLeftColor|borderRightColor|tintColor|shadowColor|textDecorationColor|overlayColor|stroke|fill)$/] > Literal[value=${COLORE_NOME}]`, message: MESSAGGIO_COLORI },
      ],
    },
  },
]);
