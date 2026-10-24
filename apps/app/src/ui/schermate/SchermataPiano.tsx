import { useCallback, useState, type ReactNode } from "react";
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
import { AvvisoConnessione } from "@/ui/AvvisoConnessione";
import { AzioneTesto } from "@/ui/AzioneTesto";
import type { VoceNavigazione } from "@/ui/BarraNavigazione";
import { BarraSuperiore } from "@/ui/BarraSuperiore";
import { GruppoRighe, PieDiPaginaPiano } from "@/ui/piano/ContenutoPiano";
import { SelettoreSegmentato } from "@/ui/piano/SelettoreSegmentato";
import { TRANSIZIONI, useRiduciMovimento } from "@/ui/riduciMovimento";
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

export type FasePiano =
  | { tipo: "caricamento" }
  | { tipo: "rete" | "errore"; onRiprova: () => void }
  | { tipo: "pronto"; piano: PianoComposto | null; daCache: boolean };

export type SchermataPianoProps = {
  fase: FasePiano;
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
  ...cornice
}: Cornice & {
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

  return (
    <Impalcatura scorrevole={false} {...cornice}>
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
              {pagina.gruppi.map((g) => (
                <GruppoRighe key={g.chiave} titolo={g.titolo} righe={g.righe} />
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
  contenutoPagina: {
    paddingTop: spazio[24],
    paddingHorizontal: margine.pagina,
    paddingBottom: INGOMBRO_BARRA_NAVIGAZIONE + spazio[16],
    gap: spazio[24],
  },
  gruppi: { alignSelf: "stretch", gap: spazio[24] },
});
