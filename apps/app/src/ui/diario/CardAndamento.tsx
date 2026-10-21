import { StyleSheet, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

import { CATEGORIE_ANDAMENTO, ETICHETTE_ASSE, GRADINI, TITOLI_ANDAMENTO, type AndamentoSettimana, type CategoriaAndamento, type GiornoAndamento, type StatoColonna } from '@/core/diario/andamento';
import { etichettaData } from '@/core/diario/data';
import { CardSfumata } from '@/ui/diario/CardDiario';
import { Icona } from '@/ui/icone';
import { Testo } from '@/ui/Testo';
import { colori, opacita, raggio, spazio } from '@/ui/theme';

// Card andamento (Figma 479:334): padding 32 / 24 (con i dati) o 32 (pochi dati), gap 16; intestazione con icona a 20
// e titolo App/Etichetta; grafico centrato: asse largo 44 con le etichette in Caption al 50 % centrate nelle quattro
// fasce da 30, sette colonne da 24 con gap 4 e la lettera del giorno sotto (gap 6); linee guida a 120/90/60/30 larghe
// 192, 12 a sinistra della prima colonna; altezza massima 120 e gradini di 30.
const COLONNA = { larghezza: 24, altezza: 120 };
const GRADINO = COLONNA.altezza / GRADINI;
const ASSE = 44;
const LINEE = { sinistra: ASSE + spazio[4] - 12, larghezza: 192, spessore: 1 };
const TRATTINO = 4;
// Contorni tratteggiati (letti da Figma): giorno non condiviso tratto 1 nero al 30 % con tratteggio 2/2;
// oggi da condividere tratto 1,5 nel colore della categoria al 50 % con tratteggio 4/3. Tratto interno al rettangolo.
const NON_CONDIVISO = { tratto: 1, tratteggio: '2 2' };
const DA_CONDIVIDERE = { tratto: 1.5, tratteggio: '4 3' };

const COLORE: Record<CategoriaAndamento, string> = { energia: colori.grafico.energia, idratazione: colori.grafico.idratazione, sport: colori.grafico.sport };

export const TESTO_POCHI_DATI = 'Registra un valore dal diario per vedere il tuo andamento.';

export type CardAndamentoProps = {
  categoria: CategoriaAndamento;
  /** I sette giorni della settimana; assenti nello stato "Pochi dati". */
  giorni?: GiornoAndamento[];
};

/** Una card dell'andamento: Energia (icona Energia), Idratazione (Goccia), Sport (Argomento · Movimento, i pesi). */
export function CardAndamento({ categoria, giorni }: CardAndamentoProps) {
  const pochiDati = giorni === undefined;
  return (
    <View style={[stili.card, pochiDati ? stili.cardPochiDati : stili.cardDati]} accessibilityRole="summary" accessibilityLabel={`${TITOLI_ANDAMENTO[categoria]}: ${descrizione(categoria, giorni)}`}>
      <View style={stili.intestazione}>
        {categoria === 'energia' && <Icona misura={24} nome="Energia" dimensione={20} />}
        {categoria === 'idratazione' && <Icona misura={24} nome="Goccia" dimensione={20} />}
        {categoria === 'sport' && <Icona misura={20} nome="Argomento · Movimento" />}
        <Testo stile="etichetta">{TITOLI_ANDAMENTO[categoria]}</Testo>
      </View>
      {giorni ? (
        <View style={stili.grafico}>
          <View style={stili.area}>
            <View style={stili.linee} pointerEvents="none">
              {Array.from({ length: GRADINI }, (_, i) => (
                <View key={i} style={[stili.linea, { top: i * GRADINO }]} />
              ))}
            </View>
            <View style={stili.asse}>
              {ETICHETTE_ASSE[categoria].map((etichetta, i) => (
                <View key={i} style={stili.fascia}>
                  <Testo stile="caption" colore={colori.testo.terziario} style={stili.etichettaAsse}>
                    {etichetta}
                  </Testo>
                </View>
              ))}
            </View>
            {giorni.map((g) => (
              <View key={g.data} style={stili.giorno}>
                <View style={stili.spazioColonna}>
                  <Colonna stato={g.colonna} colore={COLORE[categoria]} />
                </View>
                <Testo stile="caption" colore={g.futuro ? colori.testo.futuro : colori.testo.secondario}>
                  {g.iniziale}
                </Testo>
              </View>
            ))}
          </View>
        </View>
      ) : (
        <Testo stile="bodyDetails" colore={colori.testo.secondario}>
          {TESTO_POCHI_DATI}
        </Testo>
      )}
    </View>
  );
}

function Colonna({ stato, colore }: { stato: StatoColonna; colore: string }) {
  switch (stato.tipo) {
    case 'vuoto':
      return null;
    case 'valore':
      return <View style={[stili.colonna, { height: stato.gradino * GRADINO, backgroundColor: colore }]} />;
    case 'riposo':
      return <View style={[stili.colonna, { height: TRATTINO, backgroundColor: colore }]} />;
    case 'nonCondiviso':
      return <Tratteggiato altezza={TRATTINO} colore={colori.testo.primario} opacita={opacita.giornoNonCondiviso} tratto={NON_CONDIVISO.tratto} tratteggio={NON_CONDIVISO.tratteggio} />;
    case 'riposoDaCondividere':
      return <Tratteggiato altezza={TRATTINO} colore={colore} opacita={opacita.oggiDaCondividere} tratto={DA_CONDIVIDERE.tratto} tratteggio={DA_CONDIVIDERE.tratteggio} />;
    case 'daCondividere':
      return <Tratteggiato altezza={stato.gradino * GRADINO} colore={colore} opacita={opacita.oggiDaCondividere} tratto={DA_CONDIVIDERE.tratto} tratteggio={DA_CONDIVIDERE.tratteggio} />;
  }
}

/** Contorno tratteggiato a pillola (raggio pieno), tratto interno come in Figma: il rettangolo si rientra di metà tratto. */
function Tratteggiato({ altezza, colore, opacita: alfa, tratto, tratteggio }: { altezza: number; colore: string; opacita: number; tratto: number; tratteggio: string }) {
  const meta = tratto / 2;
  const r = Math.min(COLONNA.larghezza, altezza) / 2 - meta;
  return (
    <View style={[stili.colonna, { height: altezza, opacity: alfa }]}>
      <Svg width={COLONNA.larghezza} height={altezza}>
        <Rect x={meta} y={meta} width={COLONNA.larghezza - tratto} height={altezza - tratto} rx={r} ry={r} fill="none" stroke={colore} strokeWidth={tratto} strokeDasharray={tratteggio} />
      </Svg>
    </View>
  );
}

const DESCRIZIONE_COLONNA: Record<StatoColonna['tipo'], string> = {
  valore: 'livello',
  daCondividere: 'oggi da condividere, livello',
  riposo: 'riposo',
  riposoDaCondividere: 'oggi riposo, da condividere',
  nonCondiviso: 'non condiviso',
  vuoto: 'nessun valore',
};

function descrizione(categoria: CategoriaAndamento, giorni: GiornoAndamento[] | undefined): string {
  if (!giorni) return TESTO_POCHI_DATI;
  const livelli = [...ETICHETTE_ASSE[categoria]].reverse();
  return giorni
    .filter((g) => !g.futuro)
    .map((g) => `${etichettaData(g.data)} ${DESCRIZIONE_COLONNA[g.colonna.tipo]}${'gradino' in g.colonna ? ` ${livelli[g.colonna.gradino - 1] ?? ''}` : ''}`)
    .join(', ');
}

/**
 * Andamento della settimana sulla pagina Oggi (Figma 479:1908 / 479:2100): le tre card dentro una card con la
 * sfumatura del diario, padding 32 e gap 8. Con almeno un valore nella settimana i tre grafici (una categoria senza
 * valori resta con le sole etichette e linee guida); senza alcun valore, le tre card "Pochi dati".
 */
export function SezioneAndamento({ andamento }: { andamento: AndamentoSettimana }) {
  return (
    <CardSfumata style={stili.sezione}>
      {CATEGORIE_ANDAMENTO.map((categoria) => (
        <CardAndamento key={categoria} categoria={categoria} giorni={andamento.conValori ? andamento.categorie[categoria] : undefined} />
      ))}
    </CardSfumata>
  );
}

const stili = StyleSheet.create({
  sezione: { gap: spazio[8] },
  card: { alignSelf: 'stretch', backgroundColor: colori.sfondo.card, borderRadius: raggio.card, gap: spazio[16] },
  cardDati: { paddingVertical: spazio[32], paddingHorizontal: spazio[24] },
  cardPochiDati: { padding: spazio[32] },
  intestazione: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: spazio[8] },
  grafico: { alignSelf: 'stretch', flexDirection: 'row', justifyContent: 'center' },
  area: { flexDirection: 'row', alignItems: 'flex-start', gap: spazio[4] },
  linee: { position: 'absolute', left: LINEE.sinistra, top: 0, width: LINEE.larghezza, height: COLONNA.altezza },
  linea: { position: 'absolute', left: 0, width: LINEE.larghezza, height: LINEE.spessore, backgroundColor: colori.linea.guida },
  asse: { width: ASSE, height: COLONNA.altezza },
  fascia: { height: GRADINO, justifyContent: 'center' },
  etichettaAsse: { textAlign: 'center' },
  giorno: { width: COLONNA.larghezza, alignItems: 'center', gap: spazio[6] },
  spazioColonna: { width: COLONNA.larghezza, height: COLONNA.altezza, justifyContent: 'flex-end', overflow: 'hidden' },
  colonna: { width: COLONNA.larghezza, borderRadius: raggio.pieno },
});
