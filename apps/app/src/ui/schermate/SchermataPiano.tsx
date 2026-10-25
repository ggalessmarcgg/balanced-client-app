import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import Reanimated, {
  Easing,
  runOnJS,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import type { PianoComposto, RigaPiano } from "@/core/piano/composizione";
import {
  giornoPreselezionato,
  pastoPreselezionato,
} from "@/core/piano/preselezione";
import type { StatoPannello } from "@/core/sostituzione/pannello";
import type { AzioniSostituzione, NotificaPiano } from "@/servizi/useSostituzione";
import { AvvisoConnessione } from "@/ui/AvvisoConnessione";
import { AzioneTesto } from "@/ui/AzioneTesto";
import type { VoceNavigazione } from "@/ui/BarraNavigazione";
import { BarraSuperiore } from "@/ui/BarraSuperiore";
import { GruppoRighe, PieDiPaginaPiano, RigaDelPiano } from "@/ui/piano/ContenutoPiano";
import { PannelloSostituzione } from "@/ui/piano/PannelloSostituzione";
import { SelettoreSegmentato } from "@/ui/piano/SelettoreSegmentato";
import { TRANSIZIONI, useRiduciMovimento } from "@/ui/riduciMovimento";
import { NotificaInBasso } from "@/ui/schermate/NotificaInBasso";
import { Pagina } from "@/ui/schermate/Pagina";
import {
  BarraNavigazioneFissa,
  INGOMBRO_BARRA_NAVIGAZIONE,
  SchermataErroreCaricamento,
  SchermataSenzaConnessione,
} from "@/ui/schermate/SchermateTrasversali";
import { Segnaposto } from "@/ui/Segnaposto";
import { Testo } from "@/ui/Testo";
import { colori, margine, raggio, spazio } from "@/ui/theme";
import { Tutorial, useRiquadroTutorial, type MisuraNellaFinestra } from "@/ui/Tutorial";

export type FasePiano =
  | { tipo: "caricamento" }
  | { tipo: "rete" | "errore"; onRiprova: () => void }
  | { tipo: "pronto"; piano: PianoComposto | null; daCache: boolean };

/** Pannello "Sostituisci" (step 9): stato e azioni dall'hook useSostituzione; "La tua nutrizionista" chiude e apre il menu. */
export type SostituzionePiano = {
  stato: StatoPannello;
  azioni: AzioniSostituzione;
  onNutrizionista: () => void;
};

export type SchermataPianoProps = {
  fase: FasePiano;
  sostituzione?: SostituzionePiano;
  /** Tutorial · 1 (586:5457) sulla prima riga della pagina: attivo alla prima visita con un piano presente. */
  tutorial?: { attivo: boolean; onHoCapito: () => void };
  /** Notifica breve in fondo (Trasversali · 5): "Il piano è stato aggiornato…" dopo riga_non_disponibile. */
  notifica?: NotificaPiano | null;
  onNotificaScomparsa?: () => void;
  /** Istante per la preselezione (giorno di oggi, pasto per fascia oraria); predefinito adesso. */
  adesso?: Date;
  /** Pagina iniziale forzata (pagina di sviluppo): al posto della preselezione. */
  indiceIniziale?: number;
  onIndicazioni?: () => void;
  onNavigazione?: (voce: VoceNavigazione) => void;
  onNotifiche?: () => void;
  onMenu?: () => void;
  notificheNuove?: boolean;
  revisioneNuova?: boolean;
  sovrapposti?: ReactNode;
};

type Cornice = Pick<
  SchermataPianoProps,
  | "onNavigazione"
  | "onNotifiche"
  | "onMenu"
  | "notificheNuove"
  | "revisioneNuova"
  | "sovrapposti"
>;

const TESTO_IN_ELABORAZIONE = {
  titolo: "Piano in elaborazione",
  testo:
    "La tua nutrizionista te lo consegnerà presto. Riceverai una notifica quando il piano è pronto.",
};
const DESCRIZIONE_ERRORE =
  "Non riusciamo a caricare il tuo piano. Riprova tra poco.";
/** Testo del Tutorial · 1 · Piano · sostituzione (Figma 586:5457). */
export const TESTO_TUTORIAL_SOSTITUZIONE =
  "Tocca un alimento per trovare un'alternativa equivalente.";
/** Evidenza del tutorial attorno alla riga (586:5589: 369 × 50 attorno a una riga 353 × 44 → 8 ai lati, 3 sopra e sotto). */
const EVIDENZA = { orizzontale: spazio[8], verticale: 3 };
/** Altezza del selettore (padding 4 + voce 32 + 4), per il segnaposto del caricamento. */
const ALTEZZA_SELETTORE = spazio[4] + spazio[6] + 20 + spazio[6] + spazio[4];

/**
 * Scheda Piano (Figma Piano · 1 fisso 527:2947, · 2 variabile 527:3070, · 3 in elaborazione 527:3174). Barra superiore
 * completa, poi l'intestazione fissa (16 sopra, margini 20, gap 24): riga del titolo "Piano" con "Indicazioni" a
 * destra se il piano ne ha, e il selettore segmentato; sotto, le pagine (giorni del fisso o pasti del variabile) che
 * scorrono in orizzontale con lo scatto alla pagina e in verticale ciascuna per sé, sotto la barra di navigazione.
 * Stati trasversali dentro la stessa struttura (titolo "Piano", barra con Piano attiva).
 */
export function SchermataPiano({
  fase,
  adesso,
  indiceIniziale,
  onIndicazioni,
  sostituzione,
  tutorial,
  notifica,
  onNotificaScomparsa,
  ...cornice
}: SchermataPianoProps) {
  const struttura = {
    barraSuperiore: "completa",
    barraNavigazione: "piano",
    revisioneNuova: cornice.revisioneNuova,
    notificheNuove: cornice.notificheNuove,
  } as const;
  switch (fase.tipo) {
    case "rete":
      return (
        <SchermataSenzaConnessione onRiprova={fase.onRiprova} {...struttura} />
      );
    case "errore":
      return (
        <SchermataErroreCaricamento
          titolo="Piano"
          descrizione={DESCRIZIONE_ERRORE}
          onRiprova={fase.onRiprova}
          {...struttura}
        />
      );
    case "caricamento":
      return <Caricamento {...cornice} />;
    case "pronto":
      return fase.piano ? (
        <PianoPronto
          piano={fase.piano}
          daCache={fase.daCache}
          adesso={adesso}
          indiceIniziale={indiceIniziale}
          onIndicazioni={onIndicazioni}
          sostituzione={sostituzione}
          tutorial={tutorial}
          notifica={notifica}
          onNotificaScomparsa={onNotificaScomparsa}
          {...cornice}
        />
      ) : (
        <InElaborazione {...cornice} />
      );
  }
}

function Impalcatura({
  children,
  scorrevole,
  onNavigazione,
  onNotifiche,
  onMenu,
  notificheNuove = false,
  revisioneNuova = false,
  sovrapposti,
}: Cornice & { children: ReactNode; scorrevole: boolean }) {
  return (
    <Pagina
      scorrevole={scorrevole}
      sovrapposti={
        <>
          <BarraNavigazioneFissa
            attiva="piano"
            revisioneNuova={revisioneNuova}
            onSeleziona={onNavigazione}
          />
          {sovrapposti}
        </>
      }
    >
      <BarraSuperiore
        notifiche={notificheNuove ? "conNuove" : "campanella"}
        onNotifiche={onNotifiche}
        onAzione={onMenu}
      />
      {children}
    </Pagina>
  );
}

function Titolo({
  conIndicazioni = false,
  onIndicazioni,
}: {
  conIndicazioni?: boolean;
  onIndicazioni?: () => void;
}) {
  return (
    <View style={stili.rigaTitolo}>
      <Testo
        stile="accentoSerif"
        style={stili.titolo}
        accessibilityRole="header"
      >
        Piano
      </Testo>
      {conIndicazioni && (
        <AzioneTesto etichetta="Indicazioni" onPress={onIndicazioni} />
      )}
    </View>
  );
}

/** Caricamento sulla forma della pagina: titolo, selettore e righe come segnaposti (Trasversali · 2, 563:4751). */
function Caricamento(cornice: Cornice) {
  return (
    <Impalcatura scorrevole={false} {...cornice}>
      <View style={stili.intestazione}>
        <Titolo />
        <Segnaposto
          altezza={ALTEZZA_SELETTORE}
          righe={[]}
          style={stili.segnapostoSelettore}
        />
      </View>
      <View style={stili.contenutoCaricamento}>
        <Segnaposto altezza={230} />
        <Segnaposto altezza={130} />
        <Segnaposto altezza={240} />
      </View>
    </Impalcatura>
  );
}

/** Piano · 3 (527:3174): titolo, poi la card sfondo/card (padding 32, gap 16) con Heading e Body details attenuato; contenuto con gap 16. */
function InElaborazione(cornice: Cornice) {
  return (
    <Impalcatura scorrevole {...cornice}>
      <View style={stili.contenutoInElaborazione}>
        <Titolo />
        <View style={stili.card}>
          <Testo stile="heading" accessibilityRole="header">
            {TESTO_IN_ELABORAZIONE.titolo}
          </Testo>
          <Testo stile="bodyDetails" colore={colori.testo.attenuato}>
            {TESTO_IN_ELABORAZIONE.testo}
          </Testo>
        </View>
      </View>
    </Impalcatura>
  );
}

type Pagine = {
  chiave: string;
  etichetta: string;
  gruppi: { chiave: string; titolo: string; righe: RigaPiano[] }[];
}[];

/** Le pagine del selettore: un giorno del fisso (pasti → righe) o un pasto del variabile (categorie → righe). */
function pagineDi(piano: PianoComposto): Pagine {
  if (piano.tipo === "fisso")
    return piano.giorni.map((g) => ({
      chiave: `g${g.indice}`,
      etichetta: g.iniziale,
      gruppi: g.pasti.map((p) => ({
        chiave: p.id,
        titolo: p.nome,
        righe: p.righe,
      })),
    }));
  return piano.pasti.map((p) => ({
    chiave: p.id,
    etichetta: p.nomeBreve,
    gruppi: p.gruppi.map((g) => ({
      chiave: g.categoria,
      titolo: g.etichetta,
      righe: g.righe,
    })),
  }));
}

function indicePreselezionato(piano: PianoComposto, adesso: Date): number {
  if (piano.tipo === "fisso") {
    const giorno = giornoPreselezionato(piano.giorni, adesso);
    return Math.max(
      0,
      piano.giorni.findIndex((g) => g === giorno),
    );
  }
  const pasto = pastoPreselezionato(piano.pasti, adesso);
  return Math.max(
    0,
    piano.pasti.findIndex((p) => p === pasto),
  );
}

function PianoPronto({
  piano,
  daCache,
  adesso,
  indiceIniziale,
  onIndicazioni,
  sostituzione,
  tutorial,
  notifica,
  onNotificaScomparsa,
  sovrapposti,
  ...cornice
}: Cornice &
  Pick<
    SchermataPianoProps,
    "sostituzione" | "tutorial" | "notifica" | "onNotificaScomparsa"
  > & {
    piano: PianoComposto;
    daCache: boolean;
    adesso?: Date;
    indiceIniziale?: number;
    onIndicazioni?: () => void;
  }) {
  const pagine = pagineDi(piano);
  const { width: larghezza } = useWindowDimensions();
  const riduci = useRiduciMovimento();
  const [indiceScelto, setIndice] = useState(() =>
    Math.min(
      pagine.length - 1,
      indiceIniziale ?? indicePreselezionato(piano, adesso ?? new Date()),
    ),
  );
  // Una versione nuova del piano con meno pagine: l'indice resta nei limiti.
  const indice = Math.max(0, Math.min(indiceScelto, pagine.length - 1));
  const [scorrimentoIniziale] = useState(() => ({
    x: indice * larghezza,
    y: 0,
  }));
  const posizione = useSharedValue(indice);
  const trascinando = useSharedValue(false);
  const riferimento = useAnimatedRef<Reanimated.ScrollView>();
  const durata = riduci ? 0 : TRANSIZIONI.tacchetteMs;

  /* eslint-disable react-hooks/immutability -- gli shared value di Reanimated si aggiornano assegnando .value */
  const vaiA = useCallback(
    (i: number) => {
      setIndice(i);
      posizione.value = withTiming(i, {
        duration: durata,
        easing: Easing.out(Easing.ease),
      });
      riferimento.current?.scrollTo({
        x: i * larghezza,
        y: 0,
        animated: !riduci,
      });
    },
    [posizione, riferimento, larghezza, durata, riduci],
  );

  // Mentre si trascina l'evidenza segue il dito; alla fine dello scorrimento si assesta sulla pagina (300 ms ease-out,
  // senza scorrimento con "Riduci movimento"). Lo scorrimento programmato dal tocco non ridisegna la posizione.
  const onScroll = useAnimatedScrollHandler({
    onBeginDrag: () => {
      trascinando.value = true;
    },
    onScroll: (e) => {
      if (trascinando.value && larghezza > 0)
        posizione.value = e.contentOffset.x / larghezza;
    },
    onMomentumEnd: (e) => {
      trascinando.value = false;
      const i = Math.max(
        0,
        Math.min(pagine.length - 1, Math.round(e.contentOffset.x / larghezza)),
      );
      posizione.value = withTiming(i, {
        duration: durata,
        easing: Easing.out(Easing.ease),
      });
      runOnJS(setIndice)(i);
    },
  });
  /* eslint-enable react-hooks/immutability */

  // Tocco su una riga: apre il pannello "Sostituisci" sulla riga (solo righe con id; le altre non sono toccabili).
  const { azioni: azioniSostituzione } = sostituzione ?? {};
  const onRiga = useCallback(
    (riga: RigaPiano) => {
      if (riga.id !== null) azioniSostituzione?.apri({ id: riga.id, testo: riga.testo });
    },
    [azioniSostituzione],
  );

  // Tutorial · 1: la prima riga della pagina corrente, misurata nella finestra. Le pagine stanno in uno scorrimento
  // orizzontale: l'ascissa misurata può portarsi dietro lo scorrimento, mentre la riga parte sempre dal margine di
  // pagina e occupa tutta la larghezza, quindi si prendono dalla misura solo ordinata e altezza.
  const tutorialAttivo = Boolean(tutorial?.attivo) && (sostituzione?.stato.tipo ?? "chiuso") === "chiuso";
  const misura = useRiquadroTutorial(tutorialAttivo);
  const { collegaMisura } = misura;
  useEffect(() => {
    const misuratore: MisuraNellaFinestra = (vista, esito) =>
      vista.measureInWindow((_x, y, _w, altezza) =>
        esito({ x: margine.pagina, y, larghezza: larghezza - 2 * margine.pagina, altezza }),
      );
    collegaMisura(misuratore);
    return () => collegaMisura(null);
  }, [collegaMisura, larghezza]);
  const primaRiga = pagine[indice]?.gruppi[0]?.righe[0] ?? null;
  const riquadroEvidenza = misura.riquadro
    ? {
        x: misura.riquadro.x - EVIDENZA.orizzontale,
        y: misura.riquadro.y - EVIDENZA.verticale,
        larghezza: misura.riquadro.larghezza + 2 * EVIDENZA.orizzontale,
        altezza: misura.riquadro.altezza + 2 * EVIDENZA.verticale,
      }
    : null;

  return (
    <Impalcatura
      scorrevole={false}
      sovrapposti={
        <>
          {sostituzione && (
            <PannelloSostituzione
              stato={sostituzione.stato}
              azioni={sostituzione.azioni}
              onNutrizionista={sostituzione.onNutrizionista}
            />
          )}
          {notifica && (
            <NotificaInBasso
              key={notifica.chiave}
              testo={notifica.testo}
              tipo={notifica.tipo}
              onScomparsa={onNotificaScomparsa}
              sopra={INGOMBRO_BARRA_NAVIGAZIONE}
            />
          )}
          {tutorial && tutorialAttivo && primaRiga && (
            <Tutorial
              riquadro={riquadroEvidenza}
              elemento={
                <View style={stili.evidenza}>
                  <RigaDelPiano riga={primaRiga} />
                </View>
              }
              testo={TESTO_TUTORIAL_SOSTITUZIONE}
              onHoCapito={tutorial.onHoCapito}
              disposizione="sottoASinistra"
            />
          )}
          {sovrapposti}
        </>
      }
      {...cornice}
    >
      <View style={stili.intestazione}>
        {daCache && <AvvisoConnessione posizione="nelContenuto" />}
        <Titolo
          conIndicazioni={piano.indicazioni.length > 0}
          onIndicazioni={onIndicazioni}
        />
        <SelettoreSegmentato
          voci={pagine.map((p) => p.etichetta)}
          posizione={posizione}
          indice={indice}
          onSeleziona={vaiA}
        />
      </View>
      <Reanimated.ScrollView
        ref={riferimento}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentOffset={scorrimentoIniziale}
        style={stili.pagine}
      >
        {pagine.map((pagina) => (
          <ScrollView
            key={pagina.chiave}
            style={{ width: larghezza }}
            contentContainerStyle={stili.contenutoPagina}
            showsVerticalScrollIndicator={false}
          >
            <View style={stili.gruppi}>
              {pagina.gruppi.map((g, gi) => (
                <GruppoRighe
                  key={g.chiave}
                  titolo={g.titolo}
                  righe={g.righe}
                  onRiga={sostituzione ? onRiga : undefined}
                  misuraPrimaRiga={
                    tutorialAttivo && gi === 0 && pagina === pagine[indice]
                      ? { ref: misura.ref, onLayout: misura.onLayout }
                      : undefined
                  }
                />
              ))}
            </View>
            {piano.aggiornatoIl && (
              <PieDiPaginaPiano testo={piano.aggiornatoIl} />
            )}
          </ScrollView>
        ))}
      </Reanimated.ScrollView>
    </Impalcatura>
  );
}

const stili = StyleSheet.create({
  intestazione: {
    paddingTop: spazio[16],
    paddingHorizontal: margine.pagina,
    gap: spazio[24],
  },
  rigaTitolo: {
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    gap: spazio[12],
  },
  titolo: { flex: 1 },
  segnapostoSelettore: { borderRadius: raggio.pieno, padding: 0 },
  contenutoCaricamento: {
    paddingTop: spazio[24],
    paddingHorizontal: margine.pagina,
    gap: spazio[12],
  },
  contenutoInElaborazione: {
    paddingTop: spazio[16],
    paddingHorizontal: margine.pagina,
    paddingBottom: INGOMBRO_BARRA_NAVIGAZIONE + spazio[16],
    gap: spazio[16],
  },
  card: {
    alignSelf: "stretch",
    padding: spazio[32],
    gap: spazio[16],
    borderRadius: raggio.card,
    backgroundColor: colori.sfondo.card,
  },
  pagine: { flex: 1 },
  // Evidenza del tutorial (586:5589): fondo sfondo/pagina con raggio piccolo attorno alla riga ricopiata sopra il velo.
  evidenza: {
    flex: 1,
    paddingHorizontal: EVIDENZA.orizzontale,
    paddingVertical: EVIDENZA.verticale,
    borderRadius: raggio.piccolo,
    backgroundColor: colori.sfondo.pagina,
  },
  contenutoPagina: {
    paddingTop: spazio[24],
    paddingHorizontal: margine.pagina,
    paddingBottom: INGOMBRO_BARRA_NAVIGAZIONE + spazio[16],
    gap: spazio[24],
  },
  gruppi: { alignSelf: "stretch", gap: spazio[24] },
});
