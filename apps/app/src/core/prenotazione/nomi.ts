// Nomi stabili di schermate e azioni degli stati prima dell'abbonamento (docs/diario-nomi.md, step 12): per gli
// eventi di misurazione futuri. Non cambiano al cambiare dei testi a schermo.

export const SCHERMATE_PRENOTAZIONE = {
  daConfermare: 'consulenza · da confermare',
  orarioPassato: 'consulenza · orario passato',
  pannelloScelta: 'consulenza · scelta orario',
  pannelloNessunOrario: 'consulenza · nessun orario',
  confermata: 'consulenza · confermata',
  primaDellaConsulenza: 'consulenza · prima della consulenza',
} as const;

export const AZIONI_PRENOTAZIONE = {
  conferma: 'consulenza · conferma',
  modifica: 'consulenza · modifica orario',
  scegliNuovo: 'consulenza · scegli un nuovo orario',
  scheda: 'consulenza · scheda giorni',
  scegliOrario: 'consulenza · scegli orario',
  confermaOrario: 'consulenza · conferma orario',
  annullaScelta: 'consulenza · annulla scelta',
  riprovaOrari: 'consulenza · riprova orari',
  tornaAllaHome: 'consulenza · torna alla home',
  entra: 'consulenza · entra',
  gestisci: 'consulenza · gestisci appuntamento',
} as const;

export type SchermataPrenotazione = (typeof SCHERMATE_PRENOTAZIONE)[keyof typeof SCHERMATE_PRENOTAZIONE];
export type AzionePrenotazione = (typeof AZIONI_PRENOTAZIONE)[keyof typeof AZIONI_PRENOTAZIONE];
