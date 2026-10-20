import { useMemo, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, View } from 'react-native';

import { etichettaData } from '@/core/diario/data';
import { riassuntoGiornata, type GiornataLocale } from '@/core/diario/giornata';
import { BLOCCHI, TITOLI_BLOCCHI, type Blocco, type Diario, type Pasto } from '@/core/diario/modello';
import type { CommentoPannello, StatoPannello } from '@/servizi/usePannelloGiornata';
import { useAreaToccabile } from '@/ui/areaToccabile';
import { BloccoCommento, BloccoPasti, BloccoSport, BloccoValori } from '@/ui/diario/Blocchi';
import { CardCommento } from '@/ui/diario/CardCommento';
import { ComandiDiario } from '@/ui/diario/CardDiario';
import { IndicatoreAvanzamento } from '@/ui/diario/IndicatoreAvanzamento';
import { TransizioneBlocco } from '@/ui/diario/TransizioneBlocco';
import { ErroreCaricamento } from '@/ui/ErroreCaricamento';
import { Icona } from '@/ui/icone';
import { PannelloDalBasso } from '@/ui/PannelloDalBasso';
import { Segnaposto } from '@/ui/Segnaposto';
import { Testo } from '@/ui/Testo';
import { colori, opacita, raggio, spazio } from '@/ui/theme';

export type PannelloGiornataProps = {
  pannello: StatoPannello | null;
  onChiudi: () => void;
  onRiprova: () => void;
  onModifica: () => void;
  onChiudiModifica: () => void;
  onAvanti: () => void;
  onIndietro: () => void;
  onVaiA: (blocco: Blocco) => void;
  onAggiorna: (diario: Diario) => void;
  /** Solo per la pagina di sviluppo: pannello già a schermo pieno e pasto aperto nella modifica. */
  schermoPieno?: boolean;
  pastoApertoIniziale?: Pasto | null;
};

/**
 * Pannello della giornata (Figma 474:1430, 475:1337, 475:1409, 475:1459): si apre dal basso toccando un giorno
 * condiviso della Card settimana, si porta a schermo pieno trascinando la maniglia; "Modifica" riapre i passaggi del
 * diario dentro il pannello, a schermo pieno, con "Chiudi" / "Avanti" fissi in fondo (coperti dalla tastiera quando è
 * aperta, come ogni piede dell'app). Va passato a Pagina tra i `sovrapposti`, sopra la barra di navigazione.
 */
export function PannelloGiornata({
  pannello,
  onChiudi,
  onRiprova,
  onModifica,
  onChiudiModifica,
  onAvanti,
  onIndietro,
  onVaiA,
  onAggiorna,
  schermoPieno = false,
  pastoApertoIniziale = null,
}: PannelloGiornataProps) {
  // Il pannello resta montato durante l'animazione di chiusura: si tiene l'ultimo stato mostrato.
  const [ultimo, setUltimo] = useState(pannello);
  if (pannello && pannello !== ultimo) setUltimo(pannello);
  const mostrato = pannello ?? ultimo;
  const inModifica = mostrato?.modifica !== null && mostrato?.modifica !== undefined && mostrato.fase.tipo === 'pronto';
  return (
    <PannelloDalBasso
      aperto={pannello !== null}
      onChiudi={onChiudi}
      etichetta={mostrato ? (inModifica ? `Modifica la giornata, ${etichettaData(mostrato.data)}` : `Giornata di ${etichettaData(mostrato.data)}`) : undefined}
      espandibile
      pieno={inModifica || schermoPieno}
      piede={mostrato && inModifica ? <ComandiDiario onChiudi={onChiudiModifica} onAvanti={mostrato.modifica === 'commento' ? undefined : onAvanti} /> : undefined}
    >
      {mostrato && (mostrato.fase.tipo === 'pronto' && mostrato.modifica ? (
        <ModificaGiornata
          data={mostrato.data}
          giornata={mostrato.fase.giornata}
          blocco={mostrato.modifica}
          onAvanti={onAvanti}
          onIndietro={onIndietro}
          onVaiA={onVaiA}
          onAggiorna={onAggiorna}
          pastoApertoIniziale={pastoApertoIniziale}
        />
      ) : (
        <ContenutoGiornata pannello={mostrato} onModifica={onModifica} onRiprova={onRiprova} />
      ))}
    </PannelloDalBasso>
  );
}

