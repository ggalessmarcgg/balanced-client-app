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
import { SchermataAccountNonCollegato, SchermataConsulenzaNonSvolta, SchermataPercorsoConcluso, SchermataPercorsoNonAttivo } from '@/ui/schermate/SchermateStato';
import { SchermataCaricamento, SchermataErroreCaricamento, SchermataSenzaConnessione } from '@/ui/schermate/SchermateTrasversali';
import { AccountSviluppo } from '@/ui/sviluppo/AccountSviluppo';
import { Lotto2Sviluppo, MenuSviluppo } from '@/ui/sviluppo/MenuSviluppo';
import { OggiSviluppo } from '@/ui/sviluppo/OggiSviluppo';
import { PianoRealeSviluppo, PianoSchermataSviluppo } from '@/ui/sviluppo/PianoSchermateSviluppo';
import { PianoSviluppo } from '@/ui/sviluppo/PianoSviluppo';
import { RaccontaSviluppo } from '@/ui/sviluppo/RaccontaSviluppo';
import { RevisioniSviluppo } from '@/ui/sviluppo/RevisioniSviluppo';
import { RiepilogoSviluppo } from '@/ui/sviluppo/RiepilogoSviluppo';
import { StatiSviluppo } from '@/ui/sviluppo/StatiSviluppo';
import { StoricoSviluppo } from '@/ui/sviluppo/StoricoSviluppo';
import { colori, margine, spazio, testi, tocco } from '@/ui/theme';

// Pagina di sviluppo "Stati" (rotta protetta da __DEV__): ogni schermata degli step 3, 5, 7, 10, 11 e 12 con dati finti, per i
// confronti con Figma senza accedere. /sviluppo/stati?stato=<chiave> mostra la sola schermata a tutto schermo.

