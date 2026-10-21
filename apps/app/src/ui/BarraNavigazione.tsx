import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { Icona } from '@/ui/icone';
import { TRANSIZIONI, useRiduciMovimento } from '@/ui/riduciMovimento';
import { Testo } from '@/ui/Testo';
import { colori, misuraIcona, raggio, spazio, type IconaPerMisura } from '@/ui/theme';
import { Vetro } from '@/ui/Vetro';

/** Voci della Barra di navigazione (Figma 493:368, proprietà "Attiva"). Account è provvisoria (in futuro Obiettivi). */
export type VoceNavigazione = 'oggi' | 'piano' | 'revisioni' | 'account';

export type BarraNavigazioneProps = {
  attiva: VoceNavigazione;
  /** Pallino rosso sulle Revisioni quando ne è arrivata una nuova (proprietà "Revisione nuova"). */
  revisioneNuova?: boolean;
  onSeleziona?: (voce: VoceNavigazione) => void;
};

const VOCI: { voce: VoceNavigazione; etichetta: string; icona: IconaPerMisura[24] }[] = [
  { voce: 'oggi', etichetta: 'Oggi', icona: 'Matita' },
  { voce: 'piano', etichetta: 'Piano', icona: 'Piano' },
  { voce: 'revisioni', etichetta: 'Revisioni', icona: 'Revisioni' },
  { voce: 'account', etichetta: 'Account', icona: 'Profilo' },
];

// Pallino "Nuova revisione": 10 × 10 a (16, −2) nel riquadro 24 dell'icona, contorno esterno 2 color sfondo/pagina.
const PALLINO = 10;
const CONTORNO_PALLINO = 2;
const ALTEZZA_VOCE = 52;

/**
 * Barra di navigazione fluttuante: pillola alta 64 con quattro voci (icona 24 + Caption), voce attiva su
 * sfondo/campo con Caption SemiBold, voci inattive al 60 %. La posizione (8 sopra l'area sicura, margini 20,
 * fissa al viewport) è a cura della schermata.
 * Fondo (Figma: sfondo/barra all'80 % con effetto App/Vetro): componente Vetro (vetro nativo iOS, fondo su Android).
 * Al cambio di voce lo sfondo che evidenzia la voce attiva scorre fino alla voce nuova e icona e testo cambiano colore
 * in dissolvenza, in 300 ms ease-out come le tacchette del diario; con "Riduci movimento" lo sfondo salta e resta solo
 * una dissolvenza breve. Vale anche con il vetro nativo: l'evidenza è uno strato animato dentro la pillola.
 */
