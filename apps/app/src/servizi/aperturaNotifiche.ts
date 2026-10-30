// Apertura delle notifiche (step 6, contratto notifiche v0.2 §6): il tocco apre la destinazione del §2 anche ad app
// chiusa (la destinazione si conserva finché l'app dell'abbonato non è montata), "indietro" riporta alla scheda di
// partenza; con l'app aperta all'arrivo si aggiornano la campanella e il pallino di Revisioni.
import { router } from 'expo-router';

import { PERCORSO_PER_VOCE } from '@/core/navigazione/voci';
import { contaMontaggio, gruppoMontato } from '@/core/notifiche/montaggio';
import { destinazioneDaDati, leggiDatiPush, rottaDestinazione, type DestinazionePush } from '@/core/notifiche/push';
import { leggiGiornata } from '@/servizi/diario';
import { memoriaDiario } from '@/servizi/memoriaDiario';
import { aggiornaNotifiche, memoriaNotifiche, segnaVisteContenuto } from '@/servizi/notifiche';
import { ascoltaRicevute, ascoltaRisposte, datiNotifica, dimenticaUltimaRisposta, ultimaRisposta, type RispostaNotifica } from '@/servizi/notifichePush';
import { aggiornaStatoRevisioni } from '@/servizi/revisioni';
import { statoCorrente } from '@/servizi/statoCliente';

type Apertura = { destinazione: DestinazionePush; notificaId: string | null };
let inAttesa: Apertura | null = null;
/**
 * Istanze montate del layout del gruppo dell'abbonato, non un booleano (difetto del 31/10/2026): un `router.replace`
 * sulla stessa scheda rimonta il gruppo, e con un booleano il montaggio del nuovo layout metteva vero e lo smontaggio
 * del vecchio, subito dopo, rimetteva falso; da lì ogni notifica toccata restava parcheggiata e il cliente arrivava su
 * Oggi senza il pannello della giornata.
 */
let layoutMontati = 0;
const abbonatoMontato = () => gruppoMontato(layoutMontati);
let ascoltoAvviato = false;
const gestite = new Set<string>();

/**
 * Registro di sviluppo dell'apertura delle notifiche (31/10/2026, per ritrovare un'apertura finita su Oggi senza il
 * pannello): ultime 40 righe con l'ora, lette dalla pagina /sviluppo/notifiche-prova. Solo in __DEV__.
 */
const REGISTRO_MASSIMO = 40;
const registro: string[] = [];
function annota(testo: string): void {
  if (!__DEV__) return;
  registro.push(`${new Date().toISOString().slice(11, 23)} ${testo}`);
  if (registro.length > REGISTRO_MASSIMO) registro.shift();
}
export function registroApertura(): readonly string[] {
  return registro;
}

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
export async function apriDestinazione(d: DestinazionePush, notificaId: string | null = null): Promise<void> {
  const data = d.tipo === 'giornata' ? await dataGiornata(d.submissionId) : null;
  if (d.tipo === 'giornata') annota(`giornata ${d.submissionId} → data ${data ?? 'NON TROVATA'} (settimana in memoria: ${memoriaDiario().settimana.length} righe)`);
  // Notifiche con questo contenuto come riferimento: viste (step 6). Ad app chiusa, con l'elenco non ancora caricato,
  // vale l'identificativo arrivato con la push.
  const riferimento = d.tipo === 'giornata' ? d.submissionId : d.tipo === 'revisione' ? d.id : null;
  if (riferimento) {
    const segnate = await segnaVisteContenuto(riferimento, notificaId);
    annota(`viste ${segnate.length} notifiche per ${riferimento} (elenco in memoria: ${memoriaNotifiche().righe ? 'sì' : 'no'})`);
  }
  const rotta = rottaDestinazione(d, data);
  const dismiss = router.canDismiss();
  if (dismiss) router.dismissAll();
  const params = rotta.parametriScheda ? { ...rotta.parametriScheda, apri: String(Date.now()) } : undefined;
  annota(`rotta: dismiss ${dismiss ? 'sì' : 'no'}, replace ${PERCORSO_PER_VOCE[rotta.scheda]} ${params ? JSON.stringify(params) : ''}${rotta.pagina ? `, push ${rotta.pagina.pathname}` : ''}`);
  router.replace({ pathname: PERCORSO_PER_VOCE[rotta.scheda], params } as never);
  if (rotta.pagina) router.push(rotta.pagina as never);
}

function gestisciRisposta(r: RispostaNotifica): void {
  const { id, data } = datiNotifica(r.notification);
  if (gestite.has(id)) {
    annota(`risposta ${id} già gestita, ignorata`);
    return;
  }
  gestite.add(id);
  const dati = leggiDatiPush(data);
  const d = destinazioneDaDati(dati);
  annota(`risposta ${id}: tipo ${dati.tipo ?? '-'}, destinazione ${dati.destinazione ?? '-'}, riferimento ${dati.riferimento ?? '-'} → ${d ? d.tipo : 'nessuna destinazione'}; layout dell'abbonato montati ${layoutMontati}, stato ${statoCorrente()?.codice ?? '-'}`);
  if (!d) return;
  if (abbonatoMontato() && statoCorrente()?.codice === 'J') void apriDestinazione(d, dati.notificaId);
  else inAttesa = { destinazione: d, notificaId: dati.notificaId };
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

/**
 * Il layout del gruppo dell'abbonato segnala quando si monta e si smonta: la destinazione conservata si apre al
 * montaggio. Conta le istanze, perché al rimontaggio il nuovo layout si monta prima che il vecchio si smonti.
 */
export function segnalaAbbonatoMontato(montato: boolean): void {
  layoutMontati = contaMontaggio(layoutMontati, montato);
  annota(`layout dell'abbonato ${montato ? 'montato' : 'smontato'}: istanze ${layoutMontati}${inAttesa ? `, in attesa ${inAttesa.destinazione.tipo}` : ''}`);
  if (!montato || !inAttesa || statoCorrente()?.codice !== 'J') return;
  const a = inAttesa;
  inAttesa = null;
  annota(`abbonato montato: apro la destinazione in attesa (${a.destinazione.tipo})`);
  void apriDestinazione(a.destinazione, a.notificaId);
}

/** All'uscita dall'account. */
export function svuotaDestinazioneInAttesa(): void {
  inAttesa = null;
}

/** Pagina di sviluppo e test: quante istanze del layout dell'abbonato risultano montate. */
export function layoutAbbonatoMontati(): number {
  return layoutMontati;
}

/** Pagina di sviluppo. */
export function destinazioneInAttesa(): DestinazionePush | null {
  return inAttesa?.destinazione ?? null;
}
