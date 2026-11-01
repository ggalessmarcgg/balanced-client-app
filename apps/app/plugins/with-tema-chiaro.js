// Tema sempre chiaro su Android (decisione di Alessandro del 1/11/2026, dopo il primo test interno su telefono).
// `userInterfaceStyle: "light"` in app.json fa impostare da expo-system-ui MODE_NIGHT_NO, ma solo nell'onCreate
// dell'attività: a quel punto la configurazione delle risorse è già "notte" se il telefono è in tema scuro, e il tema
// generato (`AppTheme`) eredita da Theme.AppCompat.DayNight. Risultato verificato sull'emulatore (Pixel 9a, Android 17):
// avvisi di sistema di React Native scuri e tasti bianchi nella barra di navigazione a tre tasti (React Native legge
// `uiMode` dell'attività in `enableEdgeToEdge`). Qui:
// 1. MainApplication.onCreate chiama AppCompatDelegate.setDefaultNightMode(MODE_NIGHT_NO) prima di ogni attività, così
//    ogni attività nasce con la configurazione "giorno" (finestra, dialoghi, barre di sistema, uiMode letto da chiunque);
// 2. AppTheme eredita da Theme.AppCompat.Light.NoActionBar e dichiara forceDarkAllowed=false (niente scurimento
//    automatico delle app chiare da parte del sistema o del produttore, Android 10+).
// Si applica con `npx expo prebuild -p android`; controllo su android/app/src/main/res/values/styles.xml e
// android/app/src/main/java/it/joinbalanced/app/MainApplication.kt.
const { withAndroidStyles, withMainApplication, AndroidConfig } = require('expo/config-plugins');
const { mergeContents } = require('@expo/config-plugins/build/utils/generateCode');

const TEMA = 'AppTheme';
const GENITORE_CHIARO = 'Theme.AppCompat.Light.NoActionBar';

/** @type {import('expo/config-plugins').ConfigPlugin} */
module.exports = function withTemaChiaro(config) {
  config = withAndroidStyles(config, (config) => {
    const stile = config.modResults.resources.style?.find((s) => s.$.name === TEMA);
    if (stile) stile.$.parent = GENITORE_CHIARO;
    config.modResults = AndroidConfig.Styles.assignStylesValue(config.modResults, {
      add: true,
      name: 'android:forceDarkAllowed',
      value: 'false',
      parent: AndroidConfig.Styles.getAppThemeGroup(),
    });
    return config;
  });
  config = withMainApplication(config, (config) => {
    if (config.modResults.language !== 'kt') throw new Error('with-tema-chiaro: MainApplication attesa in Kotlin');
    let src = config.modResults.contents;
    src = mergeContents({
      src,
      newSrc: 'import androidx.appcompat.app.AppCompatDelegate',
      tag: 'tema-chiaro-import',
      anchor: /^import android\.app\.Application$/m,
      offset: 1,
      comment: '//',
    }).contents;
    src = mergeContents({
      src,
      newSrc: '    // Tema sempre chiaro, prima di ogni attività (plugins/with-tema-chiaro.js).\n    AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_NO)',
      tag: 'tema-chiaro-night-mode',
      anchor: /^\s*override fun onCreate\(\) \{\s*$/m,
      offset: 1,
      comment: '//',
    }).contents;
    config.modResults.contents = src;
    return config;
  });
  return config;
};
