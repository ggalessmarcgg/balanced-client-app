// Macchina a stati del diario di oggi: copia locale, bozza sul server e condivisione. Funzioni pure: ricevono lo
// stato e decidono quale scrittura fare (nessuna, inserimento, modifica) e come aggiornare la cache dopo l'esito.
// Regole (step 5): mai una bozza vuota; i salvataggi della bozza non includono status; la condivisione è una sola
// modifica che porta status a submitted e scrive submitted_at, solo se la riga è ancora draft; mai una seconda
// condivisione; mai riscrivere una riga già condivisa (invio automatico o altro dispositivo).
import { campiDaSalvare, haContenuto, stessiCampi, type CampiDiarioDb, type Diario } from './modello.ts';

/** Stato della riga di oggi come lo conosce l'app. */
export type StatoRiga =
  | { tipo: 'assente' }
  | { tipo: 'bozza'; id: string; salvato: CampiDiarioDb }
  | { tipo: 'condiviso'; id: string; condivisoAlle: string | null };

/** Copia locale del diario di oggi (persistita sul telefono finché il server non conferma). */
export type DiarioLocale = {
  clientId: string;
  /** Data italiana YYYY-MM-DD: cambia a mezzanotte, e con lei la chiave della cache. */
  data: string;
  diario: Diario;
  riga: StatoRiga;
  /** Modifiche locali non ancora confermate dal server. */
  inAttesa: boolean;
  /** Ultimo errore di scrittura visibile all'utente (null se l'ultima scrittura è andata a buon fine). */
  errore: 'rete' | 'altro' | null;
};

/** Colonne da scrivere alla creazione della riga: client_id e user_id solo qui, mai dopo. */
export type Inserimento = CampiDiarioDb & { client_id: string; user_id: string; submission_date: string };
export type InserimentoCondiviso = Inserimento & { status: 'submitted'; submitted_at: string };
/** Modifica della bozza: solo i campi del contenuto (niente status, così il trigger delle revisioni non parte). */
export type ModificaBozza = { id: string; campi: CampiDiarioDb };
/** Condivisione di una bozza esistente: unica modifica con status, filtrata su status = draft. */
export type ModificaCondivisione = { id: string; campi: CampiDiarioDb & { status: 'submitted'; submitted_at: string } };

export type OperazioneBozza = { tipo: 'nessuna' } | { tipo: 'inserisci'; riga: Inserimento } | { tipo: 'modifica'; modifica: ModificaBozza };
export type OperazioneCondivisione =
  | { tipo: 'giaCondiviso' }
  | { tipo: 'inserisciCondiviso'; riga: InserimentoCondiviso }
  | { tipo: 'condividi'; modifica: ModificaCondivisione };

export function diarioLocaleIniziale(clientId: string, data: string, diario: Diario, riga: StatoRiga): DiarioLocale {
  return { clientId, data, diario, riga, inAttesa: false, errore: null };
}

/** Nuovo contenuto locale: la riga resta quella nota, la copia è "in attesa" se i campi da salvare cambiano. */
export function aggiornaDiario(locale: DiarioLocale, diario: Diario): DiarioLocale {
  if (locale.riga.tipo === 'condiviso') return locale;
  const campi = campiDaSalvare(diario);
  const inAttesa = locale.riga.tipo === 'bozza' ? !stessiCampi(campi, locale.riga.salvato) : haContenuto(diario);
  return { ...locale, diario, inAttesa: inAttesa || locale.inAttesa };
}

/**
 * Quale scrittura serve per salvare la bozza adesso.
 * - riga condivisa → nessuna (mai riscrivere);
 * - riga assente senza contenuto → nessuna (mai una bozza vuota);
 * - riga assente con contenuto → inserimento (status predefinito draft, non viene scritto);
 * - bozza con gli stessi campi già salvati → nessuna; altrimenti modifica dei soli campi.
 */
export function pianificaSalvataggio(locale: DiarioLocale, userId: string): OperazioneBozza {
  const campi = campiDaSalvare(locale.diario);
  switch (locale.riga.tipo) {
    case 'condiviso':
      return { tipo: 'nessuna' };
    case 'assente':
      if (!haContenuto(locale.diario)) return { tipo: 'nessuna' };
      return { tipo: 'inserisci', riga: { ...campi, client_id: locale.clientId, user_id: userId, submission_date: locale.data } };
    case 'bozza':
      if (stessiCampi(campi, locale.riga.salvato)) return { tipo: 'nessuna' };
      return { tipo: 'modifica', modifica: { id: locale.riga.id, campi } };
  }
}

/**
 * Quale scrittura serve per condividere adesso (`adesso` ISO per submitted_at). Con la riga assente si inserisce
 * già submitted (anche vuota: la condivisione è una scelta esplicita del cliente); con la bozza, una sola modifica che
 * porta anche gli ultimi campi; con la riga condivisa, niente.
 */
export function pianificaCondivisione(locale: DiarioLocale, userId: string, adesso: string): OperazioneCondivisione {
  const campi = campiDaSalvare(locale.diario);
  switch (locale.riga.tipo) {
    case 'condiviso':
      return { tipo: 'giaCondiviso' };
    case 'assente':
      return {
        tipo: 'inserisciCondiviso',
        riga: { ...campi, client_id: locale.clientId, user_id: userId, submission_date: locale.data, status: 'submitted', submitted_at: adesso },
      };
    case 'bozza':
      return { tipo: 'condividi', modifica: { id: locale.riga.id, campi: { ...campi, status: 'submitted', submitted_at: adesso } } };
  }
}

/** Dopo un salvataggio riuscito: la riga è una bozza con i campi appena scritti; nulla in attesa. */
export function dopoSalvataggio(locale: DiarioLocale, id: string, campi: CampiDiarioDb): DiarioLocale {
  // Se nel frattempo il contenuto locale è cambiato ancora, resta in attesa.
  const inAttesa = !stessiCampi(campiDaSalvare(locale.diario), campi);
  return { ...locale, riga: { tipo: 'bozza', id, salvato: campi }, inAttesa, errore: null };
}

/** Dopo una condivisione riuscita. */
export function dopoCondivisione(locale: DiarioLocale, id: string, condivisoAlle: string): DiarioLocale {
  return { ...locale, riga: { tipo: 'condiviso', id, condivisoAlle }, inAttesa: false, errore: null };
}

/** Il server dice che la riga è già condivisa (invio automatico o altro dispositivo): si mostra lo stato condiviso, niente da riscrivere. */
export function rigaGiaCondivisa(locale: DiarioLocale, id: string, condivisoAlle: string | null, campi: Partial<Diario> | null): DiarioLocale {
  return { ...locale, diario: campi ? { ...locale.diario, ...campi } : locale.diario, riga: { tipo: 'condiviso', id, condivisoAlle }, inAttesa: false, errore: null };
}

/** Scrittura fallita: la copia locale resta in attesa, con l'errore visibile; si ritenta al ritorno della rete o su richiesta. */
export function dopoErrore(locale: DiarioLocale, errore: 'rete' | 'altro'): DiarioLocale {
  return { ...locale, inAttesa: true, errore };
}

/** La copia locale vale solo per lo stesso cliente e lo stesso giorno italiano. */
export function copiaValida(locale: DiarioLocale | null | undefined, clientId: string, data: string): locale is DiarioLocale {
  return Boolean(locale && locale.clientId === clientId && locale.data === data);
}
