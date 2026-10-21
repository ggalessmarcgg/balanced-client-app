import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Polygon, Polyline, Rect, Stop } from 'react-native-svg';

import { CIRCONFERENZE, ETICHETTE_CIRCONFERENZE, etichettaKg, posizioneBmi, puntiPeso, raggiRadar, type ChiaveCirconferenza, type Circonferenze, type Peso } from '@/core/misure/misure';
import { Testo } from '@/ui/Testo';
import { colori, opacita, raggio, spazio } from '@/ui/theme';

/** Larghezza misurata del contenitore (i grafici SVG hanno bisogno dei punti). */
function useLarghezza(): [number, (e: LayoutChangeEvent) => void] {
  const [larghezza, setLarghezza] = useState(0);
  return [larghezza, (e) => setLarghezza(Math.round(e.nativeEvent.layout.width))];
}

// Barra del BMI (Figma 523:3054): alta 20, raggio 5, sfumatura orizzontale. Il disegno usa quattro colori non presenti
// tra i token (verde lime → giallo → arancio): qui la sfumatura va da badge/sfondo a stato/da-rivedere a stato/errore.
// Non c'è un indicatore del valore, come nel disegno.
const ALTEZZA_BARRA_BMI = 20;
const RAGGIO_BARRA_BMI = 5;

export function BarraBmi({ bmi }: { bmi: number }) {
  const [larghezza, onLayout] = useLarghezza();
  const posizione = posizioneBmi(bmi);
  return (
    <View style={stili.barraBmi} onLayout={onLayout} accessible accessibilityRole="progressbar" accessibilityLabel={`Indice di massa corporea ${bmi.toFixed(1).replace('.', ',')} su una scala da 19 a 39`} accessibilityValue={{ min: 19, max: 39, now: Math.round(bmi) }}>
      {larghezza > 0 && (
        <Svg width={larghezza} height={ALTEZZA_BARRA_BMI}>
          <Defs>
            <LinearGradient id="bmi" x1="0" y1="0" x2={larghezza} y2="0" gradientUnits="userSpaceOnUse">
              <Stop offset="0" stopColor={colori.badge.sfondo} />
              <Stop offset={String(posizioneBmi(25))} stopColor={colori.grafico.sport} />
              <Stop offset={String(posizioneBmi(29))} stopColor={colori.stato.daRivedere} />
              <Stop offset="1" stopColor={colori.stato.errore} />
            </LinearGradient>
          </Defs>
          <Rect width={larghezza} height={ALTEZZA_BARRA_BMI} rx={RAGGIO_BARRA_BMI} ry={RAGGIO_BARRA_BMI} fill="url(#bmi)" />
          {/* Posizione del valore: segno sottile (non nel disegno, utile a leggere la scala). */}
          <Rect x={Math.max(1, Math.min(larghezza - 3, posizione * larghezza - 1))} y={0} width={2} height={ALTEZZA_BARRA_BMI} fill={colori.testo.primario} />
        </Svg>
      )}
    </View>
  );
}

// Grafico del peso (Figma 525:2878): area 305 × 150, linea azione/primaria con i punti agli estremi (raggio 3) e le
// etichette del primo e dell'ultimo valore (Etichetta piccola). Margini interni perché punti ed etichette non escano;
// ogni etichetta sta sopra il suo punto se la linea se ne allontana verso il basso, altrimenti sotto (mai sulla linea).
const ALTEZZA_GRAFICO_PESO = 150;
const MARGINE_PESO = { x: 14, alto: 30, basso: 30 };
const DISTANZA_ETICHETTA = 8;
const ALTEZZA_ETICHETTA = 20;
const RAGGIO_PUNTO = 3;
const TRATTO = 2;

