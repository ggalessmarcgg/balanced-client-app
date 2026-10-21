import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Profilo } from '@/core/stato/stato';
import type { VoceNavigazione } from '@/ui/BarraNavigazione';
import { Dialogo } from '@/ui/Dialogo';
import { NotificaBreve } from '@/ui/NotificaBreve';
import { NotificaInBasso } from '@/ui/schermate/NotificaInBasso';
import { SchermataAccesso, type VarianteAccesso } from '@/ui/schermate/SchermataAccesso';
import { SchermataRecupero } from '@/ui/schermate/SchermataRecupero';
import { SchermataRaccontaSegnaposto, SchermataSegnapostoPrenotazione } from '@/ui/schermate/SchermateSegnaposto';
import { SchermataAccountNonCollegato, SchermataConsulenzaNonSvolta, SchermataPercorsoConcluso, SchermataPercorsoNonAttivo } from '@/ui/schermate/SchermateStato';
import { SchermataCaricamento, SchermataErroreCaricamento, SchermataSenzaConnessione } from '@/ui/schermate/SchermateTrasversali';
import { OggiSviluppo } from '@/ui/sviluppo/OggiSviluppo';
import { RevisioniSviluppo } from '@/ui/sviluppo/RevisioniSviluppo';
import { StoricoSviluppo } from '@/ui/sviluppo/StoricoSviluppo';
import { colori, margine, spazio, testi, tocco } from '@/ui/theme';

// Pagina di sviluppo "Stati" (rotta protetta da __DEV__): ogni schermata degli step 3, 5 e 7 con dati finti, per i
// confronti con Figma senza accedere. /sviluppo/stati?stato=<chiave> mostra la sola schermata a tutto schermo.

