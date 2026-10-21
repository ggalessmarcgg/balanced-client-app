// Nomi stabili di schermate e azioni del menu (docs/diario-nomi.md): per gli eventi di misurazione futuri.

export const SCHERMATE_MENU = {
  menu: 'menu',
  nutrizionista: 'menu · la tua nutrizionista',
  appuntamenti: 'menu · appuntamenti',
  pesoEMisure: 'menu · peso e misure',
  contenuti: 'menu · contenuti',
  contenuto: 'menu · contenuto',
  account: 'account',
  eliminaAvviso: 'account · elimina · avviso',
  eliminaConferma: 'account · elimina · conferma',
  notifiche: 'notifiche',
} as const;

export const AZIONI_MENU = {
  apri: 'menu · apri',
  chiudi: 'menu · chiudi',
  voce: 'menu · voce',
  scriviNutrizionista: 'nutrizionista · scrivi',
  scriviSostituta: 'nutrizionista · scrivi alla sostituta',
  entra: 'appuntamenti · entra',
  gestisci: 'appuntamenti · gestisci',
  vistaGrafico: 'peso e misure · vista grafico',
  vistaTabella: 'peso e misure · vista tabella',
  apriContenuto: 'contenuti · apri',
  promemoriaDiario: 'account · promemoria del diario',
  promemoriaWeekend: 'account · promemoria nel weekend',
  apriPrivacy: 'account · informativa privacy',
  apriTermini: 'account · termini del servizio',
  eliminaAccount: 'account · elimina account',
  apriNotifiche: 'notifiche · apri',
  apriNotifica: 'notifiche · tocca',
} as const;