export function GraficoPeso({ pesi }: { pesi: Peso[] }) {
  const [larghezza, onLayout] = useLarghezza();
  const punti = puntiPeso(pesi);
  const primo = pesi[0];
  const ultimo = pesi[pesi.length - 1];
  const aX = (x: number) => MARGINE_PESO.x + x * (larghezza - 2 * MARGINE_PESO.x);
  const aY = (y: number) => MARGINE_PESO.alto + y * (ALTEZZA_GRAFICO_PESO - MARGINE_PESO.alto - MARGINE_PESO.basso);
  const p0 = punti[0];
  const pN = punti[punti.length - 1];
  const p1 = punti[1];
  const pPrecedente = punti[punti.length - 2];
  // Sopra se il tratto adiacente scende (o è piatto): lo spazio sopra il punto è libero.
  const primaSopra = !p1 || p1.y >= (p0?.y ?? 0);
  const ultimaSopra = !pPrecedente || pPrecedente.y >= (pN?.y ?? 0);
  const topEtichetta = (y: number, sopra: boolean) => (sopra ? aY(y) - RAGGIO_PUNTO - DISTANZA_ETICHETTA - ALTEZZA_ETICHETTA : aY(y) + RAGGIO_PUNTO + DISTANZA_ETICHETTA);
  return (
    <View style={stili.graficoPeso} onLayout={onLayout} accessible accessibilityLabel={primo && ultimo ? `Peso da ${etichettaKg(primo.kg)} a ${etichettaKg(ultimo.kg)}` : 'Grafico del peso'}>
      {larghezza > 0 && p0 && pN && (
        <>
          <Svg width={larghezza} height={ALTEZZA_GRAFICO_PESO}>
            <Polyline points={punti.map((p) => `${aX(p.x)},${aY(p.y)}`).join(' ')} fill="none" stroke={colori.azione.primaria} strokeWidth={TRATTO} strokeLinejoin="round" strokeLinecap="round" />
            <Circle cx={aX(p0.x)} cy={aY(p0.y)} r={RAGGIO_PUNTO} fill={colori.azione.primaria} />
            {punti.length > 1 && <Circle cx={aX(pN.x)} cy={aY(pN.y)} r={RAGGIO_PUNTO} fill={colori.azione.primaria} />}
          </Svg>
          {primo && (
            <Testo stile="etichettaPiccola" style={[stili.etichettaPeso, { left: Math.max(0, aX(p0.x) - RAGGIO_PUNTO - 2), top: topEtichetta(p0.y, primaSopra) }]}>
              {etichettaKg(primo.kg)}
            </Testo>
          )}
          {ultimo && punti.length > 1 && (
            <Testo stile="etichettaPiccola" style={[stili.etichettaPeso, stili.etichettaDestra, { right: Math.max(0, larghezza - aX(pN.x) - RAGGIO_PUNTO - 2), top: topEtichetta(pN.y, ultimaSopra) }]}>
              {etichettaKg(ultimo.kg)}
            </Testo>
          )}
        </>
      )}
    </View>
  );
}

// Radar delle circonferenze (Figma 525:2903): area 305 × 250, esagono su tre livelli (linea/guida), assi, poligono
// della prima misurazione tratteggiato al 45 % di testo/primario, poligono dell'ultima in azione/primaria con un
// riempimento leggero, etichette Caption al 70 % ai vertici. Ordine in senso orario da "Vita" in alto.
const ALTEZZA_RADAR = 250;
const LIVELLI = 3;
const RAGGIO_RADAR = 88;
const DISTANZA_ETICHETTE = 20;