export const STATI_SVILUPPO = [
  ['login', 'Accesso · Login (425:224)'],
  ['login-errore', 'Accesso · Login con errore (425:252)'],
  ['email-non-confermata', 'Accesso · Email non confermata (562:4254)'],
  ['link-inviato', 'Accesso · Email non confermata · link inviato (562:4319)'],
  ['recupero', 'Accesso · Recupero password · Email (425:286)'],
  ['notifica', 'Login con Notifica breve · conferma (563:5122)'],
  ['login-tastiera', 'Login con il campo email a fuoco (verifica della tastiera: Accedi resta coperto)'],
  ['C', 'C · Consulenza da confermare (segnaposto)'],
  ['D', 'D · Orario passato senza conferma (segnaposto)'],
  ['E', 'E · Orario non più disponibile (segnaposto)'],
  ['F', 'F · Prenotato, prima della consulenza (segnaposto)'],
  ['G', 'G · Appena prenotata (segnaposto)'],
  ['H', 'H · Stati 6 · Percorso non ancora attivo (558:4206)'],
  ['I', 'I · Stati 12 · Consulenza non svolta (562:4195)'],
  ['J', 'J · Oggi · 1 · Diario da iniziare (444:1103)'],
  ['oggi-2-pasti', 'Oggi · 2 · Diario aperto · Pasti (444:1539)'],
  ['oggi-2-pasti-spuntini', 'Oggi · 2 · Pasti con Spuntini aperto (verifica della tastiera: il campo sta sopra la tastiera)'],
  ['oggi-3-valori', 'Oggi · 3 · Diario aperto · Valori (444:2624)'],
  ['oggi-4-sport', 'Oggi · 4 · Diario aperto · Sport (444:2962)'],
  ['oggi-4-sport-riposo', 'Oggi · 4 · Sport con "Oggi riposo" (Card diario · Sport riposo 696:416)'],
  ['oggi-5-commento', 'Oggi · 5 · Diario aperto · Commento (444:3247)'],
  ['oggi-5-commento-tastiera', 'Oggi · 5 · Commento con la nota a fuoco (verifica della tastiera)'],
  ['oggi-6-bozza', 'Oggi · 6 · Diario in bozza (446:3703)'],
  ['oggi-7-condiviso', 'Oggi · 7 · Diario condiviso (446:3777)'],
  ['oggi-commento-da-leggere', 'Oggi condiviso con commento da leggere (Giorno della settimana 704:436)'],
  ['oggi-commento-letto', 'Oggi condiviso con commento letto (Giorno della settimana 704:442)'],
  ['settimana-valutazioni', 'Settimana con le valutazioni: approvata, da rivedere, in attesa, con e senza commento (710:438 … 710:460)'],
  ['andamento-1', 'Andamento · 1 · Oggi con la settimana in corso (479:1908)'],
  ['andamento-2-pochi-dati', 'Andamento · 2 · Oggi con pochi dati (479:2100)'],
  ['andamento-casi', 'Andamento · casi limite: categoria vuota, "<20m" sul primo gradino, durata non riconosciuta, bozza di ieri, oggi riposo in bozza'],
  ['andamento-oggi-condiviso', 'Andamento · oggi già condiviso (colonna piena di venerdì)'],
  ['oggi-errore-salvataggio', 'Oggi in bozza con Notifica breve di errore (salvataggio non riuscito, Riprova)'],
  ['oggi-condiviso-notifica', 'Oggi condiviso con Notifica breve di conferma'],
  ['oggi-valori-vuoti', 'Oggi · 3 · Valori senza risposte (cursore sazietà Vuoto, 691:7467)'],
  ['oggi-avanzamento', 'Oggi · indicatore di avanzamento: i blocchi cambiano da soli ogni 3 s'],
  ['giornate-1-settimana', 'Giornate · 1 · Settimana con commento da leggere (474:1328)'],
  ['giornate-2-pannello', 'Giornate · 2 · Pannello · commento da leggere (474:1430)'],
  ['giornate-3-pannello-pieno', 'Giornate · 3 · Pannello a schermo pieno · commento letto (475:1337)'],
  ['giornate-4-senza-commento', 'Giornate · 4 · Pannello · senza commento (475:1409)'],
  ['giornate-5-modifica', 'Giornate · 5 · Pannello · modifica della giornata (475:1459)'],
  ['giornate-6-storico', 'Giornate · 6 · Storico delle giornate (475:1917)'],
  ['giornate-6-storico-nuovo', 'Giornate · 6 · Storico di un cliente senza diari (solo il mese corrente)'],
  ['giornate-6-storico-caricamento', 'Giornate · 6 · Storico con un mese in caricamento'],
  ['giornate-caricamento', 'Giornate · pannello in caricamento (segnaposti)'],
  ['giornate-errore', 'Giornate · pannello senza connessione (Riprova)'],
  ['racconta', 'Racconta (segnaposto fino allo step 10)'],
  ['revisioni-1-in-corso', 'Revisioni · 1 · Revisione in corso (494:1944)'],
  ['revisioni-2-nuova', 'Revisioni · 2 · Nuova revisione arrivata (494:2060)'],
  ['revisioni-3-in-preparazione', 'Revisioni · 3 · Revisione in preparazione (494:2165)'],
  ['revisioni-4-lettura', 'Revisioni · 4 · Lettura della revisione (494:2487)'],
  ['revisioni-5-prima', 'Revisioni · 5 · Prima revisione in arrivo (494:2528)'],
  ['revisioni-prima-inizia', 'Revisioni · nessuna riga: Revisione 1 · Inizia 0 su 7 con il testo'],
  ['revisioni-piu-nuove', 'Revisioni · Da sbloccare 2/7, In elaborazione, due Nuove (9 e 13) ed elenco'],
  ['revisioni-senza-passate', 'Revisioni · come +test4 oggi: Revisione 1 · Da sbloccare 3 su 7, nessuna passata'],
  ['revisioni-lettura-elenchi', 'Revisioni · lettura con elenchi puntati, ** residuo e Correlazione vuota nascosta'],
  ['revisioni-lettura-foto', 'Revisioni · lettura con la foto dell\'autrice (da rete)'],
  ['revisioni-lettura-caricamento', 'Revisioni · lettura in caricamento (rotta diretta a freddo)'],
  ['revisioni-lettura-errore', 'Revisioni · lettura senza connessione (Riprova)'],
  ['revisioni-caricamento', 'Revisioni · sezione in caricamento'],
  ['revisioni-senza-connessione', 'Revisioni · sezione senza connessione, con il pallino sulla barra'],
  ['revisioni-errore', 'Revisioni · sezione con errore di caricamento'],
  ['K', 'K · Stati 7 · Percorso concluso (558:4260)'],
  ['L', 'L · Stati 11 · Account non collegato (558:4316)'],
  ['caricamento', "Caricamento all'avvio (senza barra di navigazione)"],
  ['senza-connessione', "Senza connessione all'avvio (senza barra)"],
  ['errore-caricamento', "Errore di caricamento all'avvio (senza barra)"],
  ['caricamento-abbonato', 'Trasversali 2 · Caricamento nell app dell abbonato (563:4751)'],
  ['senza-connessione-abbonato', 'Trasversali 1 · Senza connessione nell app dell abbonato (563:4517)'],
  ['errore-caricamento-abbonato', 'Trasversali 3 · Errore di caricamento nell app dell abbonato (563:4978)'],
  ['copia-contatto', 'H con Notifica breve dopo la copia di un contatto'],
  ['uscita-avviso', 'Esci con modifiche non inviate: Dialogo "Hai modifiche non ancora salvate" (Pannello dal basso di 499:2568)'],
  ['barra-animata', 'Barra di navigazione: la voce attiva cambia da sola ogni 2 s (sfondo che scorre, colori in dissolvenza)'],
] as const;
export type ChiaveStatoSviluppo = (typeof STATI_SVILUPPO)[number][0];

