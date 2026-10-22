// Macchina a stati del Pannello scelta orario (step 12, decisione del 22/10/2026): la scelta dell'orario è sempre in
// due passaggi, in tutti i casi (modifica, orario passato, orario non più disponibile). "Conferma orario" chiude il
// pannello e aggiorna la card della consulenza con l'orario scelto, che resta solo in memoria (mai sul lead); la
// prenotazione avviene solo con "Conferma la consulenza", che passa l'orario in memoria alla funzione del database.
// Niente React: l'hook usePrenotazione applica queste transizioni e fa le chiamate.
import type { EsitoConferma, MotivoPannello } from './conferma.ts';
import { alternaScelta, sceltaAncoraValida, type OrarioDisponibile } from './orari.ts';

export type StatoPannello = {
  pannello: { aperto: boolean; motivo: MotivoPannello };
  /** Orario selezionato nella griglia, mentre il pannello è aperto. */
  scelta: OrarioDisponibile | null;
  /** Orario confermato nel pannello e mostrato nella card, in attesa di "Conferma la consulenza". */
  sceltaLocale: OrarioDisponibile | null;
  /** Il server ha risposto che l'orario mostrato è passato o manca: la card resta barrata finché non se ne sceglie uno nuovo. */
  orarioNonValido: boolean;
};

export const STATO_PANNELLO_INIZIALE: StatoPannello = {
  pannello: { aperto: false, motivo: 'modifica' },
  scelta: null,
  sceltaLocale: null,
  orarioNonValido: false,
};

/** "Modifica" (C) e "Scegli un nuovo orario" (D): pannello aperto con il motivo, nessuna scelta in corso. */
export function apriPannello(stato: StatoPannello, motivo: MotivoPannello): StatoPannello {
  return { ...stato, pannello: { aperto: true, motivo }, scelta: null };
}

/** "Annulla", "Chiudi", velo e tasto indietro: chiude e azzera la scelta in corso; l'orario già in memoria resta. */
export function chiudiPannello(stato: StatoPannello): StatoPannello {
  return { ...stato, pannello: { ...stato.pannello, aperto: false }, scelta: null };
}

/** Tocco su una pillola: selezione singola, il secondo tocco deseleziona. */
export function scegliOrario(stato: StatoPannello, orario: OrarioDisponibile): StatoPannello {
  return { ...stato, scelta: alternaScelta(stato.scelta, orario) };
}

/** Dopo una lettura degli orari: la scelta resta solo se è ancora nell'elenco. */
export function orariLetti(stato: StatoPannello, orari: OrarioDisponibile[]): StatoPannello {
  return { ...stato, scelta: sceltaAncoraValida(stato.scelta, orari) };
}

/**
 * "Conferma orario": in ogni motivo l'orario passa nella card e il pannello si chiude; nessuna chiamata.
 * Senza una scelta non succede nulla (il pulsante è disabilitato).
 */
export function confermaOrario(stato: StatoPannello): StatoPannello {
  if (!stato.scelta) return stato;
  return { pannello: { ...stato.pannello, aperto: false }, scelta: null, sceltaLocale: stato.scelta, orarioNonValido: false };
}

/**
 * Esito di "Conferma la consulenza" che riguarda il pannello: l'orario in memoria si azzera e il pannello si riapre
 * con l'avviso giusto (slot_taken/day_full → "non più disponibile"; slot_in_past/no_desired_slot → "orario passato",
 * con la card barrata). Gli altri esiti (confermata, già confermata, stato non valido, errore) non toccano il pannello.
 */
export function dopoEsitoConferma(stato: StatoPannello, esito: EsitoConferma): StatoPannello {
  switch (esito.tipo) {
    case 'nonDisponibile':
      return { ...stato, pannello: { aperto: true, motivo: 'nonDisponibile' }, scelta: null, sceltaLocale: null };
    case 'orarioPassato':
    case 'senzaOrario':
      return { pannello: { aperto: true, motivo: 'orarioPassato' }, scelta: null, sceltaLocale: null, orarioNonValido: true };
    default:
      return stato;
  }
}

/** Dopo questi esiti gli orari vanno riletti (il pannello si è riaperto). */
export function esitoRiapreIlPannello(esito: EsitoConferma): boolean {
  return esito.tipo === 'nonDisponibile' || esito.tipo === 'orarioPassato' || esito.tipo === 'senzaOrario';
}

export type SlotMostrato = { data: string; ora: string } | null;

/**
 * Variante della schermata: "da confermare" (card con l'orario, "Conferma la consulenza" + "Modifica") appena c'è un
 * orario in memoria, altrimenti "orario passato" (card barrata, "Scegli un nuovo orario") in D o quando il server ha
 * rifiutato l'orario mostrato.
 */
export function varianteSchermata(codice: 'C' | 'D', stato: StatoPannello): 'daConfermare' | 'orarioPassato' {
  if (stato.sceltaLocale) return 'daConfermare';
  return codice === 'D' || stato.orarioNonValido ? 'orarioPassato' : 'daConfermare';
}

/** Orario nella card: quello in memoria, altrimenti quello del lead (in D può mancare). */
export function slotMostrato(slotLead: SlotMostrato, stato: StatoPannello): SlotMostrato {
  if (stato.sceltaLocale) return { data: stato.sceltaLocale.date, ora: stato.sceltaLocale.time };
  return slotLead;
}

/** Orario da passare a `confirm_initial_appointment`: quello in memoria, oppure nessuno (la funzione usa il lead). */
export function orarioDaConfermare(stato: StatoPannello): OrarioDisponibile | null {
  return stato.sceltaLocale;
}
