// Nomi stabili di schermate e azioni del menu (docs/diario-nomi.md): per gli eventi di misurazione futuri.

export const SCHERMATE_MENU = {
  menu: 'menu',
  nutrizionista: 'menu · la tua nutrizionista',
  appuntamenti: 'menu · appuntamenti',
  pesoEMisure: 'menu · peso e misure',
  contenuti: 'menu · contenuti',
  contenuto: 'menu · contenuto',
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
} as const;