/** Riassunto (titolo H2, Card commento, "La tua giornata" con "Modifica"), oppure caricamento / errore dentro il pannello. */
function ContenutoGiornata({ pannello, onModifica, onRiprova }: { pannello: StatoPannello; onModifica: () => void; onRiprova: () => void }) {
  const titolo = (
    <Testo stile="h2" accessibilityRole="header">
      {etichettaData(pannello.data)}
    </Testo>
  );
  switch (pannello.fase.tipo) {
    case 'caricamento':
      return (
        <>
          {titolo}
          <Segnaposto altezza={ALTEZZA_SEGNAPOSTO_COMMENTO} />
          <Segnaposto altezza={ALTEZZA_SEGNAPOSTO_GIORNATA} />
        </>
      );
    case 'rete':
    case 'errore':
      return (
        <>
          {titolo}
          <ErroreCaricamento
            descrizione={pannello.fase.tipo === 'rete' ? 'Sei offline: non riusciamo a caricare la giornata. Controlla la connessione e riprova.' : 'Non riusciamo a caricare la giornata. Riprova tra poco.'}
            onRiprova={onRiprova}
          />
        </>
      );
    case 'pronto':
      return (
        <>
          {titolo}
          {pannello.fase.commento && <Commento commento={pannello.fase.commento} />}
          <LaTuaGiornata giornata={pannello.fase.giornata} onModifica={onModifica} />
        </>
      );
  }
}

function Commento({ commento }: { commento: CommentoPannello }) {
  return <CardCommento testo={commento.testo} autore={commento.autore} nuovo={commento.nuovo} />;
}

// "La tua giornata" (Figma 474:1547): intestazione Heading con "Modifica" (Link al 60 % + Icona 20 Matita, gap 4) e
// sezioni con gap 12; ogni sezione Etichetta piccola + Body details con gap 2; i valori come etichette su sfondo/card
// (raggio piccolo, padding 8 / 12, gap 8, a capo se non entrano).
function LaTuaGiornata({ giornata, onModifica }: { giornata: GiornataLocale; onModifica: () => void }) {
  const sezioni = riassuntoGiornata(giornata.diario);
  const { hitSlop, onLayout } = useAreaToccabile();
  return (
    <View style={stili.giornata}>
      <View style={stili.intestazione}>
        <Testo stile="heading" accessibilityRole="header">
          La tua giornata
        </Testo>
        <Pressable
          onPress={onModifica}
          hitSlop={hitSlop}
          onLayout={onLayout}
          style={({ pressed }) => [stili.modifica, pressed && stili.premuto]}
          accessibilityRole="button"
          accessibilityLabel="Modifica"
          accessibilityHint="Riapre i passaggi del diario per questa giornata"
        >
          <Testo stile="link" colore={colori.testo.secondario}>
            Modifica
          </Testo>
          <Icona misura={20} nome="Matita" />
        </Pressable>
      </View>
      {sezioni.length === 0 && (
        <Testo stile="bodyDetails" colore={colori.testo.secondario}>
          Hai condiviso la giornata senza scrivere nulla.
        </Testo>
      )}
      {sezioni.map((s) =>
        s.tipo === 'testo' ? (
          <View key={s.titolo} style={stili.sezione} accessible accessibilityLabel={`${s.titolo}: ${s.testo}`}>
            <Testo stile="etichettaPiccola">{s.titolo}</Testo>
            <Testo stile="bodyDetails">{s.testo}</Testo>
          </View>
        ) : (
          <View key={s.titolo} style={stili.sezioneValori} accessible accessibilityLabel={`${s.titolo}: ${s.valori.join(', ')}`}>
            <Testo stile="etichettaPiccola">{s.titolo}</Testo>
            <View style={stili.valori}>
              {s.valori.map((v) => (
                <View key={v} style={stili.valore}>
                  <Testo stile="bodyDetails">{v}</Testo>
                </View>
              ))}
            </View>
          </View>
        ),
      )}
    </View>
  );
}

type ModificaGiornataProps = {
  data: string;
  giornata: GiornataLocale;
  blocco: Blocco;
  onAvanti: () => void;
  onIndietro: () => void;
  onVaiA: (blocco: Blocco) => void;
  onAggiorna: (diario: Diario) => void;
  pastoApertoIniziale: Pasto | null;
};

