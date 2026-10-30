import { useEffect, useRef, type ComponentRef, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TESTI_CONSENSO } from '@/core/consenso/consenso';
import { mostraSalta, NUMERO_PAGINE, PAGINA, TESTI_CAROSELLO, TESTI_PAGINE } from '@/core/primoAccesso/carosello';
import { AnteprimaOggi, AnteprimaPiano, NotificheEsempio } from '@/ui/primoAccesso/Anteprime';
import { Pulsante } from '@/ui/Pulsante';
import { CardRevisione } from '@/ui/revisioni/CardRevisione';
import { useRiduciMovimento } from '@/ui/riduciMovimento';
import { PROPRIETA_SCORRIMENTO } from '@/ui/scorrimento';
import { TitoloAccento } from '@/ui/schermate/TitoloAccento';
import { Testo } from '@/ui/Testo';
import { colori, raggio, spazio } from '@/ui/theme';

export type SchermataPrimoAccessoProps = {
  /** Pagina corrente (0–4). */
  pagina: number;
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

/** Anteprima della Card revisione Nuova (Figma 586:5029). */
const REVISIONE_ESEMPIO = {
  numero: 13,
  autore: { nome: 'La tua nutrizionista', foto: null, iniziali: '', fotoPronta: false },
  anteprima: 'Ottima settimana Giulia! Hai condiviso il diario con regolarità e si vede un bel miglioramento nella distribuzione dei pasti…',
};
/** Altezza dei segmenti (4) e segmento attivo largo il doppio degli altri (Figma 586:4923). */
const SEGMENTO = 4;

/**
 * Carosello del primo accesso (Figma Primo accesso · 1–5, sezione 586:4904; contratto §7): sfondo sfondo/card, area
 * sicura in alto e in basso, "Avanzamento" (segmenti + "Salta" nelle pagine 1–3, segnaposto invisibile nelle altre),
 * poi le pagine affiancate che scorrono di una larghezza a ogni "Avanti" (300 ms; con "Riduci movimento" senza
 * scorrimento). Ogni pagina: illustrazione a riempimento, testo (H1 con la parola in corsivo + Body attenuato) e
 * comandi; la pagina 1 ha il testo centrato nell'illustrazione, la 4 il consenso AI (§8), la 5 le notifiche.
 */
export function SchermataPrimoAccesso({ pagina, onAvanti, onSalta, onAccetto, onNonOra, onInformativa, onAttiva, onPiuTardi, accettoInCorso = false, attivaInCorso = false, sovrapposti }: SchermataPrimoAccessoProps) {
  const insets = useSafeAreaInsets();
  const { width: larghezza } = useWindowDimensions();
  const riduciMovimento = useRiduciMovimento();
  const scorrimento = useRef<ComponentRef<typeof ScrollView>>(null);
  useEffect(() => {
    scorrimento.current?.scrollTo({ x: pagina * larghezza, animated: !riduciMovimento });
  }, [pagina, larghezza, riduciMovimento]);

  const pagine: ReactNode[] = [
    <Pagina key="1" illustrazione={<TestoPagina indice={PAGINA.benvenuto} centrato />} comandi={<Pulsante etichetta={TESTI_CAROSELLO.avanti} onPress={onAvanti} />} />,
    <Pagina key="2" illustrazione={<AnteprimaOggi />} testo={<TestoPagina indice={PAGINA.diario} />} comandi={<Pulsante etichetta={TESTI_CAROSELLO.avanti} onPress={onAvanti} />} />,
    <Pagina
      key="3"
      illustrazione={<CardRevisione stato="nuova" numero={REVISIONE_ESEMPIO.numero} autore={REVISIONE_ESEMPIO.autore} anteprima={REVISIONE_ESEMPIO.anteprima} onLeggi={() => {}} />}
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
        <View style={stili.segmenti} accessibilityRole="progressbar" accessibilityLabel={`Pagina ${pagina + 1} di ${NUMERO_PAGINE}`}>
          {Array.from({ length: NUMERO_PAGINE }, (_, i) => (
            <View key={i} style={[stili.segmento, i === pagina && stili.segmentoAttivo]} />
          ))}
        </View>
        {mostraSalta(pagina) ? (
          <Pulsante etichetta={TESTI_CAROSELLO.salta} livello="terziarioCompattoEvidenziato" onPress={onSalta} accessibilityHint="Va alla pagina del consenso" />
        ) : (
          <View style={stili.saltaInvisibile} accessible={false} importantForAccessibility="no-hide-descendants" pointerEvents="none">
            <Pulsante etichetta={TESTI_CAROSELLO.salta} livello="terziarioCompattoEvidenziato" />
          </View>
        )}
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

const stili = StyleSheet.create({
  schermo: { flex: 1, backgroundColor: colori.sfondo.card },
  // Avanzamento (586:4922): padding 12 sopra e 32 ai lati, gap 12; segmenti gap 4, alti 4, raggio pieno.
  avanzamento: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: spazio[12], paddingTop: spazio[12], paddingHorizontal: spazio[32] },
  segmenti: { flex: 1, flexDirection: 'row', gap: spazio[4] },
  segmento: { flex: 1, height: SEGMENTO, borderRadius: raggio.pieno, backgroundColor: colori.linea.guida },
  segmentoAttivo: { flex: 2, backgroundColor: colori.azione.primaria },
  saltaInvisibile: { opacity: 0 },
  pagine: { flex: 1 },
  contenitorePagine: { flexGrow: 1 },
  // Pagina: gap 24 tra avanzamento, illustrazione, testo e comandi (586:4905: colonna con gap 24).
  pagina: { flex: 1, paddingTop: spazio[24], gap: spazio[24] },
  illustrazione: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spazio[32], gap: spazio[12], overflow: 'hidden' },
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
