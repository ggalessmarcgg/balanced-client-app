// Nomi stabili delle schermate e delle azioni del diario vocale "Racconta" (docs/diario-nomi.md, step 10): da usare
// in futuro per gli eventi di misurazione. Non cambiano al cambiare dei testi a schermo.

export const SCHERMATE_RACCONTA = {
  permesso: 'racconta · permesso microfono',
  microfonoDisattivato: 'racconta · microfono disattivato',
  pronto: 'racconta · pronto',
  registra: 'racconta · registra',
  terminata: 'racconta · registrazione terminata',
  trascrizione: 'racconta · trascrizione',
  racconto: 'racconta · il tuo racconto',
  senzaConnessione: 'racconta · senza connessione',
  nonHoCapito: 'racconta · non ho capito',
  errore: 'racconta · errore',
  tutorialPronto: 'racconta · tutorial · racconta',
  tutorialTerminata: 'racconta · tutorial · trascrizione',
  tutorialRacconto: 'racconta · tutorial · crea il diario',
  creaDiario: 'racconta · crea diario',
  riepilogo: 'racconta · riepilogo',
  erroreCompilazione: 'racconta · elaborazione non riuscita',
  tutorialRiepilogo: 'racconta · tutorial · invio del diario',
} as const;

export const AZIONI_RACCONTA = {
  consenti: 'racconta · consenti microfono',
  preferiscoScrivere: 'racconta · preferisco scrivere',
  apriImpostazioni: 'racconta · apri impostazioni',
  avvia: 'racconta · avvia registrazione',
  ferma: 'racconta · ferma registrazione',
  arrestoAutomatico: 'racconta · arresto a 3 minuti',
  pausa: 'racconta · pausa',
  riprendi: 'racconta · riprendi',
  invia: 'racconta · invia la registrazione',
  trascrivi: 'racconta · trascrivi',
  uscitaConfermata: 'racconta · interrompi e scarta',
  tutorialHoCapito: 'racconta · tutorial · ho capito',
  modificaTesto: 'racconta · modifica il racconto',
  ricomincia: 'racconta · ricomincia',
  riprova: 'racconta · riprova trascrizione',
  creaDiario: 'racconta · crea il mio diario',
  riprovaCompilazione: 'racconta · riprova compilazione',
  modificaRiepilogo: 'racconta · modifica riepilogo',
  inviaDiario: 'racconta · invia',
  chiudiRiepilogo: 'racconta · chiudi riepilogo',
} as const;

export type SchermataRacconta = (typeof SCHERMATE_RACCONTA)[keyof typeof SCHERMATE_RACCONTA];
export type AzioneRacconta = (typeof AZIONI_RACCONTA)[keyof typeof AZIONI_RACCONTA];
