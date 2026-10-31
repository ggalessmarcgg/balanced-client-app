// Configurazione dinamica: estende app.json con ciò che dipende dall'ambiente della build.
// google-services.json (Firebase, mai nel repo): su EAS arriva dalla variabile di tipo file GOOGLE_SERVICES_JSON
// (EAS la scrive su disco e mette il percorso nella variabile); in locale si usa il file accanto ad app.json.
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
  },
});