const nulla = () => {};
const EMAIL = 'giulia.rossi@email.it';
const PROFILO: Profilo = {
  clientId: 'finto',
  nome: 'Giulia',
  genere: 'female',
  nutrizionista: { id: 'finta', nome: 'Dott.ssa Margherita Chiadò', foto: null },
};
const SLOT = { data: '2026-10-28', ora: '10:00', istante: new Date('2026-10-28T09:00:00.000Z') };
const APPUNTAMENTO = { ...SLOT, id: 'finto', stato: 'scheduled' as const, linkVideochiamata: null };

function Accesso({ variante, password = '••••••••••', notifica = false, emailAFuoco = false }: { variante: VarianteAccesso; password?: string; notifica?: boolean; emailAFuoco?: boolean }) {
  const [email, setEmail] = useState(EMAIL);
  const [pwd, setPwd] = useState(password);
  return (
    <SchermataAccesso
      email={email}
      password={pwd}
      onEmail={setEmail}
      onPassword={setPwd}
      onAccedi={nulla}
      onPasswordDimenticata={nulla}
      onReinvia={nulla}
      variante={variante}
      sovrapposti={notifica ? <NotificaBreveInBasso /> : undefined}
      emailAFuoco={emailAFuoco}
    />
  );
}

function NotificaBreveInBasso() {
  return (
    <View style={stili.notifica}>
      <NotificaBreve tipo="conferma" testo="Ti abbiamo inviato il link per la nuova password." />
    </View>
  );
}

function Recupero() {
  const [email, setEmail] = useState(EMAIL);
  return <SchermataRecupero email={email} onEmail={setEmail} onInvia={nulla} onIndietro={nulla} />;
}

