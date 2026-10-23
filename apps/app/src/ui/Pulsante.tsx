import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useAreaToccabile } from '@/ui/areaToccabile';
import { useRiduciMovimento } from '@/ui/riduciMovimento';
import { Testo } from '@/ui/Testo';
import { colori, opacita, raggio, spazio, type NomeStileTesto } from '@/ui/theme';

/** Livello del Pulsante (Figma 418:62, proprietà "Livello"). */
export type LivelloPulsante = 'primario' | 'secondario' | 'terziario' | 'terziarioEvidenziato' | 'terziarioPericolo' | 'terziarioCompatto' | 'terziarioCompattoEvidenziato';
/** Stato (proprietà "Stato"); "premuto" si attiva da solo durante il tocco, qui si può forzare per le prove. */
export type StatoPulsante = 'normale' | 'premuto' | 'disabilitato' | 'caricamento';

export type PulsanteProps = {
  etichetta: string;
  livello?: LivelloPulsante;
  stato?: StatoPulsante;
  onPress?: () => void;
  accessibilityHint?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

// Per livello: stile del testo e colore (Figma: Heading su azione / Heading verde / Body / Body details 60 % / Link 60 %).
const TESTO: Record<LivelloPulsante, { stile: NomeStileTesto; colore: string }> = {
  primario: { stile: 'heading', colore: colori.testo.suAzione },
  secondario: { stile: 'heading', colore: colori.azione.primaria },
  terziario: { stile: 'body', colore: colori.testo.primario },
  /** Azione sicura di un dialogo ("Indietro", "Annulla": Etichetta, Figma 499:2707). */
  terziarioEvidenziato: { stile: 'etichetta', colore: colori.testo.primario },
  /** Azione distruttiva di un dialogo ("Elimina definitivamente": Body in testo/errore, Figma 492:3727). */
  terziarioPericolo: { stile: 'body', colore: colori.testo.errore },
  terziarioCompatto: { stile: 'bodyDetails', colore: colori.testo.secondario },
  terziarioCompattoEvidenziato: { stile: 'link', colore: colori.testo.secondario },
};

/**
 * Pulsante a tre livelli: Primario (pillola verde a tutta larghezza), Secondario (contorno), Terziario (solo
 * testo), più i due compatti per i link "Chiudi" / "Avanti" / "Salta". Altezza 56 per Primario e Secondario;
 * i terziari sono più bassi del minimo toccabile e vengono estesi a 44 con l'hitSlop.
 */
export function Pulsante({ etichetta, livello = 'primario', stato = 'normale', onPress, accessibilityHint, testID, style }: PulsanteProps) {
  const { hitSlop, onLayout } = useAreaToccabile();
  const testo = TESTO[livello];
  const caricamento = stato === 'caricamento';
  const disabilitato = stato === 'disabilitato';
  const compatto = livello === 'terziarioCompatto' || livello === 'terziarioCompattoEvidenziato';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabilitato || caricamento}
      hitSlop={hitSlop}
      onLayout={onLayout}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={etichetta}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: disabilitato, busy: caricamento }}
      style={({ pressed }) => [
        stili.base,
        stili[livello],
        (pressed || stato === 'premuto') && !disabilitato && !caricamento && stili.premuto,
        disabilitato && stili.disabilitato,
        style,
      ]}
    >
      {caricamento && !compatto ? (
        <PuntiniCaricamento colore={testo.colore} />
      ) : (
        <Testo stile={testo.stile} colore={testo.colore} style={stiliTesto.etichetta}>
          {etichetta}
        </Testo>
      )}
    </Pressable>
  );
}

// Pallini del caricamento: a saltello sfalsato come nel funnel (onboarding-v2, loading.css: 1,2 s ease-in-out,
// picco al 30 % del ciclo, ritardi di 0,15 s e 0,3 s; lì −8 px su pallini da 12, qui in proporzione −5 su 8).
// Un solo motore: una fase 0–1 che gira in un ciclo nativo (Animated.loop di un solo timing, iterazioni native) e tre
// interpolazioni sfalsate di 150 ms. Con tre cicli separati (delay + timing in sequenza, difetto del 23/10/2026) ogni
// pallino ripartiva dal thread JS a ogni passo e i ritardi dipendevano dai timer: bastava un ritardo del JS all'avvio
// perché il secondo e il terzo partissero insieme e restassero sincronizzati per sempre. Con "Riduci movimento" fermi.
const SALTELLO = { durataMs: 1200, ritardoMs: 150, altezza: -5, picco: 0.3, fine: 0.6 };
/** Punti campionati per ciascun tratto (salita e discesa) della curva ease-in-out. */
const PASSI_CURVA = 6;

