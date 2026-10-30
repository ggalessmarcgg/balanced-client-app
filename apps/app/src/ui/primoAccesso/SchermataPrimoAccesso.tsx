import { useEffect, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TESTI_CONSENSO } from '@/core/consenso/consenso';
import { mostraSalta, NUMERO_PAGINE, PAGINA, TESTI_CAROSELLO, TESTI_PAGINE } from '@/core/primoAccesso/carosello';
import type { AutoreRevisione } from '@/core/revisioni/autore';
import { IndicatoreAvanzamento } from '@/ui/diario/IndicatoreAvanzamento';
import { AnteprimaOggi, AnteprimaPiano, NotificheEsempio } from '@/ui/primoAccesso/Anteprime';
import { Pulsante } from '@/ui/Pulsante';
import { CardRevisione } from '@/ui/revisioni/CardRevisione';
import { TRANSIZIONI, useRiduciMovimento } from '@/ui/riduciMovimento';
import { PROPRIETA_SCORRIMENTO } from '@/ui/scorrimento';
import { TitoloAccento } from '@/ui/schermate/TitoloAccento';
import { Testo } from '@/ui/Testo';
import { colori, spazio } from '@/ui/theme';

export type SchermataPrimoAccessoProps = {
  /** Pagina corrente (0–4). */
  pagina: number;
  /** Nutrizionista del cliente per la Card revisione della pagina 3 (foto o iniziali come nel resto dell'app); null senza. */
  nutrizionista: AutoreRevisione | null;
  onAvanti: () => void;
  onSalta: () => void;
  onAccetto: () => void;
  onNonOra: () => void;
  onInformativa: () => void;
  onAttiva: () => void;
  onPiuTardi: () => void;
  /** Scritture in corso: "Accetto" o "Attiva le notifiche" con i pallini. */
  accettoInCorso?: boolean;
  attivaInCorso?: boolean;
  sovrapposti?: ReactNode;
};

/** Anteprima della Card revisione Nuova (Figma 586:5029); autrice = la nutrizionista del cliente. */
const REVISIONE_ESEMPIO = {
  numero: 13,
  anteprima: 'Ottima settimana Giulia! Hai condiviso il diario con regolarità e si vede un bel miglioramento nella distribuzione dei pasti…',
};

/**
 * Carosello del primo accesso (Figma Primo accesso · 1–5, sezione 586:4904; contratto §7): sfondo sfondo/card, area
 * sicura in alto e in basso, "Avanzamento" (le tacchette del diario con l'attiva lunga il doppio, più "Salta" nelle
 * pagine 1–3; nelle pagine 4 e 5 "Salta" sparisce e le tacchette si allungano a tutta la larghezza, in 300 ms ease-out
 * come ogni tacchetta), poi le pagine affiancate che scorrono di una larghezza a ogni "Avanti" (con "Riduci movimento"
 * niente scorrimento né allungamento). Ogni pagina: illustrazione a riempimento (senza ritaglio: il titolo centrato della
 * pagina 1 sta lì dentro e con poco spazio veniva tagliato sopra e sotto), testo (H1 con la parola in corsivo + Body
 * attenuato) e comandi; la pagina 4 ha il consenso AI (§8), la 5 le notifiche.
 */
