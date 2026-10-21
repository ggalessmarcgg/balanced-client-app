import { Fragment, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { CIRCONFERENZE, confrontoCirconferenze, ETICHETTE_CIRCONFERENZE, etichettaBmi, etichettaCm, etichettaDataBreve, etichettaDataMisura, etichettaKg, type DatiMisure } from '@/core/misure/misure';
import { ErroreCaricamento } from '@/ui/ErroreCaricamento';
import { Intestazione } from '@/ui/Intestazione';
import { BarraBmi, GraficoCirconferenze, GraficoPeso, LegendaRadar } from '@/ui/menu/GraficiMisure';
import { SelettoreVista, type Vista } from '@/ui/menu/SelettoreVista';
import { Pagina } from '@/ui/schermate/Pagina';
import { Segnaposto } from '@/ui/Segnaposto';
import { Separatore } from '@/ui/Separatore';
import { Testo } from '@/ui/Testo';
import { colori, margine, raggio, spazio } from '@/ui/theme';

export type SchermataPesoMisureProps = {
  fase: { tipo: 'caricamento' } | { tipo: 'rete' | 'errore'; onRiprova: () => void } | { tipo: 'pronto'; dati: DatiMisure };
  onIndietro: () => void;
  /** Viste iniziali (pagina di sviluppo). */
  vistaIniziale?: Vista;
  sovrapposti?: ReactNode;
};

// Menu · 6 (Figma 525:2846) e 6.1 (525:2930): intestazione 12 sopra; contenuto 20 sopra, margini 20, gap 12, 40
// sotto. Card padding 24: BMI (gap 12: titolo Heading + Body details 60 %, valore H2 + nota, scala Caption + barra);
// Peso e Circonferenze (gap 16: intestazione con il Selettore vista, grafico o tabella).
export function SchermataPesoMisure({ fase, onIndietro, vistaIniziale = 'grafico', sovrapposti }: SchermataPesoMisureProps) {
  const [vistaPeso, setVistaPeso] = useState<Vista>(vistaIniziale);
  const [vistaCirconferenze, setVistaCirconferenze] = useState<Vista>(vistaIniziale);
  return (
    <Pagina scorrevole={false} sovrapposti={sovrapposti}>
      <View style={stili.intestazione}>
        <Intestazione titolo="Peso e misure" onIndietro={onIndietro} />
      </View>
      <ScrollView style={stili.scorrimento} contentContainerStyle={stili.contenuto} showsVerticalScrollIndicator={false}>
        {fase.tipo === 'pronto' ? (
          <Contenuto dati={fase.dati} vistaPeso={vistaPeso} vistaCirconferenze={vistaCirconferenze} onVistaPeso={setVistaPeso} onVistaCirconferenze={setVistaCirconferenze} />
        ) : fase.tipo === 'caricamento' ? (
          <>
            <Segnaposto altezza={180} />
            <Segnaposto altezza={260} />
            <Segnaposto altezza={360} />
          </>
        ) : (
          <View style={stili.errore}>
            <ErroreCaricamento
              descrizione={fase.tipo === 'rete' ? 'Sei offline: non riusciamo a caricare peso e misure. Controlla la connessione e riprova.' : 'Non riusciamo a caricare peso e misure. Riprova tra poco.'}
              onRiprova={fase.onRiprova}
            />
          </View>
        )}
      </ScrollView>
    </Pagina>
  );
}

function Contenuto({ dati, vistaPeso, vistaCirconferenze, onVistaPeso, onVistaCirconferenze }: { dati: DatiMisure; vistaPeso: Vista; vistaCirconferenze: Vista; onVistaPeso: (v: Vista) => void; onVistaCirconferenze: (v: Vista) => void }) {
  const confronto = confrontoCirconferenze(dati.misurazioni);
  const nessunDato = dati.pesi.length === 0 && dati.misurazioni.length === 0;
  if (nessunDato) {
    return (
      <View style={stili.card}>
        <Testo stile="heading" accessibilityRole="header">
          Peso e misure
        </Testo>
        <Testo stile="bodyDetails" colore={colori.testo.secondario}>
          Non ci sono ancora misurazioni: la tua nutrizionista le registra durante le visite.
        </Testo>
      </View>
    );
  }
  return (
    <>
      {dati.bmi !== null && (
        <View style={stili.card}>
          <View style={stili.titoloBmi}>
            <Testo stile="heading" accessibilityRole="header">
              BMI
            </Testo>
            <Testo stile="bodyDetails" colore={colori.testo.secondario}>
              Indice di massa corporea
            </Testo>
          </View>
          <View style={stili.titoloBmi}>
            <Testo stile="h2">{etichettaBmi(dati.bmi)}</Testo>
            <Testo stile="bodyDetails" colore={colori.testo.secondario}>
              {"Calcolato con la tua altezza e l'ultimo peso registrato."}
            </Testo>
          </View>
          <View style={stili.scala}>
            <View style={stili.scalaNumeri}>
              {['19', '25', '29', '39'].map((n) => (
                <Testo key={n} stile="caption">
                  {n}
                </Testo>
              ))}
            </View>
            <BarraBmi bmi={dati.bmi} />
          </View>
        </View>
      )}
      {dati.pesi.length > 0 && (
        <View style={[stili.card, stili.cardGrafico]}>
          <View style={stili.intestazioneCard}>
            <Testo stile="heading" accessibilityRole="header" style={stili.cresce}>
              Peso
            </Testo>
            <SelettoreVista vista={vistaPeso} onChange={onVistaPeso} />
          </View>
          {vistaPeso === 'grafico' ? (
            <>
              <GraficoPeso pesi={dati.pesi} />
              <View style={stili.date}>
                <Testo stile="caption" colore={colori.testo.secondario}>
                  {etichettaDataMisura(dati.pesi[0]?.data ?? '')}
                </Testo>
                {dati.pesi.length > 1 && (
                  <Testo stile="caption" colore={colori.testo.secondario}>
                    {etichettaDataMisura(dati.pesi[dati.pesi.length - 1]?.data ?? '')}
                  </Testo>
                )}
              </View>
            </>
          ) : (
            <View style={stili.tabella}>
              {[...dati.pesi].reverse().map((p, i) => (
                <Fragment key={p.data}>
                  {i > 0 && <Separatore />}
                  <View style={stili.rigaTabella} accessible accessibilityLabel={`${etichettaDataMisura(p.data)}: ${etichettaKg(p.kg)}`}>
                    <Testo stile="body" style={stili.cresce}>
                      {etichettaDataMisura(p.data)}
                    </Testo>
                    <Testo stile={i === 0 ? 'etichetta' : 'body'} colore={colori.testo.secondario}>
                      {etichettaKg(p.kg)}
                    </Testo>
                  </View>
                </Fragment>
              ))}
            </View>
          )}
        </View>
      )}
      {dati.misurazioni.length > 0 && (
        <View style={[stili.card, stili.cardGrafico]}>
          <View style={stili.intestazioneCard}>
            <Testo stile="heading" accessibilityRole="header" style={stili.cresce}>
              Circonferenze
            </Testo>
            {confronto && <SelettoreVista vista={vistaCirconferenze} onChange={onVistaCirconferenze} />}
          </View>
          {confronto && vistaCirconferenze === 'grafico' ? (
            <>
              <GraficoCirconferenze prima={confronto.prima} ultima={confronto.ultima} />
              <LegendaRadar prima={etichettaDataBreve(confronto.prima.data)} ultima={etichettaDataBreve(confronto.ultima.data)} />
            </>
          ) : (
            <TabellaCirconferenze dati={dati} />
          )}
        </View>
      )}
    </>
  );
}

/** Tabella delle circonferenze (Figma 525:2999): intestazione Caption 60 % (Misura · ultima · prima), righe Body con l'ultima in Etichetta e la prima al 60 %, colonne da 70. */
function TabellaCirconferenze({ dati }: { dati: DatiMisure }) {
  const ultima = dati.misurazioni[0];
  const prima = dati.misurazioni.length > 1 ? dati.misurazioni[dati.misurazioni.length - 1] : null;
  if (!ultima) return null;
  const righe = CIRCONFERENZE.filter((c) => ultima.valori[c] !== null || prima?.valori[c] !== null);
  return (
    <View style={stili.tabella}>
      <View style={stili.intestazioneTabella}>
        <Testo stile="caption" colore={colori.testo.secondario} style={stili.cresce}>
          Misura
        </Testo>
        <Testo stile="caption" colore={colori.testo.secondario} style={stili.colonna}>
          {etichettaDataBreve(ultima.data)}
        </Testo>
        {prima && (
          <Testo stile="caption" colore={colori.testo.secondario} style={stili.colonna}>
            {etichettaDataBreve(prima.data)}
          </Testo>
        )}
      </View>
      {righe.map((c) => (
        <Fragment key={c}>
          <Separatore />
          <View style={stili.rigaTabella} accessible accessibilityLabel={`${ETICHETTE_CIRCONFERENZE[c]}: ${ultima.valori[c] !== null ? etichettaCm(ultima.valori[c] as number) : 'non misurata'}${prima && prima.valori[c] !== null ? `, prima ${etichettaCm(prima.valori[c] as number)}` : ''}`}>
            <Testo stile="body" style={stili.cresce}>
              {ETICHETTE_CIRCONFERENZE[c]}
            </Testo>
            <Testo stile="etichetta" style={stili.colonna}>
              {ultima.valori[c] !== null ? etichettaCm(ultima.valori[c] as number) : '–'}
            </Testo>
            {prima && (
              <Testo stile="body" colore={colori.testo.secondario} style={stili.colonna}>
                {prima.valori[c] !== null ? etichettaCm(prima.valori[c] as number) : '–'}
              </Testo>
            )}
          </View>
        </Fragment>
      ))}
    </View>
  );
}

const LARGHEZZA_COLONNA = 70;
const stili = StyleSheet.create({
  intestazione: { paddingTop: spazio[12], paddingHorizontal: margine.pagina },
  scorrimento: { flex: 1 },
  contenuto: { paddingTop: spazio[20], paddingHorizontal: margine.pagina, paddingBottom: spazio[40], gap: spazio[12] },
  card: { alignSelf: 'stretch', padding: spazio[24], gap: spazio[12], backgroundColor: colori.sfondo.card, borderRadius: raggio.card },
  cardGrafico: { gap: spazio[16] },
  titoloBmi: { alignSelf: 'stretch', gap: spazio[4] },
  scala: { alignSelf: 'stretch', gap: spazio[4] },
  scalaNumeri: { alignSelf: 'stretch', flexDirection: 'row', justifyContent: 'space-between' },
  intestazioneCard: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: spazio[8] },
  cresce: { flex: 1 },
  date: { alignSelf: 'stretch', flexDirection: 'row', justifyContent: 'space-between' },
  tabella: { alignSelf: 'stretch' },
  rigaTabella: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: spazio[12], minHeight: 52, paddingVertical: spazio[14] },
  intestazioneTabella: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'flex-start', paddingBottom: spazio[8] },
  colonna: { width: LARGHEZZA_COLONNA, textAlign: 'right' },
  errore: { paddingTop: spazio[24] },
});
