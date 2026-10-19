import { Link } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Profilo } from '@/core/stato/stato';
import { NotificaBreve } from '@/ui/NotificaBreve';
import { NotificaInBasso } from '@/ui/schermate/NotificaInBasso';
import { SchermataAccesso, type VarianteAccesso } from '@/ui/schermate/SchermataAccesso';
import { SchermataRecupero } from '@/ui/schermate/SchermataRecupero';
import { SchermataRaccontaSegnaposto, SchermataSegnapostoPrenotazione } from '@/ui/schermate/SchermateSegnaposto';
import { SchermataAccountNonCollegato, SchermataConsulenzaNonSvolta, SchermataPercorsoConcluso, SchermataPercorsoNonAttivo } from '@/ui/schermate/SchermateStato';
import { SchermataCaricamento, SchermataErroreCaricamento, SchermataSenzaConnessione } from '@/ui/schermate/SchermateTrasversali';
import { OggiSviluppo } from '@/ui/sviluppo/OggiSviluppo';
import { colori, margine, spazio, testi, tocco } from '@/ui/theme';

// Pagina di sviluppo "Stati" (rotta protetta da __DEV__): ogni schermata degli step 3 e 5 con dati finti, per i
// confronti con Figma senza accedere. /sviluppo/stati?stato=<chiave> mostra la sola schermata a tutto schermo.

export const STATI_SVILUPPO = [
  ['login', 'Accesso · Login (425:224)'],
  ['login-errore', 'Accesso · Login con errore (425:252)'],
  ['email-non-confermata', 'Accesso · Email non confermata (562:4254)'],
  ['link-inviato', 'Accesso · Email non confermata · link inviato (562:4319)'],
  ['recupero', 'Accesso · Recupero password · Email (425:286)'],
  ['notifica', 'Login con Notifica breve · conferma (563:5122)'],
  ['C', 'C · Consulenza da confermare (segnaposto)'],
  ['D', 'D · Orario passato senza conferma (segnaposto)'],
  ['E', 'E · Orario non più disponibile (segnaposto)'],
  ['F', 'F · Prenotato, prima della consulenza (segnaposto)'],
  ['G', 'G · Appena prenotata (segnaposto)'],
  ['H', 'H · Stati 6 · Percorso non ancora attivo (558:4206)'],
  ['I', 'I · Stati 12 · Consulenza non svolta (562:4195)'],
  ['J', 'J · Oggi · 1 · Diario da iniziare (444:1103)'],
  ['oggi-2-pasti', 'Oggi · 2 · Diario aperto · Pasti (444:1539)'],
  ['oggi-3-valori', 'Oggi · 3 · Diario aperto · Valori (444:2624)'],
  ['oggi-4-sport', 'Oggi · 4 · Diario aperto · Sport (444:2962)'],
  ['oggi-5-commento', 'Oggi · 5 · Diario aperto · Commento (444:3247)'],
  ['oggi-6-bozza', 'Oggi · 6 · Diario in bozza (446:3703)'],
  ['oggi-7-condiviso', 'Oggi · 7 · Diario condiviso (446:3777)'],
  ['oggi-errore-salvataggio', 'Oggi in bozza con Notifica breve di errore (salvataggio non riuscito, Riprova)'],
  ['oggi-condiviso-notifica', 'Oggi condiviso con Notifica breve di conferma'],
  ['racconta', 'Racconta (segnaposto fino allo step 10)'],
  ['K', 'K · Stati 7 · Percorso concluso (558:4260)'],
  ['L', 'L · Stati 11 · Account non collegato (558:4316)'],
  ['caricamento', "Caricamento all'avvio (senza barra di navigazione)"],
  ['senza-connessione', "Senza connessione all'avvio (senza barra)"],
  ['errore-caricamento', "Errore di caricamento all'avvio (senza barra)"],
  ['caricamento-abbonato', 'Trasversali 2 · Caricamento nell app dell abbonato (563:4751)'],
  ['senza-connessione-abbonato', 'Trasversali 1 · Senza connessione nell app dell abbonato (563:4517)'],
  ['errore-caricamento-abbonato', 'Trasversali 3 · Errore di caricamento nell app dell abbonato (563:4978)'],
  ['copia-contatto', 'H con Notifica breve dopo la copia di un contatto'],
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

function Accesso({ variante, password = '••••••••••', notifica = false }: { variante: VarianteAccesso; password?: string; notifica?: boolean }) {
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
    case 'oggi-3-valori':
      return <OggiSviluppo scenario="valori" />;
    case 'oggi-4-sport':
      return <OggiSviluppo scenario="sport" />;
    case 'oggi-5-commento':
      return <OggiSviluppo scenario="commento" />;
    case 'oggi-6-bozza':
      return <OggiSviluppo scenario="bozza" />;
    case 'oggi-7-condiviso':
      return <OggiSviluppo scenario="condiviso" />;
    case 'oggi-errore-salvataggio':
      return <OggiSviluppo scenario="erroreSalvataggio" />;
    case 'oggi-condiviso-notifica':
      return <OggiSviluppo scenario="condivisoNotifica" />;
    case 'racconta':
      return <SchermataRaccontaSegnaposto onIndietro={nulla} />;
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
