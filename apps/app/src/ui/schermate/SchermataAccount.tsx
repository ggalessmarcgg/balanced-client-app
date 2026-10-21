import { Fragment, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { TESTI_ACCOUNT, type Abbonamento, type Promemoria } from '@/core/account/account';
import { SUPPORTO } from '@/core/accesso/costanti';
import { BarraSuperiore } from '@/ui/BarraSuperiore';
import { CardNutrizionista } from '@/ui/CardNutrizionista';
import { Pulsante } from '@/ui/Pulsante';
import { RigaElenco } from '@/ui/RigaElenco';
import { Pagina } from '@/ui/schermate/Pagina';
import { BarraNavigazioneFissa, INGOMBRO_BARRA_NAVIGAZIONE } from '@/ui/schermate/SchermateTrasversali';
import { Segnaposto } from '@/ui/Segnaposto';
import { Separatore } from '@/ui/Separatore';
import { Testo } from '@/ui/Testo';
import { colori, gradienti, margine, raggio, spazio } from '@/ui/theme';

export type FaseAbbonamento = { tipo: 'caricamento' } | { tipo: 'pronto'; abbonamento: Abbonamento | null };

export type SchermataAccountProps = {
  nomeCompleto: string;
  iniziali: string;
  email: string;
  giornateCondivise: number;
  revisioniRicevute: number;
  nutrizionista: { nome: string; foto: string | null } | null;
  promemoria: Promemoria;
  abbonamento: FaseAbbonamento;
  versione: string;
  /** Pallino sulla campanella (notifiche non ancora viste). */
  notificheNuove?: boolean;
  /** Pallino sulla voce Revisioni della barra. */
  revisioneNuova?: boolean;
  /** Barra di navigazione: solo per l'abbonato (stato J); dagli altri stati l'Account si apre senza barra. */
  conBarra?: boolean;
  onPromemoria: (campo: keyof Promemoria, valore: boolean) => void;
  onNutrizionista?: () => void;
  onEmailSupporto?: () => void;
  onTelefonoSupporto?: () => void;
  onPrivacy?: () => void;
  onTermini?: () => void;
  onElimina?: () => void;
  onEsci: () => void;
  onNotifiche?: () => void;
  onMenu?: () => void;
  onIndietro?: () => void;
  sovrapposti?: ReactNode;
};

// Account · 1 (Figma 499:2145): barra superiore completa; contenuto 16 sopra, margini 20, gap 24, 120 sotto (barra).
// Profilo: iniziali in un cerchio 64 sfondo/campo (H2), nome Heading, email Body details al 60 %. Statistiche: due
// card 80 di altezza, padding 16, raggio foto, sfumatura card → campo al 30 % (App/Gradiente card diario). Card
// Notifiche / Abbonamento / Supporto / Privacy: padding 32, gap 12, titolo Etichetta, righe separate. In fondo
// "Esci" e la versione (Caption al 50 %), come nel Menu (Figma 499:2623).
const INIZIALI = 64;
const ALTEZZA_STATISTICA = 80;

export function SchermataAccount(props: SchermataAccountProps) {
  const { conBarra = true, revisioneNuova = false, notificheNuove = false, sovrapposti } = props;
  return (
    <Pagina
      sovrapposti={
        <>
          {conBarra && <BarraNavigazioneFissa attiva="account" revisioneNuova={revisioneNuova} />}
          {sovrapposti}
        </>
      }
    >
      {conBarra ? (
        <BarraSuperiore notifiche={notificheNuove ? 'conNuove' : 'campanella'} onNotifiche={props.onNotifiche} onAzione={props.onMenu} />
      ) : (
        // Dagli stati H e K (senza percorso attivo): niente campanella né menu, la X torna alla schermata dello stato.
        <BarraSuperiore notifiche="nascosta" azione="chiudi" onAzione={props.onIndietro} />
      )}
      <View style={[stili.contenuto, conBarra && stili.sopraLaBarra]}>
        <Testo stile="accentoSerif" accessibilityRole="header">
          Account
        </Testo>
        <View style={stili.profilo} accessible accessibilityLabel={`${props.nomeCompleto}, ${props.email}`}>
          <View style={stili.cerchio}>
            <Testo stile="h2">{props.iniziali}</Testo>
          </View>
          <View style={stili.testiProfilo}>
            <Testo stile="heading">{props.nomeCompleto}</Testo>
            {props.email ? (
              <Testo stile="bodyDetails" colore={colori.testo.secondario}>
                {props.email}
              </Testo>
            ) : null}
          </View>
        </View>
        <View style={stili.blocchi}>
          <View style={stili.statistiche}>
            <Statistica valore={props.giornateCondivise} etichetta={TESTI_ACCOUNT.giornateCondivise} />
            <Statistica valore={props.revisioniRicevute} etichetta={TESTI_ACCOUNT.revisioniRicevute} />
          </View>
          {props.nutrizionista && <CardNutrizionista nome={props.nutrizionista.nome} foto={props.nutrizionista.foto} onPress={props.onNutrizionista} />}
          <Card titolo={TESTI_ACCOUNT.notifiche}>
            <Righe>
              <RigaElenco tipo="interruttore" etichetta={TESTI_ACCOUNT.promemoriaDiario} acceso={props.promemoria.diario} onChange={(v) => props.onPromemoria('diario', v)} />
              <RigaElenco tipo="interruttore" etichetta={TESTI_ACCOUNT.promemoriaWeekend} acceso={props.promemoria.weekend} disabilitato={!props.promemoria.diario} onChange={(v) => props.onPromemoria('weekend', v)} />
            </Righe>
          </Card>
          <Card titolo={TESTI_ACCOUNT.abbonamento}>
            <CardAbbonamento fase={props.abbonamento} />
          </Card>
          <Card titolo={TESTI_ACCOUNT.supporto}>
            <Righe>
              <RigaElenco tipo="copia" etichetta={SUPPORTO.email} onPress={props.onEmailSupporto} />
              <RigaElenco tipo="copia" etichetta={SUPPORTO.telefono} onPress={props.onTelefonoSupporto} />
            </Righe>
          </Card>
          <Card titolo={TESTI_ACCOUNT.privacy}>
            <Righe>
              <RigaElenco tipo="freccia" etichetta={TESTI_ACCOUNT.informativa} onPress={props.onPrivacy} />
              <RigaElenco tipo="freccia" etichetta={TESTI_ACCOUNT.termini} onPress={props.onTermini} />
              <RigaElenco tipo="freccia" etichetta={TESTI_ACCOUNT.elimina} onPress={props.onElimina} />
            </Righe>
          </Card>
        </View>
        <View style={stili.uscita}>
          <Pulsante etichetta={TESTI_ACCOUNT.esci} livello="terziario" onPress={props.onEsci} style={stili.centrato} />
          <Testo stile="caption" colore={colori.testo.terziario}>
            {`Versione ${props.versione}`}
          </Testo>
        </View>
      </View>
    </Pagina>
  );
}

function CardAbbonamento({ fase }: { fase: FaseAbbonamento }) {
  if (fase.tipo === 'caricamento') {
    return (
      <View style={stili.righe}>
        <Segnaposto altezza={52} />
        <Segnaposto altezza={52} />
      </View>
    );
  }
  const a = fase.abbonamento;
  if (!a) {
    return (
      <>
        <Righe>
          <RigaElenco tipo="valore" etichetta={TESTI_ACCOUNT.stato} valore={TESTI_ACCOUNT.statoAttivo} />
        </Righe>
        <Testo stile="bodyDetails" colore={colori.testo.secondario}>
          {TESTI_ACCOUNT.senzaAbbonamento}
        </Testo>
      </>
    );
  }
  return (
    <>
      <Righe>
        {a.piano ? <RigaElenco tipo="valore" etichetta={TESTI_ACCOUNT.piano} valore={a.piano} /> : null}
        <RigaElenco tipo="valore" etichetta={TESTI_ACCOUNT.stato} valore={a.stato} />
        {a.rinnovo ? <RigaElenco tipo="valore" etichetta={TESTI_ACCOUNT.rinnovo} valore={a.rinnovo} /> : null}
      </Righe>
      <Testo stile="etichetta">{TESTI_ACCOUNT.modificaTitolo}</Testo>
      <Testo stile="bodyDetails" colore={colori.testo.secondario}>
        {TESTI_ACCOUNT.modificaPrima}
        <Testo stile="etichettaPiccola" colore={colori.testo.secondario} style={stili.emailInLinea}>
          {SUPPORTO.email}
        </Testo>
        {TESTI_ACCOUNT.modificaDopo}
      </Testo>
    </>
  );
}

/** Card crema con titolo Etichetta (Figma 499:2205: padding 32, gap 12). */
function Card({ titolo, children }: { titolo: string; children: ReactNode }) {
  return (
    <View style={stili.card}>
      <Testo stile="etichetta" accessibilityRole="header">
        {titolo}
      </Testo>
      {children}
    </View>
  );
}

/** Righe di una card separate dal Separatore (a cura del contenitore). */
function Righe({ children }: { children: ReactNode }) {
  const figli = Array.isArray(children) ? children.filter(Boolean) : [children];
  return (
    <View style={stili.righe}>
      {figli.map((f, i) => (
        <Fragment key={i}>
          {i > 0 && <Separatore />}
          {f}
        </Fragment>
      ))}
    </View>
  );
}

/** Statistica (Figma 501:2582): numero H2 ed etichetta Body details al 60 % su una card con la sfumatura. */
function Statistica({ valore, etichetta }: { valore: number; etichetta: string }) {
  const [larghezza, setLarghezza] = useState(0);
  const g = gradienti.cardDiario;
  return (
    <View style={stili.statistica} onLayout={(e) => setLarghezza(e.nativeEvent.layout.width)} accessible accessibilityLabel={`${valore} ${etichetta}`}>
      {larghezza > 0 && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants">
          <Svg width={larghezza} height={ALTEZZA_STATISTICA}>
            <Defs>
              <LinearGradient id={`statistica-${etichetta}`} x1={g.inizio.x * larghezza} y1={g.inizio.y * ALTEZZA_STATISTICA} x2={g.fine.x * larghezza} y2={g.fine.y * ALTEZZA_STATISTICA} gradientUnits="userSpaceOnUse">
                {g.tappe.map((t) => (
                  <Stop key={t.posizione} offset={t.posizione} stopColor={t.colore} />
                ))}
              </LinearGradient>
            </Defs>
            <Rect width={larghezza} height={ALTEZZA_STATISTICA} rx={raggio.foto} ry={raggio.foto} fill={`url(#statistica-${etichetta})`} />
          </Svg>
        </View>
      )}
      <Testo stile="h2">{String(valore)}</Testo>
      <Testo stile="bodyDetails" colore={colori.testo.secondario} numberOfLines={1}>
        {etichetta}
      </Testo>
    </View>
  );
}

