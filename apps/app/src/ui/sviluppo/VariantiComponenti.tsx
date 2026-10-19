import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AvvisoConnessione } from '@/ui/AvvisoConnessione';
import { BarraNavigazione, type VoceNavigazione } from '@/ui/BarraNavigazione';
import { BarraSuperiore } from '@/ui/BarraSuperiore';
import { CampoPassword } from '@/ui/CampoPassword';
import { CampoTesto, type StatoCampo } from '@/ui/CampoTesto';
import { ErroreCaricamento } from '@/ui/ErroreCaricamento';
import { Intestazione } from '@/ui/Intestazione';
import { Logo } from '@/ui/Logo';
import { Messaggio } from '@/ui/Messaggio';
import { NotificaBreve } from '@/ui/NotificaBreve';
import { Opzione } from '@/ui/Opzione';
import { Foglio, PannelloDalBasso } from '@/ui/PannelloDalBasso';
import { Pulsante, type LivelloPulsante, type StatoPulsante } from '@/ui/Pulsante';
import { RigaElenco } from '@/ui/RigaElenco';
import { Segnaposto } from '@/ui/Segnaposto';
import { Separatore } from '@/ui/Separatore';
import { Testo } from '@/ui/Testo';
import { colori, margine, opacita, spazio } from '@/ui/theme';

// Catalogo delle varianti dei componenti del lotto 2, nello stesso ordine dei set Figma: lo usano la
// pagina dei componenti (con le didascalie) e la rotta di confronto (solo i componenti, per lo screenshot).

/** larghezza: numero = larghezza del componente Figma; 'schermo' = componente largo quanto lo schermo (393 in Figma), senza margini di pagina. */
export type Variante = { nome: string; figma?: string; elemento: ReactNode; larghezza?: number | 'schermo' };
export type GruppoVarianti = { titolo: string; figma: string; varianti: Variante[] };

export const COMPONENTI = [
  // lotto 2
  'Pulsante',
  'Campo di testo',
  'Campo password',
  'Messaggio',
  'Intestazione',
  'Logo',
  'Barra superiore',
  'Opzione',
  'Riga elenco',
  'Separatore',
  // lotto 3
  'Barra di navigazione',
  'Notifica breve',
  'Avviso connessione',
  'Segnaposto',
  'Errore di caricamento',
  'Pannello dal basso',
] as const;
export type NomeComponente = (typeof COMPONENTI)[number];

const LIVELLI: { nome: string; livello: LivelloPulsante }[] = [
  { nome: 'Primario', livello: 'primario' },
  { nome: 'Secondario', livello: 'secondario' },
  { nome: 'Terziario', livello: 'terziario' },
];
const STATI: { nome: string; stato: StatoPulsante }[] = [
  { nome: 'Normale', stato: 'normale' },
  { nome: 'Premuto', stato: 'premuto' },
  { nome: 'Disabilitato', stato: 'disabilitato' },
  { nome: 'Caricamento', stato: 'caricamento' },
];
const STATI_CAMPO: { nome: string; stato: StatoCampo; valore: string; messaggio?: string }[] = [
  { nome: 'Vuoto', stato: 'vuoto', valore: '' },
  { nome: 'Attivo', stato: 'attivo', valore: 'nome@email.it' },
  { nome: 'Compilato', stato: 'compilato', valore: 'nome@email.it' },
  { nome: 'Errore', stato: 'errore', valore: 'nome@email.it', messaggio: 'Inserisci un indirizzo email valido' },
  { nome: 'Disabilitato', stato: 'disabilitato', valore: '' },
];
const NOTIFICHE = [
  { nome: 'Campanella', notifiche: 'campanella' },
  { nome: 'Con nuove', notifiche: 'conNuove' },
  { nome: 'Nascosta', notifiche: 'nascosta' },
] as const;
const AZIONI = [
  { nome: 'Menu', azione: 'menu' },
  { nome: 'Chiudi', azione: 'chiudi' },
  { nome: 'Nascosta', azione: 'nascosta' },
] as const;
const FORME = [
  { nome: 'Standard', forma: 'standard' },
  { nome: 'Compatta', forma: 'compatta' },
  { nome: 'Su più righe', forma: 'suPiuRighe' },
] as const;