export function GraficoCirconferenze({ prima, ultima }: { prima: Circonferenze; ultima: Circonferenze }) {
  const [larghezza, onLayout] = useLarghezza();
  const raggi = raggiRadar(prima, ultima);
  const centro = { x: larghezza / 2, y: ALTEZZA_RADAR / 2 };
  const angolo = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / CIRCONFERENZE.length;
  const punto = (i: number, r: number) => ({ x: centro.x + Math.cos(angolo(i)) * r, y: centro.y + Math.sin(angolo(i)) * r });
  const poligono = (quale: 'prima' | 'ultima') => CIRCONFERENZE.map((c, i) => punto(i, raggi[c][quale] * RAGGIO_RADAR)).map((p) => `${p.x},${p.y}`).join(' ');
  return (
    <View style={stili.radar} onLayout={onLayout} accessible accessibilityLabel={`Circonferenze: ${CIRCONFERENZE.map((c) => `${ETICHETTE_CIRCONFERENZE[c]} da ${prima.valori[c] ?? '–'} a ${ultima.valori[c] ?? '–'} centimetri`).join(', ')}`}>
      {larghezza > 0 && (
        <>
          <Svg width={larghezza} height={ALTEZZA_RADAR}>
            {Array.from({ length: LIVELLI }, (_, l) => (
              <Polygon key={l} points={CIRCONFERENZE.map((_, i) => punto(i, (RAGGIO_RADAR * (l + 1)) / LIVELLI)).map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke={colori.linea.guida} strokeWidth={1} />
            ))}
            {CIRCONFERENZE.map((c, i) => {
              const p = punto(i, RAGGIO_RADAR);
              return <Line key={c} x1={centro.x} y1={centro.y} x2={p.x} y2={p.y} stroke={colori.linea.guida} strokeWidth={1} />;
            })}
            <Polygon points={poligono('prima')} fill="none" stroke={colori.testo.primario} strokeOpacity={opacita.oggiDaCondividere} strokeWidth={TRATTO} strokeDasharray="4 4" strokeLinejoin="round" />
            <Polygon points={poligono('ultima')} fill={colori.azione.primaria} fillOpacity={opacita.trattinoOggi} stroke={colori.azione.primaria} strokeWidth={TRATTO} strokeLinejoin="round" />
          </Svg>
          {CIRCONFERENZE.map((c, i) => (
            <EtichettaRadar key={c} chiave={c} posizione={punto(i, RAGGIO_RADAR + DISTANZA_ETICHETTE)} larghezza={larghezza} />
          ))}
        </>
      )}
    </View>
  );
}

const LARGHEZZA_ETICHETTA = 70;
function EtichettaRadar({ chiave, posizione, larghezza }: { chiave: ChiaveCirconferenza; posizione: { x: number; y: number }; larghezza: number }) {
  const left = Math.max(0, Math.min(larghezza - LARGHEZZA_ETICHETTA, posizione.x - LARGHEZZA_ETICHETTA / 2));
  return (
    <Testo stile="caption" colore={colori.testo.attenuato} style={[stili.etichettaRadar, { left, top: posizione.y - 8 }]}>
      {ETICHETTE_CIRCONFERENZE[chiave]}
    </Testo>
  );
}

/** Legenda del radar (Figma 525:2921): linee 14 × 3 e Caption al 70 %, gap 6, voci con gap 16 centrate. */
export function LegendaRadar({ prima, ultima }: { prima: string; ultima: string }) {
  return (
    <View style={stili.legenda}>
      <View style={stili.voceLegenda}>
        <View style={[stili.lineaLegenda, stili.lineaPrima]} />
        <Testo stile="caption" colore={colori.testo.attenuato}>{`Prima misurazione · ${prima}`}</Testo>
      </View>
      <View style={stili.voceLegenda}>
        <View style={[stili.lineaLegenda, stili.lineaUltima]} />
        <Testo stile="caption" colore={colori.testo.attenuato}>{`Ultima · ${ultima}`}</Testo>
      </View>
    </View>
  );
}

const stili = StyleSheet.create({
  barraBmi: { alignSelf: 'stretch', height: ALTEZZA_BARRA_BMI, borderRadius: RAGGIO_BARRA_BMI, overflow: 'hidden' },
  graficoPeso: { alignSelf: 'stretch', height: ALTEZZA_GRAFICO_PESO },
  etichettaPeso: { position: 'absolute' },
  etichettaDestra: { textAlign: 'right' },
  radar: { alignSelf: 'stretch', height: ALTEZZA_RADAR },
  etichettaRadar: { position: 'absolute', width: LARGHEZZA_ETICHETTA, textAlign: 'center' },
  legenda: { alignSelf: 'stretch', flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: spazio[16] },
  voceLegenda: { flexDirection: 'row', alignItems: 'center', gap: spazio[6] },
  lineaLegenda: { width: 14, height: 3, borderRadius: raggio.pieno },
  lineaPrima: { backgroundColor: colori.testo.primario, opacity: opacita.oggiDaCondividere },
  lineaUltima: { backgroundColor: colori.azione.primaria },
});