export function BarraNavigazione({ attiva, revisioneNuova = false, onSeleziona }: BarraNavigazioneProps) {
  const riduci = useRiduciMovimento();
  const indice = Math.max(0, VOCI.findIndex((v) => v.voce === attiva));
  // Posizione dello sfondo (scorre) e transizione dei colori (dissolvenza): valori separati perché con "Riduci
  // movimento" il primo salta e il secondo dissolve comunque, brevemente.
  const [posizione] = useState(() => new Animated.Value(indice));
  const [transizione] = useState(() => new Animated.Value(indice));
  // Posizione orizzontale di ogni voce dentro la pillola (misurata): prima della misura l'evidenza resta nascosta.
  const [ascisse, setAscisse] = useState<number[]>([]);
  const [larghezzaVoce, setLarghezzaVoce] = useState(0);
  useEffect(() => {
    const easing = Easing.out(Easing.ease);
    Animated.timing(posizione, { toValue: indice, duration: riduci ? 0 : TRANSIZIONI.tacchetteMs, easing, useNativeDriver: true }).start();
    Animated.timing(transizione, { toValue: indice, duration: riduci ? TRANSIZIONI.comparsaMs : TRANSIZIONI.tacchetteMs, easing, useNativeDriver: true }).start();
  }, [indice, riduci, posizione, transizione]);

  const misurata = ascisse.length === VOCI.length && ascisse.every((x) => x !== undefined) && larghezzaVoce > 0;
  const translateX = misurata ? posizione.interpolate({ inputRange: VOCI.map((_, i) => i), outputRange: ascisse }) : 0;

  const voci = VOCI.map(({ voce, etichetta, icona }, i) => {
    const selezionata = voce === attiva;
    const conPallino = voce === 'revisioni' && revisioneNuova;
    // 1 quando la voce è quella attiva, 0 altrimenti: le due versioni (attiva/inattiva) si dissolvono una nell'altra.
    const attivazione = transizione.interpolate({ inputRange: [i - 1, i, i + 1], outputRange: [0, 1, 0], extrapolate: 'clamp' });
    const onLayout = (e: LayoutChangeEvent) => {
      const { x, width } = e.nativeEvent.layout;
      setAscisse((a) => (a[i] === x ? a : Object.assign([...a], { [i]: x })));
      setLarghezzaVoce((l) => (l === width ? l : width));
    };
    return (
      <Pressable
        key={voce}
        onPress={() => onSeleziona?.(voce)}
        onLayout={onLayout}
        accessibilityRole="tab"
        accessibilityLabel={etichetta}
        accessibilityHint={conPallino ? 'Nuova revisione' : undefined}
        accessibilityState={{ selected: selezionata }}
        style={[stili.voce, !misurata && selezionata && stili.voceAttivaSenzaMisura]}
      >
        <Animated.View style={[stili.strato, { opacity: attivazione.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]} accessible={false}>
          <View style={stili.icona}>
            <Icona misura={24} nome={icona} colore={colori.icona.secondaria} />
          </View>
          <Testo stile="caption" colore={colori.testo.secondario}>
            {etichetta}
          </Testo>
        </Animated.View>
        <Animated.View style={[stili.strato, stili.stratoSopra, { opacity: attivazione }]} accessible={false}>
          <View style={stili.icona}>
            <Icona misura={24} nome={icona} colore={colori.icona.primaria} />
          </View>
          <Testo stile="captionSemiBold" colore={colori.testo.primario}>
            {etichetta}
          </Testo>
        </Animated.View>
        {conPallino && (
          // Terzo strato, fermo, con la stessa struttura dei due animati: il pallino cade esattamente sul riquadro dell'icona.
          <View style={[stili.strato, stili.stratoSopra]} pointerEvents="none" accessible={false}>
            <View style={stili.icona}>
              <View style={stili.pallino} />
            </View>
            <Testo stile="caption" style={stili.invisibile}>
              {etichetta}
            </Testo>
          </View>
        )}
      </Pressable>
    );
  });
  return (
    <Vetro style={stili.vetro}>
      <View style={stili.barra} accessibilityRole="tablist">
        {misurata && <Animated.View style={[stili.evidenza, { width: larghezzaVoce, transform: [{ translateX }] }]} pointerEvents="none" />}
        {voci}
      </View>
    </Vetro>
  );
}

const stili = StyleSheet.create({
  vetro: { alignSelf: 'stretch', borderRadius: raggio.pieno },
  barra: { flexDirection: 'row', alignItems: 'center', minHeight: 64, paddingVertical: spazio[6], paddingHorizontal: spazio[8] },
  evidenza: { position: 'absolute', left: 0, top: spazio[6], height: ALTEZZA_VOCE, borderRadius: raggio.pieno, backgroundColor: colori.sfondo.campo },
  voce: { flex: 1, minHeight: ALTEZZA_VOCE, alignItems: 'center', justifyContent: 'center', borderRadius: raggio.pieno },
  voceAttivaSenzaMisura: { backgroundColor: colori.sfondo.campo },
  // I due strati (inattivo sotto, attivo sopra) occupano lo stesso spazio: il primo dà la misura, il secondo è assoluto.
  strato: { alignItems: 'center', justifyContent: 'center' },
  stratoSopra: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  icona: { width: misuraIcona[24], height: misuraIcona[24] },
  invisibile: { opacity: 0 },
  pallino: {
    position: 'absolute',
    left: 16 - CONTORNO_PALLINO,
    top: -CONTORNO_PALLINO - 2,
    width: PALLINO + 2 * CONTORNO_PALLINO,
    height: PALLINO + 2 * CONTORNO_PALLINO,
    borderRadius: raggio.pieno,
    borderWidth: CONTORNO_PALLINO,
    borderColor: colori.sfondo.pagina,
    backgroundColor: colori.stato.notifica,
  },
});