export const STATI_SVILUPPO = [
  ['login', 'Accesso · Login (425:224)'],
  ['login-errore', 'Accesso · Login con errore (425:252)'],
  ['email-non-confermata', 'Accesso · Email non confermata (562:4254)'],
  ['link-inviato', 'Accesso · Email non confermata · link inviato (562:4319)'],
  ['recupero', 'Accesso · Recupero password · Email (425:286)'],
  ['notifica', 'Login con Notifica breve · conferma (563:5122)'],
  ['login-tastiera', 'Login con il campo email a fuoco (verifica della tastiera: Accedi resta coperto)'],
  ['stati-1-da-confermare', 'C · Stati 1 · Consulenza da confermare (550:3636)'],
  ['stati-1-conferma-caricamento', 'C · "Conferma la consulenza" in caricamento'],
  ['stati-1-errore', 'C · Notifica breve di errore dopo una conferma non riuscita'],
  ['stati-2-prima', 'F · Stati 2 · Prima della consulenza (550:3694)'],
  ['stati-2-link-in-arrivo', 'F · Prima della consulenza senza link ("Link in arrivo")'],
  ['stati-2-senza-appuntamento', 'F · Prenotato senza una visita in programma (solo cancellate)'],
  ['stati-3-orario-passato', 'D · Stati 3 · Orario passato senza conferma (550:3754)'],
  ['stati-3-orario-assente', 'D · Lead senza orario (card senza "Quando")'],
  ['stati-4-scegli', 'Stati 4 · Orario passato · scegli un nuovo orario (556:3756)'],
  ['stati-4-settimana-successiva', 'Stati 4 · pannello sulla scheda "Settimana successiva"'],
  ['stati-4.1-non-disponibile', 'E · Stati 4.1 · Orario non più disponibile (556:3897)'],
  ['stati-4.2-cambia', 'Stati 4.2 · Cambia orario prima della conferma (556:4038)'],
  ['stati-4.3-nessun-orario', 'Stati 4.3 · Nessun orario disponibile (738:7520)'],
  ['stati-4-caricamento', 'Pannello scelta orario in caricamento'],
  ['stati-4-errore', 'Pannello scelta orario senza connessione (Riprova)'],
  ['stati-4-molti-orari', 'Pannello scelta orario con molti orari: la griglia scorre, le azioni restano fisse'],
  ['stati-5-confermata', 'G · Stati 5 · Consulenza prenotata (550:3890)'],
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
  ['racconta-2-permesso', 'Racconta · 2 · Permesso microfono (459:643)'],
  ['racconta-2-permesso-in-richiesta', 'Racconta · 2 · "Consenti" in caricamento (richiesta di sistema in corso)'],
  ['racconta-3-microfono-disattivato', 'Racconta · 3 · Microfono disattivato (459:681)'],
  ['racconta-4-pronto', 'Racconta · 4 · Pronto (459:719); il tocco avvia una registrazione finta'],
  ['racconta-5-registrazione', 'Racconta · 5 · In registrazione (459:779): timer a 0:42 e barrette ferme del disegno'],
  ['racconta-5-registrazione-animata', 'Racconta · 5 · registrazione finta: timer che avanza e livello voce che segue un parlato finto'],
  ['racconta-5-pausa', 'Racconta · 5 · In registrazione in pausa (app in secondo piano o chiamata; senza disegno)'],
  ['racconta-5-limite', 'Racconta · 5 · a 5 s dal limite: arresto automatico a 3:00 e passaggio a "Registrazione terminata"'],
  ['racconta-5.2-terminata', 'Racconta · 5.2 · Registrazione terminata (756:7628): penna "Da inviare" e Ricomincia'],
  ['racconta-tutorial-3-pronto', 'Tutorial · 3 · Racconta la tua giornata (586:5739) sulla schermata Pronto'],
  ['racconta-tutorial-4-trascrizione', 'Tutorial · 4 · Racconta · trascrizione (758:7670) sulla 5.2'],
  ['racconta-tutorial-5-crea-diario', 'Tutorial · 5 · Racconta · crea il diario (758:7728) su Il tuo racconto'],
  ['racconta-6-racconto', 'Racconta · 6 · Il tuo racconto (459:856), testo modificabile'],
  ['racconta-6-tastiera', 'Racconta · 6 · Il tuo racconto con il campo a fuoco (verifica della tastiera)'],
  ['racconta-7-trascrizione', 'Racconta · 7.1 · Trascrizione in corso (756:7718), pallini a saltello'],
  ['racconta-10-senza-connessione', 'Racconta · 10 · Senza connessione (459:1629)'],
  ['racconta-11-non-ho-capito', 'Racconta · 11 · Non ho capito (459:1669; dal lotto 2)'],
  ['racconta-12-errore', 'Racconta · 12 · Trascrizione non riuscita con "Riprova" (459:1712, testi della trascrizione)'],
  ['racconta-errore-non-disponibile', 'Racconta · percorso non attivo (abbonamento_non_attivo; senza disegno)'],
  ['racconta-errore-sessione', 'Racconta · sessione scaduta (token_non_valido; senza disegno)'],
  ['racconta-errore-troppo-lungo', 'Racconta · audio troppo lungo, "Ricomincia" (senza disegno)'],
  ['racconta-registrazione-non-riuscita', 'Racconta · 4 con l\'avviso "La registrazione non è partita" (senza disegno)'],
  ['racconta-7-preparando', 'Racconta · 7 · Preparando il tuo diario (459:922), senza freccia indietro (lotto 2)'],
  ['racconta-12-elaborazione', 'Racconta · 12 · Elaborazione non riuscita (459:1712): il racconto salvato e "Riprova"'],
  ['racconta-12-elaborazione-offline', 'Racconta · 12 · compilazione senza rete: il racconto salvato e "Riprova" (senza disegno)'],
  ['racconta-12-elaborazione-sessione', 'Racconta · 12 · compilazione con la sessione scaduta: "Scrivi il diario" (senza disegno)'],
  ['racconta-12-elaborazione-condiviso', 'Racconta · 12 · giornata già condivisa nel frattempo (senza disegno)'],
  ['racconta-8-riepilogo', 'Racconta · 8 · Il tuo diario, riepilogo modificabile (747:7517), dati del disegno'],
  ['racconta-8-riepilogo-compilato', 'Racconta · 8 · riepilogo con un diario compilato da un racconto (pasti scritti)'],
  ['racconta-8-riepilogo-riposo', 'Racconta · 8 · riepilogo con "Oggi riposo" (durate al 50 %)'],
  ['racconta-8-riepilogo-vuoto', 'Racconta · 8 · riepilogo vuoto: "Invia" disattivato'],
  ['racconta-8-riepilogo-tastiera', 'Racconta · 8 · riepilogo con il commento a fuoco (verifica della tastiera)'],
  ['racconta-8-riepilogo-errore-invio', 'Racconta · 8 · riepilogo con la Notifica breve d\'errore di "Invia" (senza disegno)'],
  ['racconta-tutorial-6-invio', 'Tutorial · 6 · Racconta · invio del diario (758:7773) sul riepilogo, scorso in fondo'],
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
  ['menu-1', 'Menu · 1 · Menu a tutta pagina (508:2614), con tutte le voci'],
  ['menu-uscita', 'Menu con il Dialogo di uscita aperto'],
  ['menu-3-abbonato', 'Menu · 3 · La tua nutrizionista · abbonato (515:2957)'],
  ['menu-3-prenotato', 'Menu · 3 · La tua nutrizionista · prenotato, contatto oscurato (514:2530)'],
  ['menu-3.1-ferie', 'Menu · 3.1 · La tua nutrizionista · in ferie (596:5846)'],
  ['menu-3-ferie-senza-sostituta', 'La tua nutrizionista in ferie senza sostituta assegnata'],
  ['menu-3-minima', 'La tua nutrizionista con il solo nome (sezioni vuote nascoste, senza telefono)'],
  ['menu-3-caricamento', 'La tua nutrizionista in caricamento'],
  ['menu-3-errore', 'La tua nutrizionista senza connessione'],
  ['menu-4-appuntamenti', 'Menu · 4 · Appuntamenti (517:2616)'],
  ['menu-4.1-oggi', 'Menu · 4.1 · Appuntamenti · visita oggi, prima visita (517:2680)'],
  ['menu-4.2-nessuno', 'Menu · 4.2 · Appuntamenti · nessuna visita in programma (517:2741)'],
  ['menu-4-link-in-arrivo', 'Appuntamenti con la prossima visita senza link (pulsante "Link in arrivo" disabilitato)'],
  ['menu-4-senza-passati', 'Appuntamenti senza visite passate'],
  ['menu-4-caricamento', 'Appuntamenti in caricamento'],
  ['menu-6-grafici', 'Menu · 6 · Peso e misure · grafici (525:2846)'],
  ['menu-6.1-tabelle', 'Menu · 6.1 · Peso e misure · tabelle (525:2930)'],
  ['menu-6-senza-altezza', 'Peso e misure senza altezza (card BMI nascosta)'],
  ['menu-6-una-misurazione', 'Peso e misure con un solo peso e una sola misurazione (niente confronto: tabella)'],
  ['menu-6-senza-dati', 'Peso e misure senza dati'],
  ['menu-6-caricamento', 'Peso e misure in caricamento'],
  ['menu-5-contenuti', 'Menu · 5 · Contenuti (520:2883)'],
  ['menu-5.1-contenuto', 'Menu · 5.1 · Contenuto (520:3086)'],
  ['menu-5-caricamento', 'Contenuti in caricamento'],
  ['account-1', 'Account · 1 · Profilo (499:2145)'],
  ['account-interruttori', 'Account: i promemoria cambiano da soli ogni 2 s (pomello che scorre, fondo in dissolvenza; diario → weekend in cascata)'],
  ['account-1-senza-abbonamento', 'Account senza abbonamento Stripe leggibile (solo "Stato · Attivo" e il testo di riserva)'],
  ['account-1-caricamento', 'Account con l\'abbonamento in caricamento'],
  ['account-1-promemoria-spenti', 'Account con i promemoria spenti (weekend disabilitato)'],
  ['account-1-senza-barra', 'Account dagli stati H e K: senza barra, senza nutrizionista'],
  ['account-1-nuove', 'Account con i pallini: notifiche non viste e revisione Nuova'],
  ['account-3-avviso', 'Account · 3 · Elimina account · avviso (499:2568)'],
  ['account-4-conferma', 'Account · 4 · Elimina account · conferma (499:2709)'],
  ['account-elimina-notifica', 'Account dopo "Elimina definitivamente": Notifica breve "disponibile a breve"'],
  ['menu-2-notifiche', 'Menu · 2 · Notifiche (508:2699)'],
  ['notifiche-vuote', 'Notifiche senza righe negli ultimi 7 giorni'],
  ['notifiche-caricamento', 'Notifiche in caricamento'],
  ['notifiche-errore', 'Notifiche senza connessione (Riprova)'],
  ['uscita-avviso', 'Esci con modifiche non inviate: Dialogo "Hai modifiche non ancora salvate" (Pannello dal basso di 499:2568)'],
  ['barra-animata', 'Barra di navigazione: la voce attiva cambia da sola ogni 2 s (sfondo che scorre, colori in dissolvenza)'],
  ['piano-1-fisso', 'Piano · 1 · Piano fisso (527:2947), "G" selezionato'],
  ['piano-1-fisso-nomi-lunghi', 'Piano fisso con nomi di pasto lunghi (intestazioni a capo), giorno di oggi'],
  ['piano-1-fisso-giorno-vuoto', 'Piano fisso con il mercoledì senza righe: il giorno non compare nel selettore'],
  ['piano-1-senza-indicazioni', 'Piano fisso senza indicazioni: nessun "Indicazioni" sulla riga del titolo'],
  ['piano-2-variabile', 'Piano · 2 · Piano variabile (527:3070), "Pranzo" selezionato'],
  ['piano-2-variabile-nomi-lunghi', 'Piano variabile con 4 pasti dai nomi lunghi e minuscoli, pasto per fascia oraria'],
  ['piano-3-in-elaborazione', 'Piano · 3 · Piano in elaborazione (527:3174)'],
  ['piano-caricamento', 'Piano in caricamento (segnaposti sulla forma della pagina)'],
  ['piano-errore', 'Piano · Errore di caricamento con "Riprova" (563:4978)'],
  ['piano-senza-rete', 'Piano senza connessione e senza copia (563:4517)'],
  ['piano-senza-rete-copia', 'Piano senza connessione con la copia: Avviso connessione sopra il titolo'],
  ['piano-1.1-indicazioni', 'Piano · 1.1 · Indicazioni (775:7878)'],
  ['piano-reale', 'Scheda Piano vera per l\'account in sessione (serve un abbonato, es. +test4)'],
  ['piano-reale-indicazioni', 'Indicazioni vere per l\'account in sessione'],
  ['piano-lettura', 'Piano · lettura (step 8, lotto 1): il piano composto per l\'account in sessione, in forma testuale (serve un abbonato, es. +test4)'],
] as const;
export type ChiaveStatoSviluppo = (typeof STATI_SVILUPPO)[number][0];