export function SchermataPrimoAccesso({ pagina, nutrizionista, onAvanti, onSalta, onAccetto, onNonOra, onInformativa, onAttiva, onPiuTardi, accettoInCorso = false, attivaInCorso = false, sovrapposti }: SchermataPrimoAccessoProps) {
  const insets = useSafeAreaInsets();
  const { width: larghezza } = useWindowDimensions();
  const riduciMovimento = useRiduciMovimento();
  const scorrimento = useRef<ComponentRef<typeof ScrollView>>(null);
  useEffect(() => {
    scorrimento.current?.scrollTo({ x: pagina * larghezza, animated: !riduciMovimento });
  }, [pagina, larghezza, riduciMovimento]);
  // "Salta": 1 = presente (pagine 1–3), 0 = sparito (4 e 5). Larghezza del suo spazio (misurata, più il gap) e opacità
  // interpolate dallo stesso valore, così le tacchette si allungano in modo fluido insieme alla dissolvenza.
  const conSalta = mostraSalta(pagina);
  const [larghezzaSalta, setLarghezzaSalta] = useState(0);
  const [presenza] = useState(() => new Animated.Value(conSalta ? 1 : 0));
  useEffect(() => {
    Animated.timing(presenza, { toValue: conSalta ? 1 : 0, duration: riduciMovimento ? 0 : TRANSIZIONI.tacchetteMs, easing: Easing.out(Easing.ease), useNativeDriver: false }).start();
  }, [conSalta, presenza, riduciMovimento]);
  // Misura una volta sola (poi la larghezza interna è fissa): mentre lo spazio si stringe il testo non va a capo, così la
  // riga non cambia altezza e le tacchette non si spostano (difetto visto su Android il 31/10/2026).
  // Arrotondata per eccesso con un punto di margine: su Android la larghezza misurata, riapplicata tale e quale, mandava
  // a capo l'ultima lettera.
  const onLayoutSalta = (e: LayoutChangeEvent) => setLarghezzaSalta((l) => (l > 0 ? l : Math.ceil(e.nativeEvent.layout.width) + 1));
  const spazioSalta = presenza.interpolate({ inputRange: [0, 1], outputRange: [0, larghezzaSalta] });

  const pagine: ReactNode[] = [
    <Pagina key="1" illustrazione={<TestoPagina indice={PAGINA.benvenuto} centrato />} comandi={<Pulsante etichetta={TESTI_CAROSELLO.avanti} onPress={onAvanti} />} />,
    <Pagina key="2" illustrazione={<AnteprimaOggi />} testo={<TestoPagina indice={PAGINA.diario} />} comandi={<Pulsante etichetta={TESTI_CAROSELLO.avanti} onPress={onAvanti} />} />,
    <Pagina
      key="3"
      illustrazione={<CardRevisione stato="nuova" numero={REVISIONE_ESEMPIO.numero} autore={nutrizionista} anteprima={REVISIONE_ESEMPIO.anteprima} onLeggi={() => {}} />}
      testo={<TestoPagina indice={PAGINA.revisioni} />}
      comandi={<Pulsante etichetta={TESTI_CAROSELLO.avanti} onPress={onAvanti} />}
    />,
    <Pagina
      key="4"
      illustrazione={<AnteprimaPiano />}
      testo={<TestoPagina indice={PAGINA.ai} />}
      nota={
        <Testo stile="caption" colore={colori.testo.corpoAttenuato} style={stili.nota}>
          {TESTI_CONSENSO.carosello.nota}
          <Testo stile="captionSemiBold" colore={colori.testo.corpoAttenuato} onPress={onInformativa} accessibilityRole="link" style={stili.inLinea}>
            {TESTI_CONSENSO.carosello.informativa}
          </Testo>
        </Testo>
      }
      comandi={
        <>
          <Pulsante etichetta={TESTI_CONSENSO.carosello.accetto} onPress={onAccetto} stato={accettoInCorso ? 'caricamento' : 'normale'} accessibilityHint="Registra il consenso alle funzioni con intelligenza artificiale" />
          <Pulsante etichetta={TESTI_CONSENSO.carosello.nonOra} livello="terziario" onPress={onNonOra} style={stili.centrato} />
        </>
      }
    />,
    <Pagina
      key="5"
      illustrazione={<NotificheEsempio />}
      testo={<TestoPagina indice={PAGINA.notifiche} />}
      comandi={
        <>
          <Pulsante etichetta={TESTI_CAROSELLO.attiva} onPress={onAttiva} stato={attivaInCorso ? 'caricamento' : 'normale'} accessibilityHint="Chiede il permesso delle notifiche al telefono" />
          <Pulsante etichetta={TESTI_CAROSELLO.piuTardi} livello="terziario" onPress={onPiuTardi} style={stili.centrato} />
        </>
      }
    />,
  ];

  return (
    <View style={[stili.schermo, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={stili.avanzamento}>
        <View style={stili.segmenti}>
          <IndicatoreAvanzamento attivo={pagina} passi={NUMERO_PAGINE} larghezzaAttivo="doppia" nomePassaggio="Pagina" />
        </View>
        {/* Spazio di "Salta": si misura una volta sul pulsante vero e poi si anima a zero; il pulsante resta montato per la dissolvenza. */}
        <Animated.View style={[stili.spazioSalta, larghezzaSalta > 0 && { width: spazioSalta }]} pointerEvents={conSalta ? 'box-none' : 'none'}>
          <Animated.View style={[stili.salta, { opacity: presenza }, larghezzaSalta > 0 && { width: larghezzaSalta }]} onLayout={onLayoutSalta} accessibilityElementsHidden={!conSalta} importantForAccessibility={conSalta ? 'auto' : 'no-hide-descendants'}>
            <Pulsante etichetta={TESTI_CAROSELLO.salta} livello="terziarioCompattoEvidenziato" onPress={conSalta ? onSalta : undefined} accessibilityHint="Va alla pagina del consenso" />
          </Animated.View>
        </Animated.View>
      </View>
      <ScrollView ref={scorrimento} horizontal pagingEnabled scrollEnabled={false} showsHorizontalScrollIndicator={false} style={stili.pagine} contentContainerStyle={stili.contenitorePagine} {...PROPRIETA_SCORRIMENTO}>
        {pagine.map((p, i) => (
          <View key={i} style={{ width: larghezza }} accessibilityElementsHidden={i !== pagina} importantForAccessibility={i === pagina ? 'auto' : 'no-hide-descendants'}>
            {p}
          </View>
        ))}
      </ScrollView>
      {sovrapposti}
    </View>
  );
}

/** Titolo e testo di una pagina (Figma "Testo": gap 10, padding 32; la pagina 1 è centrata in H1 Accesso). */
function TestoPagina({ indice, centrato = false }: { indice: number; centrato?: boolean }) {
  const t = TESTI_PAGINE[indice];
  if (!t) return null;
  return (
    <View style={[stili.testo, centrato && stili.testoCentrato]}>
      <TitoloAccento prima={t.titolo.prima} accento={t.titolo.accento} dopo={t.titolo.dopo} contesto={centrato ? 'accesso' : 'app'} allineamento={centrato ? 'centro' : 'sinistra'} />
      <Testo stile="body" colore={colori.testo.corpoAttenuato} style={centrato && stili.corpoCentrato}>
        {t.testo}
      </Testo>
    </View>
  );
}

function Pagina({ illustrazione, testo, nota, comandi }: { illustrazione: ReactNode; testo?: ReactNode; nota?: ReactNode; comandi: ReactNode }) {
  return (
    <View style={stili.pagina}>
      <View style={stili.illustrazione}>{illustrazione}</View>
      {testo}
      {nota ? <View style={stili.blocconota}>{nota}</View> : null}
      <View style={stili.comandi}>{comandi}</View>
    </View>
  );
}

/** Gap tra le tacchette e "Salta" (586:4922: 12), animato a zero con il pulsante. */
const GAP_SALTA = spazio[12];

const stili = StyleSheet.create({
  schermo: { flex: 1, backgroundColor: colori.sfondo.card },
  // Avanzamento (586:4922): padding 12 sopra e 32 ai lati; le tacchette a riempimento, "Salta" a destra con gap 12.
  avanzamento: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', paddingTop: spazio[12], paddingHorizontal: spazio[32] },
  segmenti: { flex: 1 },
  // Lo spazio di "Salta" ritaglia il pulsante mentre si stringe; il pulsante sta a destra con il gap a sinistra.
  spazioSalta: { flexDirection: 'row', justifyContent: 'flex-end', overflow: 'hidden' },
  salta: { paddingLeft: GAP_SALTA },
  pagine: { flex: 1 },
  contenitorePagine: { flexGrow: 1 },
  // Pagina: gap 24 tra avanzamento, illustrazione, testo e comandi (586:4905: colonna con gap 24).
  pagina: { flex: 1, paddingTop: spazio[24], gap: spazio[24] },
  illustrazione: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spazio[32], gap: spazio[12] },
  testo: { alignSelf: 'stretch', paddingHorizontal: spazio[32], gap: spazio[10] },
  testoCentrato: { paddingHorizontal: spazio[32], alignItems: 'center' },
  corpoCentrato: { textAlign: 'center' },
  // Consenso (830:8484): nota centrata in Caption, poi i comandi con gap 12.
  blocconota: { alignSelf: 'stretch', paddingHorizontal: spazio[32], marginBottom: -spazio[12] },
  nota: { textAlign: 'center' },
  inLinea: { lineHeight: undefined },
  comandi: { alignSelf: 'stretch', alignItems: 'center', gap: spazio[4], paddingHorizontal: spazio[32], paddingBottom: spazio[8] },
  centrato: { alignSelf: 'center' },
});