const stili = StyleSheet.create({
  contenuto: { flex: 1, paddingTop: spazio[16], paddingHorizontal: margine.pagina, paddingBottom: spazio[16], gap: spazio[24] },
  sopraLaBarra: { paddingBottom: INGOMBRO_BARRA_NAVIGAZIONE + spazio[16] },
  profilo: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: spazio[16] },
  cerchio: { width: INIZIALI, height: INIZIALI, borderRadius: raggio.pieno, backgroundColor: colori.sfondo.campo, alignItems: 'center', justifyContent: 'center' },
  testiProfilo: { flex: 1, gap: spazio[2] },
  blocchi: { alignSelf: 'stretch', gap: spazio[12] },
  statistiche: { alignSelf: 'stretch', flexDirection: 'row', gap: spazio[12] },
  statistica: { flex: 1, height: ALTEZZA_STATISTICA, padding: spazio[16], gap: spazio[2], borderRadius: raggio.foto, overflow: 'hidden' },
  card: { alignSelf: 'stretch', padding: spazio[32], gap: spazio[12], backgroundColor: colori.sfondo.card, borderRadius: raggio.card },
  righe: { alignSelf: 'stretch' },
  emailInLinea: { lineHeight: undefined },
  uscita: { alignItems: 'center', gap: spazio[8], paddingVertical: spazio[16] },
  centrato: { alignSelf: 'center' },
});