/** Fotogrammi del pallino i-esimo sulla fase del ciclo (0–1): fermo, su con ease-in-out fino al picco, giù, fermo. */
function fotogrammi(indice: number): { inputRange: number[]; outputRange: number[] } {
  const inizio = (indice * SALTELLO.ritardoMs) / SALTELLO.durataMs;
  const curva = Easing.inOut(Easing.ease);
  const inputRange = [0];
  const outputRange = [0];
  if (inizio > 0) {
    inputRange.push(inizio);
    outputRange.push(0);
  }
  for (let k = 1; k <= PASSI_CURVA; k++) {
    inputRange.push(inizio + SALTELLO.picco * (k / PASSI_CURVA));
    outputRange.push(SALTELLO.altezza * curva(k / PASSI_CURVA));
  }
  for (let k = 1; k <= PASSI_CURVA; k++) {
    inputRange.push(inizio + SALTELLO.picco + (SALTELLO.fine - SALTELLO.picco) * (k / PASSI_CURVA));
    outputRange.push(SALTELLO.altezza * (1 - curva(k / PASSI_CURVA)));
  }
  inputRange.push(1);
  outputRange.push(0);
  return { inputRange, outputRange };
}
const CURVE_PALLINI = [0, 1, 2].map(fotogrammi);

function PuntiniCaricamento({ colore }: { colore: string }) {
  const riduci = useRiduciMovimento();
  const [fase] = useState(() => new Animated.Value(0));
  useEffect(() => {
    fase.stopAnimation();
    fase.setValue(0);
    if (riduci) return;
    const ciclo = Animated.loop(Animated.timing(fase, { toValue: 1, duration: SALTELLO.durataMs, easing: Easing.linear, useNativeDriver: true }));
    ciclo.start();
    return () => ciclo.stop();
  }, [riduci, fase]);
  const opacitaPuntini = [1, opacita.caricamentoPuntoMedio, opacita.caricamentoPuntoChiaro];
  return (
    <View style={stili.puntini} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {CURVE_PALLINI.map((curva, i) => (
        <Animated.View key={i} style={[stili.puntino, { backgroundColor: colore, opacity: opacitaPuntini[i], transform: [{ translateY: fase.interpolate(curva) }] }]} />
      ))}
    </View>
  );
}

// Padding e misure: Figma 418:62. Primario/Secondario fissi a 353 × 56 (qui: larghezza a riempimento,
// altezza minima 56 così il testo ingrandito dal sistema non viene tagliato); Terziario altezza minima 46.
// Regola: un pulsante non cambia misura al cambiare dello stato (i puntini si sovrappongono all'etichetta).
const PILLOLA = {
  alignSelf: 'stretch' as const,
  minHeight: 56,
  paddingVertical: spazio[16],
  paddingHorizontal: spazio[24],
  borderRadius: raggio.pieno,
};
const stili = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spazio[8] },
  primario: { ...PILLOLA, backgroundColor: colori.azione.primaria },
  secondario: {
    ...PILLOLA,
    borderWidth: 1.5,
    borderColor: colori.bordo.selezione,
    // Il contorno in Figma è interno e non riduce il padding: qui il bordo sta dentro il box, quindi si sottrae.
    paddingVertical: spazio[16] - 1.5,
    paddingHorizontal: spazio[24] - 1.5,
  },
  terziario: { alignSelf: 'flex-start', minHeight: 46, paddingVertical: spazio[12], paddingHorizontal: spazio[4] },
  terziarioEvidenziato: { alignSelf: 'flex-start', minHeight: 46, paddingVertical: spazio[12], paddingHorizontal: spazio[4] },
  terziarioPericolo: { alignSelf: 'flex-start', minHeight: 46, paddingVertical: spazio[12], paddingHorizontal: spazio[4] },
  terziarioCompatto: { alignSelf: 'flex-start' },
  terziarioCompattoEvidenziato: { alignSelf: 'flex-start' },
  premuto: { opacity: opacita.pulsantePremuto },
  disabilitato: { opacity: opacita.pulsantePrimarioDisabilitato },
  puntini: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spazio[4] },
  puntino: { width: spazio[8], height: spazio[8], borderRadius: raggio.pieno },
});
const stiliTesto = StyleSheet.create({ etichetta: { textAlign: 'center' }, nascosta: { opacity: 0 } });