/**
 * Modifica della giornata (Figma 475:1459): titolo H2 "Modifica la giornata" con la data in Body details al 60 % (gap 4),
 * indicatore di avanzamento, poi lo stesso blocco del diario di oggi (senza "Invia alla nutrizionista": la giornata
 * resta condivisa). Scorrimento orizzontale tra i blocchi come nella Card diario.
 */
function ModificaGiornata({ data, giornata, blocco, onAvanti, onIndietro, onVaiA, onAggiorna, pastoApertoIniziale }: ModificaGiornataProps) {
  const [pastoAperto, setPastoAperto] = useState<Pasto | null>(pastoApertoIniziale);
  const [bloccoPrecedente, setBloccoPrecedente] = useState(blocco);
  if (blocco !== bloccoPrecedente) {
    setBloccoPrecedente(blocco);
    if (blocco !== 'pasti') setPastoAperto(null);
  }
  const scorrimento = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > SOGLIA_INIZIO && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
        onPanResponderTerminationRequest: () => false,
        onPanResponderRelease: (_, g) => {
          if (g.dx < -SOGLIA_CAMBIO || g.vx < -VELOCITA_CAMBIO) onAvanti();
          else if (g.dx > SOGLIA_CAMBIO || g.vx > VELOCITA_CAMBIO) onIndietro();
        },
      }),
    [onAvanti, onIndietro],
  );
  const diario = giornata.diario;
  return (
    <View style={stili.modificaContenuto} {...scorrimento.panHandlers}>
      <View style={stili.titoloModifica}>
        <Testo stile="h2" accessibilityRole="header">
          Modifica la giornata
        </Testo>
        <Testo stile="bodyDetails" colore={colori.testo.secondario}>
          {etichettaData(data)}
        </Testo>
      </View>
      <IndicatoreAvanzamento
        attivo={BLOCCHI.indexOf(blocco)}
        passi={BLOCCHI.length}
        etichette={BLOCCHI.map((b) => TITOLI_BLOCCHI[b])}
        onSeleziona={(i) => {
          const scelto = BLOCCHI[i];
          if (scelto) onVaiA(scelto);
        }}
      />
      <TransizioneBlocco indice={BLOCCHI.indexOf(blocco)}>
        {blocco === 'pasti' && <BloccoPasti diario={diario} onChange={onAggiorna} pastoAperto={pastoAperto} onApri={setPastoAperto} nelPannello />}
        {blocco === 'valori' && <BloccoValori diario={diario} onChange={onAggiorna} nelPannello />}
        {blocco === 'sport' && <BloccoSport diario={diario} onChange={onAggiorna} nelPannello />}
        {blocco === 'commento' && <BloccoCommento diario={diario} onChange={onAggiorna} nelPannello />}
      </TransizioneBlocco>
    </View>
  );
}

// Scorrimento: parte oltre 16 pt in orizzontale; cambia blocco oltre 60 pt o con un gesto veloce (come la Card diario).
const SOGLIA_INIZIO = 16;
const SOGLIA_CAMBIO = 60;
const VELOCITA_CAMBIO = 0.5;
const ALTEZZA_SEGNAPOSTO_COMMENTO = 160;
const ALTEZZA_SEGNAPOSTO_GIORNATA = 120;

const stili = StyleSheet.create({
  giornata: { alignSelf: 'stretch', gap: spazio[12] },
  intestazione: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modifica: { flexDirection: 'row', alignItems: 'center', gap: spazio[4] },
  premuto: { opacity: opacita.pulsantePremuto },
  sezione: { alignSelf: 'stretch', gap: spazio[2] },
  sezioneValori: { alignSelf: 'stretch', gap: spazio[8] },
  valori: { alignSelf: 'stretch', flexDirection: 'row', flexWrap: 'wrap', gap: spazio[8] },
  valore: { paddingVertical: spazio[8], paddingHorizontal: spazio[12], backgroundColor: colori.sfondo.card, borderRadius: raggio.piccolo },
  modificaContenuto: { alignSelf: 'stretch', gap: spazio[20] },
  titoloModifica: { alignSelf: 'stretch', gap: spazio[4] },
});