export function SchermataSviluppo({ chiave }: { chiave: ChiaveStatoSviluppo }) {
  switch (chiave) {
    case 'login':
      return <Accesso variante={{ tipo: 'normale' }} password="" />;
    case 'login-errore':
      return <Accesso variante={{ tipo: 'errore', errore: 'credenzialiErrate' }} />;
    case 'email-non-confermata':
      return <Accesso variante={{ tipo: 'emailNonConfermata' }} />;
    case 'link-inviato':
      return <Accesso variante={{ tipo: 'linkInviato', secondiRimanenti: 42 }} />;
    case 'recupero':
      return <Recupero />;
    case 'notifica':
      return <Accesso variante={{ tipo: 'normale' }} password="" notifica />;
    case 'login-tastiera':
      return <Accesso variante={{ tipo: 'normale' }} password="" emailAFuoco />;
    case 'C':
      return <SchermataSegnapostoPrenotazione stato={{ codice: 'C', profilo: PROFILO, slot: SLOT }} nome={PROFILO.nome} onEsci={nulla} />;
    case 'D':
      return <SchermataSegnapostoPrenotazione stato={{ codice: 'D', profilo: PROFILO, slot: SLOT }} nome={PROFILO.nome} onEsci={nulla} />;
    case 'E':
      return <SchermataSegnapostoPrenotazione stato={{ codice: 'E' }} nome={PROFILO.nome} onEsci={nulla} />;
    case 'F':
      return <SchermataSegnapostoPrenotazione stato={{ codice: 'F', profilo: PROFILO, appuntamento: APPUNTAMENTO }} nome={PROFILO.nome} onEsci={nulla} />;
    case 'G':
      return <SchermataSegnapostoPrenotazione stato={{ codice: 'G', profilo: PROFILO, appuntamento: APPUNTAMENTO }} nome={PROFILO.nome} onEsci={nulla} />;
    case 'H':
      return <SchermataPercorsoNonAttivo profilo={PROFILO} onAccount={nulla} onEsci={nulla} />;
    case 'I':
      return <SchermataConsulenzaNonSvolta profilo={PROFILO} onAccount={nulla} onEsci={nulla} />;
    case 'J':
      return <OggiSviluppo scenario="daIniziare" />;
    case 'oggi-2-pasti':
      return <OggiSviluppo scenario="pasti" />;
    case 'oggi-2-pasti-spuntini':
      return <OggiSviluppo scenario="pastiSpuntini" />;
    case 'oggi-3-valori':
      return <OggiSviluppo scenario="valori" />;
    case 'oggi-4-sport':
      return <OggiSviluppo scenario="sport" />;
    case 'oggi-4-sport-riposo':
      return <OggiSviluppo scenario="sportRiposo" />;
    case 'oggi-5-commento':
      return <OggiSviluppo scenario="commento" />;
    case 'oggi-5-commento-tastiera':
      return <OggiSviluppo scenario="commentoTastiera" />;
    case 'oggi-6-bozza':
      return <OggiSviluppo scenario="bozza" />;
    case 'oggi-7-condiviso':
      return <OggiSviluppo scenario="condiviso" />;
    case 'oggi-commento-da-leggere':
      return <OggiSviluppo scenario="oggiCommentoDaLeggere" />;
    case 'oggi-commento-letto':
      return <OggiSviluppo scenario="oggiCommentoLetto" />;
    case 'settimana-valutazioni':
      return <OggiSviluppo scenario="valutazioni" />;
    case 'andamento-1':
      return <OggiSviluppo scenario="andamento" />;
    case 'andamento-2-pochi-dati':
      return <OggiSviluppo scenario="andamentoPochiDati" />;
    case 'andamento-casi':
      return <OggiSviluppo scenario="andamentoCasi" />;
    case 'andamento-oggi-condiviso':
      return <OggiSviluppo scenario="andamentoOggiCondiviso" />;
    case 'oggi-errore-salvataggio':
      return <OggiSviluppo scenario="erroreSalvataggio" />;
    case 'oggi-condiviso-notifica':
      return <OggiSviluppo scenario="condivisoNotifica" />;
    case 'oggi-valori-vuoti':
      return <OggiSviluppo scenario="valoriVuoti" />;
    case 'oggi-avanzamento':
      return <OggiSviluppo scenario="avanzamento" />;
    case 'giornate-1-settimana':
      return <OggiSviluppo scenario="settimanaCommento" />;
    case 'giornate-2-pannello':
      return <OggiSviluppo scenario="pannelloDaLeggere" />;
    case 'giornate-3-pannello-pieno':
      return <OggiSviluppo scenario="pannelloPienoLetto" />;
    case 'giornate-4-senza-commento':
      return <OggiSviluppo scenario="pannelloSenzaCommento" />;
    case 'giornate-5-modifica':
      return <OggiSviluppo scenario="pannelloModifica" />;
    case 'giornate-6-storico':
      return <StoricoSviluppo scenario="mesi" />;
    case 'giornate-6-storico-nuovo':
      return <StoricoSviluppo scenario="nuovo" />;
    case 'giornate-6-storico-caricamento':
      return <StoricoSviluppo scenario="caricamento" />;
    case 'giornate-caricamento':
      return <OggiSviluppo scenario="pannelloCaricamento" />;
    case 'giornate-errore':
      return <OggiSviluppo scenario="pannelloErrore" />;
    case 'racconta':
      return <SchermataRaccontaSegnaposto onIndietro={nulla} />;
    case 'revisioni-1-in-corso':
      return <RevisioniSviluppo scenario="inCorso" />;
    case 'revisioni-2-nuova':
      return <RevisioniSviluppo scenario="nuova" />;
    case 'revisioni-3-in-preparazione':
      return <RevisioniSviluppo scenario="inPreparazione" />;
    case 'revisioni-4-lettura':
      return <RevisioniSviluppo scenario="lettura" />;
    case 'revisioni-5-prima':
      return <RevisioniSviluppo scenario="prima" />;
    case 'revisioni-prima-inizia':
      return <RevisioniSviluppo scenario="primaInizia" />;
    case 'revisioni-piu-nuove':
      return <RevisioniSviluppo scenario="piuNuove" />;
    case 'revisioni-senza-passate':
      return <RevisioniSviluppo scenario="senzaPassate" />;
    case 'revisioni-lettura-elenchi':
      return <RevisioniSviluppo scenario="letturaElenchi" />;
    case 'revisioni-lettura-foto':
      return <RevisioniSviluppo scenario="letturaConFoto" />;
    case 'revisioni-lettura-caricamento':
      return <RevisioniSviluppo scenario="letturaCaricamento" />;
    case 'revisioni-lettura-errore':
      return <RevisioniSviluppo scenario="letturaErrore" />;
    case 'revisioni-caricamento':
      return <RevisioniSviluppo scenario="caricamento" />;
    case 'revisioni-senza-connessione':
      return <RevisioniSviluppo scenario="senzaConnessione" />;
    case 'revisioni-errore':
      return <RevisioniSviluppo scenario="errore" />;
    case 'K':
      return <SchermataPercorsoConcluso profilo={PROFILO} onAccount={nulla} onEsci={nulla} />;
    case 'L':
      return <SchermataAccountNonCollegato onEsci={nulla} />;
    case 'caricamento':
      return <SchermataCaricamento />;
    case 'senza-connessione':
      return <SchermataSenzaConnessione onRiprova={nulla} />;
    case 'errore-caricamento':
      return <SchermataErroreCaricamento onRiprova={nulla} />;
    case 'caricamento-abbonato':
      return <SchermataCaricamento barraSuperiore="completa" barraNavigazione="oggi" />;
    case 'senza-connessione-abbonato':
      return <SchermataSenzaConnessione onRiprova={nulla} barraSuperiore="completa" barraNavigazione="oggi" />;
    case 'errore-caricamento-abbonato':
      return <SchermataErroreCaricamento onRiprova={nulla} titolo="Piano" barraSuperiore="completa" barraNavigazione="piano" />;
    case 'uscita-avviso':
      return (
        <SchermataPercorsoNonAttivo
          profilo={PROFILO}
          onAccount={nulla}
          onEsci={nulla}
          sovrapposti={<Dialogo aperto titolo="Hai modifiche non ancora salvate" testo="Se esci ora andranno perse." annulla={{ etichetta: 'Annulla', onPress: nulla }} conferma={{ etichetta: 'Esci comunque', onPress: nulla }} />}
        />
      );
    case 'barra-animata':
      return <BarraAnimata />;
    case 'copia-contatto':
      return (
        <SchermataPercorsoNonAttivo
          profilo={PROFILO}
          onAccount={nulla}
          onEsci={nulla}
          sovrapposti={<NotificaInBasso tipo="conferma" testo="Email copiata negli appunti." />}
        />
      );
  }
}

