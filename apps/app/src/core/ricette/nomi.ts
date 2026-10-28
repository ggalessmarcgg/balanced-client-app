// Nomi stabili di schermate e azioni delle ricette (docs/diario-nomi.md): per gli eventi di misurazione futuri.

export const SCHERMATE_RICETTE = {
  pannello: 'piano · ricetta · pannello',
  ricerca: 'piano · ricetta · ricerca delle idee',
  idee: 'piano · ricetta · idee',
  attesa: 'piano · ricetta · attesa della ricetta',
  ricetta: 'piano · ricetta',
  nessunaIdea: 'piano · ricetta · nessuna idea',
  errore: 'piano · ricetta · errore',
  tutorialRicette: 'piano · tutorial · ricette',
  salvate: 'menu · le tue ricette',
  salvata: 'menu · ricetta salvata',
} as const;

export const AZIONI_RICETTE = {
  apri: 'piano · ricetta · apri',
  scegliPasto: 'piano · ricetta · scegli il pasto',
  trovaIdee: 'piano · ricetta · trova idee',
  scegliIdea: 'piano · ricetta · scegli idea',
  vediRicetta: 'piano · ricetta · vedi la ricetta',
  riprova: 'piano · ricetta · riprova',
  salva: 'piano · ricetta · salva',
  elimina: 'menu · ricetta salvata · elimina',
  tutorialAvanti: 'piano · tutorial · avanti',
  tutorialHoCapito: 'piano · tutorial · ho capito',
} as const;
