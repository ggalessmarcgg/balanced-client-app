// Nomi stabili di schermate e azioni delle revisioni (docs/diario-nomi.md): per gli eventi di misurazione futuri.

export const SCHERMATE_REVISIONI = {
  revisioni: 'revisioni',
  lettura: 'revisione · lettura',
} as const;

export const AZIONI_REVISIONI = {
  apri: 'revisioni · apri',
  leggi: 'revisioni · leggi la revisione',
  aperta: 'revisione · aperta',
  letta: 'revisione · letta',
  indietro: 'revisione · indietro',
} as const;

export type SchermataRevisioni = (typeof SCHERMATE_REVISIONI)[keyof typeof SCHERMATE_REVISIONI];
export type AzioneRevisioni = (typeof AZIONI_REVISIONI)[keyof typeof AZIONI_REVISIONI];
