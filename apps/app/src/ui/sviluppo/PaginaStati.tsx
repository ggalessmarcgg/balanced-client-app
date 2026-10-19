import { Link } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Profilo } from '@/core/stato/stato';
import { NotificaBreve } from '@/ui/NotificaBreve';
import { SchermataAccesso, type VarianteAccesso } from '@/ui/schermate/SchermataAccesso';
import { SchermataRecupero } from '@/ui/schermate/SchermataRecupero';
import { SchermataAbbonato, SchermataSegnapostoPrenotazione } from '@/ui/schermate/SchermateSegnaposto';
import { SchermataAccountNonCollegato, SchermataConsulenzaNonSvolta, SchermataPercorsoConcluso, SchermataPercorsoNonAttivo } from '@/ui/schermate/SchermateStato';
import { SchermataCaricamento, SchermataErroreCaricamento, SchermataSenzaConnessione } from '@/ui/schermate/SchermateTrasversali';
import { colori, margine, spazio, testi, tocco } from '@/ui/theme';

// Pagina di sviluppo "Stati" (rotta protetta da __DEV__): ogni schermata dello step 3 con dati finti, per i
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
  ['J', 'J · Abbonato (segnaposto con barra di navigazione)'],
  ['K', 'K · Stati 7 · Percorso concluso (558:4260)'],
  ['L', 'L · Stati 11 · Account non collegato (558:4316)'],
  ['caricamento', 'Trasversali 2 · Caricamento (563:4751)'],
  ['senza-connessione', 'Trasversali 1 · Senza connessione (563:4517)'],
  ['errore-caricamento', 'Trasversali 3 · Errore di caricamento (563:4978)'],
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
      return <SchermataAbbonato nome={PROFILO.nome} onEsci={nulla} />;
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
