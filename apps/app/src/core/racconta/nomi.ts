// Nomi stabili delle schermate e delle azioni del diario vocale "Racconta" (docs/diario-nomi.md, step 10): da usare
// in futuro per gli eventi di misurazione. Non cambiano al cambiare dei testi a schermo.

export const SCHERMATE_RACCONTA = {
  permesso: 'racconta · permesso microfono',
  microfonoDisattivato: 'racconta · microfono disattivato',
  pronto: 'racconta · pronto',
  registra: 'racconta · registra',
  trascrizione: 'racconta · trascrizione',
  racconto: 'racconta · il tuo racconto',
  senzaConnessione: 'racconta · senza connessione',
  nonHoCapito: 'racconta · non ho capito',
  errore: 'racconta · errore',
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
  trascrivi: 'racconta · trascrivi',
  modificaTesto: 'racconta · modifica il racconto',
  ricomincia: 'racconta · ricomincia',
  riprova: 'racconta · riprova trascrizione',
  creaDiario: 'racconta · crea il mio diario',
} as const;

export type SchermataRacconta = (typeof SCHERMATE_RACCONTA)[keyof typeof SCHERMATE_RACCONTA];
export type AzioneRacconta = (typeof AZIONI_RACCONTA)[keyof typeof AZIONI_RACCONTA];