const nulla = () => {};

const VOCI_NAV: { nome: string; voce: VoceNavigazione }[] = [
  { nome: 'Oggi', voce: 'oggi' },
  { nome: 'Piano', voce: 'piano' },
  { nome: 'Revisioni', voce: 'revisioni' },
  { nome: 'Account', voce: 'account' },
];

export function variantiDi(componente: NomeComponente): GruppoVarianti {
  switch (componente) {
    case 'Pulsante':
      return {
        titolo: 'Pulsante',
        figma: '418:62',
        varianti: [
          ...LIVELLI.flatMap((l) =>
            STATI.map((s) => ({
              nome: `${l.nome} · ${s.nome}`,
              elemento: <Pulsante etichetta="Accedi" livello={l.livello} stato={s.stato} onPress={nulla} />,
            })),
          ),
          { nome: 'Terziario compatto · Normale', elemento: <Pulsante etichetta="Accedi" livello="terziarioCompatto" onPress={nulla} /> },
          {
            nome: 'Terziario compatto evidenziato · Normale',
            elemento: <Pulsante etichetta="Accedi" livello="terziarioCompattoEvidenziato" onPress={nulla} />,
          },
        ],
      };
    case 'Campo di testo':
      return {
        titolo: 'Campo di testo',
        figma: '418:182',
        varianti: STATI_CAMPO.map((s) => ({
          nome: s.nome,
          elemento: <CampoTesto etichetta="Email" valore={s.valore} segnaposto="nome@email.it" stato={s.stato} messaggio={s.messaggio} keyboardType="email-address" />,
        })),
      };
    case 'Campo password':
      return {
        titolo: 'Campo password',
        figma: '418:250',
        varianti: STATI_CAMPO.map((s) => ({
          nome: s.nome,
          elemento: (
            <CampoPassword
              etichetta="Password"
              valore={s.valore ? '••••••••••' : ''}
              segnaposto="La tua password"
              stato={s.stato}
              messaggio={s.messaggio && 'Password non corretta'}
            />
          ),
        })),
      };
    case 'Messaggio':
      return {
        titolo: 'Messaggio',
        figma: '419:104',
        varianti: [
          { nome: 'Errore', elemento: <Messaggio tipo="errore" testo="Email o password non corrette. Riprova." /> },
          { nome: 'Info', elemento: <Messaggio tipo="info" testo="Email o password non corrette. Riprova." /> },
        ],
      };
    case 'Intestazione':
      return {
        titolo: 'Intestazione',
        figma: '638:416',
        varianti: [
          { nome: 'App', elemento: <Intestazione titolo="Recupera password" contesto="app" onIndietro={nulla} /> },
          { nome: 'Accesso', elemento: <Intestazione titolo="Recupera password" contesto="accesso" onIndietro={nulla} /> },
        ],
      };
    case 'Logo':
      return { titolo: 'Logo', figma: '625:254', varianti: [{ nome: 'Logo', elemento: <Logo etichetta="Balanced" /> }] };
    case 'Barra superiore':
      return {
        titolo: 'Barra superiore',
        figma: '625:382',
        varianti: NOTIFICHE.flatMap((n) =>
          AZIONI.map((a) => ({
            nome: `Notifiche ${n.nome} · Azione ${a.nome}`,
            elemento: <BarraSuperiore notifiche={n.notifiche} azione={a.azione} onNotifiche={nulla} onAzione={nulla} />,
            larghezza: 'schermo' as const,
          })),
        ),
      };
    case 'Opzione':
      return {
        titolo: 'Opzione',
        figma: '439:96',
        varianti: FORME.flatMap((f) => [
          { nome: `${f.nome} · Non selezionata`, elemento: <Opzione etichetta="Buona" forma={f.forma} selezionata={false} onPress={nulla} /> },
          { nome: `${f.nome} · Selezionata`, elemento: <Opzione etichetta="Buona" forma={f.forma} selezionata onPress={nulla} /> },
        ]),
      };
    case 'Riga elenco':
      return {
        titolo: 'Riga elenco',
        figma: '498:220',
        varianti: [
          { nome: 'Freccia', elemento: <RigaElenco tipo="freccia" etichetta="Informativa privacy" onPress={nulla} />, larghezza: 305 },
          { nome: 'Interruttore', elemento: <RigaElenco tipo="interruttore" etichetta="Informativa privacy" acceso onChange={nulla} />, larghezza: 305 },
          { nome: 'Valore', elemento: <RigaElenco tipo="valore" etichetta="Informativa privacy" valore="6 mesi" />, larghezza: 305 },
          { nome: 'Copia', elemento: <RigaElenco tipo="copia" etichetta="Informativa privacy" onPress={nulla} />, larghezza: 305 },
          {
            nome: 'Freccia con icona',
            elemento: <RigaElenco tipo="frecciaConIcona" icona="Account" etichetta="Informativa privacy" onPress={nulla} />,
            larghezza: 305,
          },
          {
            nome: 'Due righe',
            elemento: (
              <RigaElenco
                tipo="dueRighe"
                titolo="Revisione 12 · 2 ottobre"
                sottotitolo="Una settimana molto regolare: colazioni proteiche e cena leggera quasi ogni sera."
                onPress={nulla}
              />
            ),
            larghezza: 305,
          },
          {
            nome: 'Con avatar',
            elemento: <RigaElenco tipo="conAvatar" etichetta="La tua nutrizionista" nome="Dott.ssa Margherita Chiadò" onPress={nulla} />,
            larghezza: 353,
          },
          {
            nome: 'Notifica',
            elemento: (
              <RigaElenco tipo="notifica" titolo="Nuovo commento sul tuo diario" testo="Margherita ha commentato la tua giornata di giovedì." ora="Oggi, 09:12" />
            ),
            larghezza: 353,
          },
        ],
      };
    case 'Separatore':
      return { titolo: 'Separatore', figma: '625:383', varianti: [{ nome: 'Separatore', elemento: <Separatore /> }] };
    case 'Barra di navigazione':
      return {
        titolo: 'Barra di navigazione',
        figma: '493:368',
        varianti: [
          ...VOCI_NAV.map((v) => ({
            nome: `Attiva ${v.nome}`,
            elemento: <ConfrontoVetro attiva={v.voce} />,
            larghezza: 'schermo' as const,
          })),
          {
            nome: 'Attiva Oggi · Revisione nuova',
            elemento: <ConfrontoVetro attiva="oggi" revisioneNuova />,
            larghezza: 'schermo' as const,
          },
        ],
      };
    case 'Notifica breve':
      return {
        titolo: 'Notifica breve',
        figma: '563:293',
        varianti: [
          { nome: 'Conferma', elemento: <NotificaBreve tipo="conferma" testo="Ricetta salvata" /> },
          { nome: 'Errore', elemento: <NotificaBreve tipo="errore" testo="Ricetta salvata" onRiprova={nulla} /> },
        ],
      };
    case 'Avviso connessione':
      return {
        titolo: 'Avviso connessione',
        figma: '638:410',
        varianti: [
          { nome: 'Fluttuante', elemento: <AvvisoConnessione posizione="fluttuante" /> },
          { nome: 'Nel contenuto', elemento: <AvvisoConnessione posizione="nelContenuto" /> },
        ],
      };
    case 'Segnaposto':
      return { titolo: 'Segnaposto', figma: '563:308', varianti: [{ nome: 'Segnaposto (pulsa 100 → 50 → 100 % in 2 s)', elemento: <Segnaposto /> }] };
    case 'Errore di caricamento':
      return { titolo: 'Errore di caricamento', figma: '563:294', varianti: [{ nome: 'Errore di caricamento', elemento: <ErroreCaricamento onRiprova={nulla} /> }] };
    case 'Pannello dal basso':
      return {
        titolo: 'Pannello dal basso',
        figma: '474:1430 (schermata Giornate 2)',
        varianti: [
          { nome: 'Pannello aperto (anteprima statica: velo e foglio)', elemento: <AnteprimaPannello />, larghezza: 'schermo' as const },
          { nome: 'Pannello vero (modale, chiusura con velo o trascinamento)', elemento: <ProvaPannello /> },
        ],
      };
  }
}