const VOCI_CICLO: VoceNavigazione[] = ['oggi', 'piano', 'revisioni', 'account', 'revisioni', 'oggi'];
const PASSO_CICLO_MS = 2000;

/** La voce attiva della barra cambia da sola ogni 2 s, per vedere lo scorrimento dell'evidenza e la dissolvenza dei colori. */
function BarraAnimata() {
  const [passo, setPasso] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setPasso((p) => (p + 1) % VOCI_CICLO.length), PASSO_CICLO_MS);
    return () => clearInterval(timer);
  }, []);
  return <SchermataCaricamento barraSuperiore="completa" barraNavigazione={VOCI_CICLO[passo] ?? 'oggi'} revisioneNuova />;
}

/** Elenco delle schermate: ogni voce apre la rotta con ?stato=<chiave>. */
export function ElencoStatiSviluppo() {
  return (
    <SafeAreaView style={stili.pagina} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={stili.elenco}>
        <Text style={stili.titolo}>Stati</Text>
        {STATI_SVILUPPO.map(([chiave, nome]) => (
          <Link key={chiave} href={{ pathname: '/sviluppo/stati', params: { stato: chiave } }} style={stili.voce} accessibilityRole="link">
            {nome}
          </Link>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const stili = StyleSheet.create({
  pagina: { flex: 1, backgroundColor: colori.sfondo.pagina },
  elenco: { paddingHorizontal: margine.pagina, paddingVertical: spazio[16], gap: spazio[4] },
  titolo: { ...testi.accentoSerif, color: colori.testo.primario, marginBottom: spazio[12] },
  voce: { ...testi.body, color: colori.azione.primaria, minHeight: tocco.minimoIos, paddingVertical: spazio[12] },
  notifica: { position: 'absolute', left: margine.pagina, right: margine.pagina, bottom: 34 + spazio[16] },
});