const nulla = () => {};
const EMAIL = 'giulia.rossi@email.it';
const PROFILO: Profilo = {
  clientId: 'finto',
  nome: 'Giulia',
  nomeCompleto: 'Giulia Rossi',
  genere: 'female',
  telefono: null,
  nutrizionista: { id: 'finta', nome: 'Dott.ssa Margherita Chiadò', foto: null, specializzazione: null, numeroAlbo: null },
  account: { email: EMAIL, giornateCondivise: 142, promemoria: { diario: true, weekend: true }, conStripe: true },
};

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
    case 'stati-1-da-confermare':
      return <StatiSviluppo scenario="daConfermare" />;
    case 'stati-1-conferma-caricamento':
      return <StatiSviluppo scenario="daConfermareCaricamento" />;
    case 'stati-1-errore':
      return <StatiSviluppo scenario="daConfermareErrore" />;
    case 'stati-2-prima':
      return <StatiSviluppo scenario="prima" />;
    case 'stati-2-link-in-arrivo':
      return <StatiSviluppo scenario="primaLinkInArrivo" />;
    case 'stati-2-senza-appuntamento':
      return <StatiSviluppo scenario="primaSenzaAppuntamento" />;
    case 'stati-3-orario-passato':
      return <StatiSviluppo scenario="orarioPassato" />;
    case 'stati-3-orario-assente':
      return <StatiSviluppo scenario="orarioAssente" />;
    case 'stati-4-scegli':
      return <StatiSviluppo scenario="pannelloOrarioPassato" />;
    case 'stati-4-settimana-successiva':
      return <StatiSviluppo scenario="pannelloSettimanaSuccessiva" />;
    case 'stati-4.1-non-disponibile':
      return <StatiSviluppo scenario="pannelloNonDisponibile" />;
    case 'stati-4.2-cambia':
      return <StatiSviluppo scenario="pannelloModifica" />;
    case 'stati-4.3-nessun-orario':
      return <StatiSviluppo scenario="pannelloNessunOrario" />;
    case 'stati-4-caricamento':
      return <StatiSviluppo scenario="pannelloCaricamento" />;
    case 'stati-4-errore':
      return <StatiSviluppo scenario="pannelloErrore" />;
    case 'stati-4-molti-orari':
      return <StatiSviluppo scenario="pannelloMoltiOrari" />;
    case 'stati-5-confermata':
      return <StatiSviluppo scenario="confermata" />;
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
    case 'racconta-2-permesso':
      return <RaccontaSviluppo scenario="permesso" />;
    case 'racconta-2-permesso-in-richiesta':
      return <RaccontaSviluppo scenario="permessoInRichiesta" />;
    case 'racconta-3-microfono-disattivato':
      return <RaccontaSviluppo scenario="microfonoDisattivato" />;
    case 'racconta-4-pronto':
      return <RaccontaSviluppo scenario="pronto" />;
    case 'racconta-5-registrazione':
      return <RaccontaSviluppo scenario="registrazione" />;
    case 'racconta-5-pausa':
      return <RaccontaSviluppo scenario="registrazionePausa" />;
    case 'racconta-5-registrazione-animata':
      return <RaccontaSviluppo scenario="registrazioneAnimata" />;
    case 'racconta-5-limite':
      return <RaccontaSviluppo scenario="registrazioneLimite" />;
    case 'racconta-5.2-terminata':
      return <RaccontaSviluppo scenario="terminata" />;
    case 'racconta-tutorial-3-pronto':
      return <RaccontaSviluppo scenario="tutorialPronto" />;
    case 'racconta-tutorial-4-trascrizione':
      return <RaccontaSviluppo scenario="tutorialTerminata" />;
    case 'racconta-tutorial-5-crea-diario':
      return <RaccontaSviluppo scenario="tutorialRacconto" />;
    case 'racconta-6-racconto':
      return <RaccontaSviluppo scenario="racconto" />;
    case 'racconta-6-tastiera':
      return <RaccontaSviluppo scenario="raccontoTastiera" />;
    case 'racconta-7-trascrizione':
      return <RaccontaSviluppo scenario="trascrizione" />;
    case 'racconta-10-senza-connessione':
      return <RaccontaSviluppo scenario="senzaConnessione" />;
    case 'racconta-11-non-ho-capito':
      return <RaccontaSviluppo scenario="nonHoCapito" />;
    case 'racconta-12-errore':
      return <RaccontaSviluppo scenario="errore" />;
    case 'racconta-errore-non-disponibile':
      return <RaccontaSviluppo scenario="erroreNonDisponibile" />;
    case 'racconta-errore-sessione':
      return <RaccontaSviluppo scenario="erroreSessione" />;
    case 'racconta-errore-troppo-lungo':
      return <RaccontaSviluppo scenario="erroreTroppoLungo" />;
    case 'racconta-registrazione-non-riuscita':
      return <RaccontaSviluppo scenario="registrazioneNonRiuscita" />;
    case 'racconta-7-preparando':
      return <RaccontaSviluppo scenario="compilazione" />;
    case 'racconta-12-elaborazione':
      return <RaccontaSviluppo scenario="erroreCompilazione" />;
    case 'racconta-12-elaborazione-offline':
      return <RaccontaSviluppo scenario="erroreCompilazioneRete" />;
    case 'racconta-12-elaborazione-sessione':
      return <RaccontaSviluppo scenario="erroreCompilazioneSessione" />;
    case 'racconta-12-elaborazione-condiviso':
      return <RaccontaSviluppo scenario="erroreCompilazioneCondiviso" />;
    case 'racconta-8-riepilogo':
      return <RiepilogoSviluppo scenario="figma" />;
    case 'racconta-8-riepilogo-compilato':
      return <RiepilogoSviluppo scenario="compilato" />;
    case 'racconta-8-riepilogo-riposo':
      return <RiepilogoSviluppo scenario="riposo" />;
    case 'racconta-8-riepilogo-vuoto':
      return <RiepilogoSviluppo scenario="vuoto" />;
    case 'racconta-8-riepilogo-tastiera':
      return <RiepilogoSviluppo scenario="tastiera" />;
    case 'racconta-8-riepilogo-errore-invio':
      return <RiepilogoSviluppo scenario="erroreInvio" />;
    case 'racconta-tutorial-6-invio':
      return <RiepilogoSviluppo scenario="tutorial" />;
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
    case 'menu-1':
      return <MenuSviluppo scenario="menu" />;
    case 'menu-uscita':
      return <MenuSviluppo scenario="menuUscita" />;
    case 'menu-3-abbonato':
      return <MenuSviluppo scenario="nutrizionistaAbbonato" />;
    case 'menu-3-prenotato':
      return <MenuSviluppo scenario="nutrizionistaPrenotato" />;
    case 'menu-3.1-ferie':
      return <MenuSviluppo scenario="nutrizionistaFerie" />;
    case 'menu-3-ferie-senza-sostituta':
      return <MenuSviluppo scenario="nutrizionistaFerieSenzaSostituta" />;
    case 'menu-3-minima':
      return <MenuSviluppo scenario="nutrizionistaMinima" />;
    case 'menu-3-caricamento':
      return <MenuSviluppo scenario="nutrizionistaCaricamento" />;
    case 'menu-3-errore':
      return <MenuSviluppo scenario="nutrizionistaErrore" />;
    case 'menu-4-appuntamenti':
      return <MenuSviluppo scenario="appuntamenti" />;
    case 'menu-4.1-oggi':
      return <MenuSviluppo scenario="appuntamentiOggi" />;
    case 'menu-4.2-nessuno':
      return <MenuSviluppo scenario="appuntamentiNessuno" />;
    case 'menu-4-link-in-arrivo':
      return <MenuSviluppo scenario="appuntamentiLinkInArrivo" />;
    case 'menu-4-senza-passati':
      return <MenuSviluppo scenario="appuntamentiSenzaPassati" />;
    case 'menu-4-caricamento':
      return <MenuSviluppo scenario="appuntamentiCaricamento" />;
    case 'menu-6-grafici':
      return <Lotto2Sviluppo scenario="misureGrafici" />;
    case 'menu-6.1-tabelle':
      return <Lotto2Sviluppo scenario="misureTabelle" />;
    case 'menu-6-senza-altezza':
      return <Lotto2Sviluppo scenario="misureSenzaAltezza" />;
    case 'menu-6-una-misurazione':
      return <Lotto2Sviluppo scenario="misureUnaMisurazione" />;
    case 'menu-6-senza-dati':
      return <Lotto2Sviluppo scenario="misureSenzaDati" />;
    case 'menu-6-caricamento':
      return <Lotto2Sviluppo scenario="misureCaricamento" />;
    case 'menu-5-contenuti':
      return <Lotto2Sviluppo scenario="contenuti" />;
    case 'menu-5.1-contenuto':
      return <Lotto2Sviluppo scenario="contenuto" />;
    case 'menu-5-caricamento':
      return <Lotto2Sviluppo scenario="contenutiCaricamento" />;
    case 'account-1':
      return <AccountSviluppo scenario="account" />;
    case 'account-interruttori':
      return <AccountSviluppo scenario="accountInterruttori" />;
    case 'account-1-senza-abbonamento':
      return <AccountSviluppo scenario="accountSenzaAbbonamento" />;
    case 'account-1-caricamento':
      return <AccountSviluppo scenario="accountCaricamento" />;
    case 'account-1-promemoria-spenti':
      return <AccountSviluppo scenario="accountPromemoriaSpenti" />;
    case 'account-1-senza-barra':
      return <AccountSviluppo scenario="accountSenzaBarra" />;
    case 'account-1-nuove':
      return <AccountSviluppo scenario="accountNuove" />;
    case 'account-3-avviso':
      return <AccountSviluppo scenario="eliminaAvviso" />;
    case 'account-4-conferma':
      return <AccountSviluppo scenario="eliminaConferma" />;
    case 'account-elimina-notifica':
      return <AccountSviluppo scenario="eliminaNotifica" />;
    case 'menu-2-notifiche':
      return <AccountSviluppo scenario="notifiche" />;
    case 'notifiche-vuote':
      return <AccountSviluppo scenario="notificheVuote" />;
    case 'notifiche-caricamento':
      return <AccountSviluppo scenario="notificheCaricamento" />;
    case 'notifiche-errore':
      return <AccountSviluppo scenario="notificheErrore" />;
    case 'uscita-avviso':
      return (
        <SchermataPercorsoNonAttivo
          profilo={PROFILO}
          onAccount={nulla}
          onEsci={nulla}
          sovrapposti={<Dialogo aperto titolo="Hai modifiche non ancora salvate" testo="Se esci ora andranno perse." annulla={{ etichetta: 'Annulla', onPress: nulla }} conferma={{ etichetta: 'Esci comunque', onPress: nulla }} />}
        />
      );
    case 'piano-1-fisso':
      return <PianoSchermataSviluppo variante="fisso" />;
    case 'piano-1-fisso-nomi-lunghi':
      return <PianoSchermataSviluppo variante="fisso-nomi-lunghi" />;
    case 'piano-1-fisso-giorno-vuoto':
      return <PianoSchermataSviluppo variante="fisso-giorno-vuoto" />;
    case 'piano-1-senza-indicazioni':
      return <PianoSchermataSviluppo variante="senza-indicazioni" />;
    case 'piano-2-variabile':
      return <PianoSchermataSviluppo variante="variabile" />;
    case 'piano-2-variabile-nomi-lunghi':
      return <PianoSchermataSviluppo variante="variabile-nomi-lunghi" />;
    case 'piano-3-in-elaborazione':
      return <PianoSchermataSviluppo variante="in-elaborazione" />;
    case 'piano-caricamento':
      return <PianoSchermataSviluppo variante="caricamento" />;
    case 'piano-errore':
      return <PianoSchermataSviluppo variante="errore" />;
    case 'piano-senza-rete':
      return <PianoSchermataSviluppo variante="senza-rete" />;
    case 'piano-senza-rete-copia':
      return <PianoSchermataSviluppo variante="senza-rete-copia" />;
    case 'piano-1.1-indicazioni':
      return <PianoSchermataSviluppo variante="indicazioni" />;
    case 'piano-reale':
      return <PianoRealeSviluppo cosa="piano" />;
    case 'piano-reale-indicazioni':
      return <PianoRealeSviluppo cosa="indicazioni" />;
    case 'piano-lettura':
      return <PianoSviluppo />;
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
