// Nomi stabili di schermate e azioni del menu (docs/diario-nomi.md): per gli eventi di misurazione futuri.

export const SCHERMATE_MENU = {
  menu: 'menu',
  nutrizionista: 'menu · la tua nutrizionista',
  appuntamenti: 'menu · appuntamenti',
} as const;

export const AZIONI_MENU = {
  apri: 'menu · apri',
  chiudi: 'menu · chiudi',
  voce: 'menu · voce',
  scriviNutrizionista: 'nutrizionista · scrivi',
  scriviSostituta: 'nutrizionista · scrivi alla sostituta',
  entra: 'appuntamenti · entra',
  gestisci: 'appuntamenti · gestisci',
} as const;
