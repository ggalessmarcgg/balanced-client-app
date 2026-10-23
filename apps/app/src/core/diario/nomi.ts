// Nomi stabili di schermate e azioni del diario (docs/diario-nomi.md): da usare in futuro per gli eventi di
// misurazione. Non cambiano al cambiare dei testi a schermo.

export const SCHERMATE_DIARIO = {
  oggi: 'oggi',
  pasti: 'diario · pasti',
  valori: 'diario · valori',
  sport: 'diario · sport',
  commento: 'diario · commento',
  giornataPannello: 'giornata · pannello',
  giornataModifica: 'giornata · modifica',
  storico: 'storico',
  andamento: 'andamento',
  andamentoEnergia: 'andamento · energia',
  andamentoIdratazione: 'andamento · idratazione',
  andamentoSport: 'andamento · sport',
  andamentoPochiDati: 'andamento · pochi dati',
} as const;

export const AZIONI_DIARIO = {
  scrivi: 'diario · scrivi',
  racconta: 'diario · racconta',
  avanti: 'diario · avanti',
  indietro: 'diario · indietro',
  vaiA: 'diario · vai al blocco',
  chiudi: 'diario · chiudi',
  salvaBozza: 'diario · salva bozza',
  condividi: 'diario · condividi',
  riprova: 'diario · riprova salvataggio',
  apriStorico: 'settimana · apri storico',
  settimanaGiorno: 'settimana · giorno',
  giornataChiudi: 'giornata · chiudi',
  giornataSchermoPieno: 'giornata · schermo pieno',
  giornataModifica: 'giornata · modifica',
  giornataSalva: 'giornata · salva modifica',
  giornataFineModifica: 'giornata · fine modifica',
  commentoLetto: 'commento · letto',
} as const;

export type SchermataDiario = (typeof SCHERMATE_DIARIO)[keyof typeof SCHERMATE_DIARIO];
export type AzioneDiario = (typeof AZIONI_DIARIO)[keyof typeof AZIONI_DIARIO];
