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
// Con "Riduci movimento" restano fermi.
const SALTELLO = { durataMs: 1200, ritardoMs: 150, altezza: -5, picco: 0.3, fine: 0.6 };

function PuntiniCaricamento({ colore }: { colore: string }) {
  const riduci = useRiduciMovimento();
  const [salti] = useState(() => [new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]);
  useEffect(() => {
    if (riduci) {
      for (const s of salti) {
        s.stopAnimation();
        s.setValue(0);
      }
      return;
    }
    // Un ciclo: fermo → su (fino al 30 %) → giù (fino al 60 %) → fermo; ogni pallino parte 150 ms dopo il precedente.
    const su = SALTELLO.durataMs * SALTELLO.picco;
    const giu = SALTELLO.durataMs * (SALTELLO.fine - SALTELLO.picco);
    const pausa = SALTELLO.durataMs * (1 - SALTELLO.fine);
    const cicli = salti.map((s, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * SALTELLO.ritardoMs),
          Animated.timing(s, { toValue: 1, duration: su, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(s, { toValue: 0, duration: giu, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.delay(pausa - i * SALTELLO.ritardoMs),
        ]),
      ),
    );
    for (const c of cicli) c.start();
    return () => {
      for (const c of cicli) c.stop();
    };
  }, [riduci, salti]);
  const opacitaPuntini = [1, opacita.caricamentoPuntoMedio, opacita.caricamentoPuntoChiaro];
  return (
    <View style={stili.puntini} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {salti.map((s, i) => (
        <Animated.View key={i} style={[stili.puntino, { backgroundColor: colore, opacity: opacitaPuntini[i], transform: [{ translateY: s.interpolate({ inputRange: [0, 1], outputRange: [0, SALTELLO.altezza] }) }] }]} />
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
