// Metro con il plugin Sentry (monitoraggio degli errori, step 4): assegna i Debug ID a bundle e mappe del codice, così gli
// errori delle build di rilascio si leggono con i nomi dei file e le righe originali; le mappe le carica la build EAS
// (plugin `@sentry/react-native/expo` in app.json, variabile SENTRY_AUTH_TOKEN negli ambienti EAS, mai nel repo).
// `annotateReactComponents`: i breadcrumb dei tocchi portano il nome del componente (mai il contenuto).
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

module.exports = getSentryExpoConfig(__dirname, { annotateReactComponents: true });
