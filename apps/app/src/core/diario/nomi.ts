// Nomi stabili di schermate e azioni del diario (docs/diario-nomi.md): da usare in futuro per gli eventi di
// misurazione. Non cambiano al cambiare dei testi a schermo.

export const SCHERMATE_DIARIO = {
  oggi: 'oggi',
  pasti: 'diario · pasti',
  valori: 'diario · valori',
  sport: 'diario · sport',
  commento: 'diario · commento',
  racconta: 'racconta · segnaposto',
} as const;

export const AZIONI_DIARIO = {
  scrivi: 'diario · scrivi',
  racconta: 'diario · racconta',
  avanti: 'diario · avanti',
  chiudi: 'diario · chiudi',
  salvaBozza: 'diario · salva bozza',
  condividi: 'diario · condividi',
  riprova: 'diario · riprova salvataggio',
  apriStorico: 'settimana · apri storico',
} as const;

export type SchermataDiario = (typeof SCHERMATE_DIARIO)[keyof typeof SCHERMATE_DIARIO];
export type AzioneDiario = (typeof AZIONI_DIARIO)[keyof typeof AZIONI_DIARIO];