// Barra a tutta larghezza (353 come in Figma) su un fondo a strisce e testo, così si vede cosa c'è sotto il vetro.
function ConfrontoVetro({ attiva, revisioneNuova }: { attiva: VoceNavigazione; revisioneNuova?: boolean }) {
  return (
    <View style={stili.fondoVetro}>
      <View style={stili.strisce}>
        <View style={[stili.striscia, stili.strisciaScura]} />
        <View style={stili.strisciaTesto}>
          <Testo stile="bodyLarge">Testo che scorre sotto la barra di navigazione</Testo>
        </View>
        <View style={[stili.striscia, stili.strisciaVerde]} />
      </View>
      <BarraNavigazione attiva={attiva} revisioneNuova={revisioneNuova} onSeleziona={nulla} />
    </View>
  );
}

const CONTENUTO_PANNELLO = (
  <>
    <Testo stile="h2">Giovedì 8 ottobre</Testo>
    <Testo stile="body">Ottima giornata Giulia! Bene la colazione proteica e la camminata serale.</Testo>
  </>
);

// Anteprima statica del pannello: una striscia di pagina con il velo e il foglio appoggiato in fondo.
function AnteprimaPannello() {
  return (
    <View style={stili.anteprimaPannello}>
      <View style={stili.veloAnteprima} />
      <Foglio>{CONTENUTO_PANNELLO}</Foglio>
    </View>
  );
}

