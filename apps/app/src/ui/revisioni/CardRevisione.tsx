import { StyleSheet, View } from 'react-native';

import type { AutoreRevisione } from '@/core/revisioni/autore';
import { etichettaDiari, frazioneAvanzamento, titoloRevisione, DIARI_PER_REVISIONE } from '@/core/revisioni/stato';
import { CardSfumata } from '@/ui/diario/CardDiario';
import { FotoProfilo } from '@/ui/FotoProfilo';
import { Pulsante } from '@/ui/Pulsante';
import { Testo } from '@/ui/Testo';
import { colori, raggio, spazio } from '@/ui/theme';

export type CardRevisioneProps =
  | { stato: 'inizia' | 'daSbloccare'; numero: number; diari: number; primaRevisione: boolean }
  | { stato: 'inElaborazione'; numero: number; diari: number }
  | { stato: 'nuova'; numero: number; autore: AutoreRevisione | null; anteprima: string; onLeggi: () => void };

export const TESTO_PRIMA_REVISIONE =
  'Ogni 7 diari condivisi la tua nutrizionista ti scrive una revisione: cosa sta funzionando, cosa collega come ti senti e la tua alimentazione, e qualche consiglio per la settimana successiva.';
export const TESTO_IN_ELABORAZIONE = 'Ricevi una notifica appena la tua nutrizionista ha scritto la revisione.';

const ETICHETTE = { inizia: 'Inizia', daSbloccare: 'Da sbloccare', inElaborazione: 'In elaborazione', nuova: 'Nuova' } as const;

// Card revisione (Figma 496:2350): padding 32, gap 24, raggio card; Inizia / Da sbloccare / Prima revisione su
// sfondo/card, In elaborazione e Nuova con la sfumatura App/Gradiente card diario. Riga del titolo (Etichetta) con il
// badge a destra: pallino 8 + Caption al 70 % con gap 4. Pallino: badge/sfondo con alone sfumato (Inizia, Da
// sbloccare), azione/primaria (In elaborazione), stato/notifica (Nuova). Barra: 4 di altezza, linea/avanzamento,
// riempimento azione/primaria; sopra "N diari" / "7 diari" in Caption al 60 %. Nuova: foto 40 + nome (gap 8),
// anteprima Body, Pulsante primario "Leggi la revisione".
const PALLINO = 8;
const SFOCATURA_PALLINO = 3.2;
const BARRA = 4;
const FOTO = 40;
const RIGHE_ANTEPRIMA = 4;

/** Avanzamento della revisione in corso o revisione Nuova da leggere. */
export function CardRevisione(props: CardRevisioneProps) {
  const titolo = titoloRevisione(props.numero);
  if (props.stato === 'nuova') {
    const nome = props.autore?.nome;
    return (
      <CardSfumata style={stili.contenuto}>
        <Intestazione titolo={titolo} stato="nuova" />
        <View style={stili.corpoNuova}>
          <View style={stili.autore}>
            <FotoProfilo misura={FOTO} foto={props.autore?.foto} iniziali={props.autore?.iniziali} fotoPronta={props.autore?.fotoPronta} />
            {nome && (
              <Testo stile="etichetta" style={stili.nome} numberOfLines={1}>
                {nome}
              </Testo>
            )}
          </View>
          {props.anteprima ? (
            <Testo stile="body" numberOfLines={RIGHE_ANTEPRIMA}>
              {props.anteprima}
            </Testo>
          ) : null}
        </View>
        <Pulsante etichetta="Leggi la revisione" onPress={props.onLeggi} accessibilityHint={`Apre la ${titolo.toLowerCase()}`} />
      </CardSfumata>
    );
  }
  const testo = props.stato === 'inElaborazione' ? TESTO_IN_ELABORAZIONE : props.primaRevisione ? TESTO_PRIMA_REVISIONE : null;
  const interno = (
    <>
      <View style={stili.avanzamento}>
        <Intestazione titolo={titolo} stato={props.stato} />
        <View style={stili.barra} accessible accessibilityRole="progressbar" accessibilityLabel={`${etichettaDiari(props.diari)} su ${DIARI_PER_REVISIONE}`} accessibilityValue={{ min: 0, max: DIARI_PER_REVISIONE, now: props.diari }}>
          <View style={stili.contatori}>
            <Testo stile="caption" colore={colori.testo.secondario}>
              {etichettaDiari(props.diari)}
            </Testo>
            <Testo stile="caption" colore={colori.testo.secondario}>
              {etichettaDiari(DIARI_PER_REVISIONE)}
            </Testo>
          </View>
          <View style={stili.traccia}>
            <View style={[stili.riempimento, { width: `${frazioneAvanzamento(props.diari) * 100}%` }]} />
          </View>
        </View>
      </View>
      {testo && (
        <Testo stile="bodyDetails" colore={colori.testo.attenuato}>
          {testo}
        </Testo>
      )}
    </>
  );
  if (props.stato === 'inElaborazione') return <CardSfumata style={stili.contenuto}>{interno}</CardSfumata>;
  return <View style={[stili.card, stili.contenuto]}>{interno}</View>;
}

function Intestazione({ titolo, stato }: { titolo: string; stato: keyof typeof ETICHETTE }) {
  return (
    <View style={stili.intestazione}>
      <Testo stile="etichetta" accessibilityRole="header">
        {titolo}
      </Testo>
      <View style={stili.badge} accessible accessibilityLabel={ETICHETTE[stato]}>
        <View style={[stili.pallino, stili[`pallino_${stato}`]]} />
        <Testo stile="caption" colore={colori.testo.attenuato}>
          {ETICHETTE[stato]}
        </Testo>
      </View>
    </View>
  );
}

const PALLINO_ALONE = {
  backgroundColor: colori.badge.sfondo,
  shadowColor: colori.badge.sfondo,
  shadowOpacity: 1,
  shadowRadius: SFOCATURA_PALLINO,
  shadowOffset: { width: 0, height: 0 },
  elevation: 2,
} as const;

const stili = StyleSheet.create({
  card: { alignSelf: 'stretch', padding: spazio[32], borderRadius: raggio.card, backgroundColor: colori.sfondo.card, overflow: 'hidden' },
  contenuto: { gap: spazio[24] },
  avanzamento: { alignSelf: 'stretch', gap: spazio[12] },
  intestazione: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spazio[8] },
  badge: { flexDirection: 'row', alignItems: 'center', gap: spazio[4] },
  pallino: { width: PALLINO, height: PALLINO, borderRadius: raggio.pieno },
  pallino_inizia: PALLINO_ALONE,
  pallino_daSbloccare: PALLINO_ALONE,
  pallino_inElaborazione: { backgroundColor: colori.azione.primaria },
  pallino_nuova: { backgroundColor: colori.stato.notifica },
  barra: { alignSelf: 'stretch', gap: spazio[4] },
  contatori: { alignSelf: 'stretch', flexDirection: 'row', justifyContent: 'space-between' },
  traccia: { alignSelf: 'stretch', height: BARRA, borderRadius: raggio.pieno, backgroundColor: colori.linea.avanzamento, overflow: 'hidden' },
  riempimento: { height: BARRA, borderRadius: raggio.pieno, backgroundColor: colori.azione.primaria },
  corpoNuova: { alignSelf: 'stretch', gap: spazio[12] },
  autore: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: spazio[8] },
  nome: { flex: 1 },
});
