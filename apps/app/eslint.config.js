// Configurazione lint ufficiale di Expo: https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'ios/*', 'android/*', '.expo/*'],
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
]);