function ProvaPannello() {
  const [aperto, setAperto] = useState(false);
  return (
    <>
      <Pulsante etichetta="Apri il pannello" livello="secondario" onPress={() => setAperto(true)} />
      <PannelloDalBasso aperto={aperto} onChiudi={() => setAperto(false)} etichetta="Giornata">
        {CONTENUTO_PANNELLO}
        <Pulsante etichetta="Chiudi" livello="terziario" onPress={() => setAperto(false)} />
      </PannelloDalBasso>
    </>
  );
}

/** Riquadro di una variante: larghezza come il componente Figma (353 se non indicata), su sfondo pagina. */
export function RiquadroVariante({ variante, suCard = false }: { variante: Variante; suCard?: boolean }) {
  const larghezza = variante.larghezza === 'schermo' ? stili.riquadroSchermo : { width: variante.larghezza ?? 353 };
  return <View style={[stili.riquadro, larghezza, suCard && stili.riquadroCard]}>{variante.elemento}</View>;
}

const stili = StyleSheet.create({
  fondoVetro: { alignSelf: 'stretch', gap: spazio[8], paddingVertical: spazio[12], paddingHorizontal: margine.pagina },
  strisce: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, justifyContent: 'space-between' },
  striscia: { height: 20 },
  strisciaScura: { backgroundColor: colori.testo.primario },
  strisciaVerde: { backgroundColor: colori.azione.primaria },
  strisciaTesto: { paddingHorizontal: spazio[4] },
  anteprimaPannello: { alignSelf: 'stretch', backgroundColor: colori.sfondo.pagina },
  veloAnteprima: { height: 240, backgroundColor: colori.testo.primario, opacity: opacita.velo },
  riquadro: { alignItems: 'flex-start' },
  // Annulla i margini di pagina del contenitore: il componente occupa tutta la larghezza dello schermo.
  riquadroSchermo: { alignSelf: 'stretch', marginHorizontal: -margine.pagina },
  riquadroCard: { backgroundColor: colori.sfondo.card, paddingHorizontal: spazio[24] },
});
