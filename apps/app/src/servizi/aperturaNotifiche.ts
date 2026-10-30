// Apertura delle notifiche (step 6, contratto notifiche v0.2 §6): il tocco apre la destinazione del §2 anche ad app
// chiusa (la destinazione si conserva finché l'app dell'abbonato non è montata), "indietro" riporta alla scheda di
// partenza; con l'app aperta all'arrivo si aggiornano la campanella e il pallino di Revisioni.
import { router } from 'expo-router';

import { PERCORSO_PER_VOCE } from '@/core/navigazione/voci';
import { destinazioneDaDati, leggiDatiPush, rottaDestinazione, type DestinazionePush } from '@/core/notifiche/push';
import { leggiGiornata } from '@/servizi/diario';
import { memoriaDiario } from '@/servizi/memoriaDiario';
import { aggiornaNotifiche } from '@/servizi/notifiche';
import { ascoltaRicevute, ascoltaRisposte, datiNotifica, dimenticaUltimaRisposta, ultimaRisposta, type RispostaNotifica } from '@/servizi/notifichePush';
import { aggiornaStatoRevisioni } from '@/servizi/revisioni';
import { statoCorrente } from '@/servizi/statoCliente';

let inAttesa: DestinazionePush | null = null;
let abbonatoMontato = false;
let ascoltoAvviato = false;
const gestite = new Set<string>();

/** Data di una giornata per id, dalle righe del diario già in memoria; altrimenti una lettura. */
async function dataGiornata(submissionId: string): Promise<string | null> {
  const m = memoriaDiario();
  const riga = m.settimana.find((r) => r.id === submissionId) ?? Object.values(m.righeFuoriSettimana).find((r) => r.id === submissionId);
  if (riga) return riga.submission_date;
  const giornata = Object.values(m.giornate).find((g) => g.id === submissionId);
  if (giornata) return giornata.data;
  const esito = await leggiGiornata(submissionId);
  return esito.tipo === 'ok' && esito.dati ? esito.dati.submission_date : null;
}

/**
 * Apre la destinazione: le pagine sopra le schede si chiudono, si va alla scheda di partenza e, se serve, sopra di lei
 * si apre la pagina (così "indietro" torna alla scheda). `apri` cambia a ogni apertura: la stessa giornata si riapre.
 */
export async function apriDestinazione(d: DestinazionePush): Promise<void> {
  const data = d.tipo === 'giornata' ? await dataGiornata(d.submissionId) : null;
  const rotta = rottaDestinazione(d, data);
  if (router.canDismiss()) router.dismissAll();
  const params = rotta.parametriScheda ? { ...rotta.parametriScheda, apri: String(Date.now()) } : undefined;
  router.replace({ pathname: PERCORSO_PER_VOCE[rotta.scheda], params } as never);
  if (rotta.pagina) router.push(rotta.pagina as never);
}

function gestisciRisposta(r: RispostaNotifica): void {
  const { id, data } = datiNotifica(r.notification);
  if (gestite.has(id)) return;
  gestite.add(id);
  const d = destinazioneDaDati(leggiDatiPush(data));
  if (!d) return;
  if (abbonatoMontato && statoCorrente()?.codice === 'J') void apriDestinazione(d);
  else inAttesa = d;
}

/**
 * Una volta per avvio (layout radice): notifiche ricevute in primo piano (campanella e pallino di Revisioni),
 * notifiche toccate e quella che ha avviato l'app da chiusa.
 */
export function avviaAscoltoNotifiche(): void {
  if (ascoltoAvviato) return;
  ascoltoAvviato = true;
  ascoltaRicevute(() => {
    aggiornaNotifiche();
    const stato = statoCorrente();
    if (stato?.codice === 'J') aggiornaStatoRevisioni(stato.profilo.clientId);
  });
  ascoltaRisposte(gestisciRisposta);
  ultimaRisposta().then((r) => {
    if (!r) return;
    gestisciRisposta(r);
    dimenticaUltimaRisposta();
  });
}

/** Il layout del gruppo dell'abbonato segnala quando è montato: la destinazione conservata si apre allora. */
export function segnalaAbbonatoMontato(montato: boolean): void {
  abbonatoMontato = montato;
  if (!montato || !inAttesa || statoCorrente()?.codice !== 'J') return;
  const d = inAttesa;
  inAttesa = null;
  void apriDestinazione(d);
}

/** All'uscita dall'account. */
export function svuotaDestinazioneInAttesa(): void {
  inAttesa = null;
}

/** Pagina di sviluppo. */
export function destinazioneInAttesa(): DestinazionePush | null {
  return inAttesa;
}
