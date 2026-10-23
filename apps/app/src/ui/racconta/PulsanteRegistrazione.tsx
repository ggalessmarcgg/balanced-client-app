import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

import { Icona } from '@/ui/icone';
import { useRiduciMovimento } from '@/ui/riduciMovimento';
import { colori, gradienti, opacita, raggio } from '@/ui/theme';

/** Stato del Pulsante registrazione (Figma 458:161, proprietà "Stato"). */
export type StatoPulsanteRegistrazione = 'pronto' | 'inRegistrazione' | 'disabilitato';

export type PulsanteRegistrazioneProps = {
  stato: StatoPulsanteRegistrazione;
  onPress?: () => void;
};

// Misure di Figma: area 112 (alone), cerchio 88 con la sfumatura della Card diario, microfono a 32, quadrato di stop
// 26 con raggio 6 (metà del raggio piccolo) in stato/registrazione.
const AREA = 112;
const CERCHIO = 88;
const STOP = 26;
const RAGGIO_STOP = raggio.piccolo / 2;
const ALONE = { opacitaMassima: 0.35, opacitaMinima: 0.1, scalaMassima: 1.12, durataMs: 1200 };

/**
 * Pulsante principale della registrazione: Pronto mostra il microfono, In registrazione il quadrato di stop con
 * l'alone verde chiaro che pulsa (nota del componente Figma: "da animare in codice"; con "Riduci movimento" l'alone è
 * fermo), Disabilitato al 40 %.
 */
export function PulsanteRegistrazione({ stato, onPress }: PulsanteRegistrazioneProps) {
  const riduci = useRiduciMovimento();
  const [pulsazione] = useState(() => new Animated.Value(0));
  const inRegistrazione = stato === 'inRegistrazione';

  useEffect(() => {
    if (!inRegistrazione || riduci) {
      pulsazione.stopAnimation();
      pulsazione.setValue(0);
      return;
    }
    const ciclo = Animated.loop(
      Animated.sequence([
        Animated.timing(pulsazione, { toValue: 1, duration: ALONE.durataMs, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulsazione, { toValue: 0, duration: ALONE.durataMs, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    ciclo.start();
    return () => ciclo.stop();
  }, [inRegistrazione, riduci, pulsazione]);

  const stileAlone = riduci
    ? { opacity: ALONE.opacitaMassima }
    : {
        opacity: pulsazione.interpolate({ inputRange: [0, 1], outputRange: [ALONE.opacitaMinima, ALONE.opacitaMassima] }),
        transform: [{ scale: pulsazione.interpolate({ inputRange: [0, 1], outputRange: [1, ALONE.scalaMassima] }) }],
      };

  return (
    <Pressable
      onPress={onPress}
      disabled={stato === 'disabilitato'}
      accessibilityRole="button"
      accessibilityLabel={inRegistrazione ? 'Ferma la registrazione' : 'Inizia a registrare'}
      accessibilityState={{ disabled: stato === 'disabilitato' }}
      style={({ pressed }) => [stili.area, stato === 'disabilitato' && stili.disabilitato, pressed && stato !== 'disabilitato' && stili.premuto]}
    >
      {inRegistrazione && <Animated.View style={[stili.alone, stileAlone]} />}
      <View style={stili.cerchio}>
        <CerchioSfumato diametro={CERCHIO} />
        {inRegistrazione ? <View style={stili.stop} /> : <Icona misura={24} nome="Microfono" dimensione={32} />}
      </View>
    </Pressable>
  );
}

/** Cerchio con la sfumatura App/Gradiente card diario (dai token, con react-native-svg). */
function CerchioSfumato({ diametro }: { diametro: number }) {
  const g = gradienti.cardDiario;
  const r = diametro / 2;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants">
      <Svg width={diametro} height={diametro}>
        <Defs>
          <LinearGradient id="pulsanteRegistrazione" x1={g.inizio.x * diametro} y1={g.inizio.y * diametro} x2={g.fine.x * diametro} y2={g.fine.y * diametro} gradientUnits="userSpaceOnUse">
            {g.tappe.map((t) => (
              <Stop key={t.posizione} offset={t.posizione} stopColor={t.colore} />
            ))}
          </LinearGradient>
        </Defs>
        <Circle cx={r} cy={r} r={r} fill="url(#pulsanteRegistrazione)" />
      </Svg>
    </View>
  );
}

const stili = StyleSheet.create({
  area: { width: AREA, height: AREA, borderRadius: raggio.pieno, alignItems: 'center', justifyContent: 'center' },
  alone: { position: 'absolute', width: AREA, height: AREA, borderRadius: raggio.pieno, backgroundColor: colori.badge.sfondo },
  cerchio: { width: CERCHIO, height: CERCHIO, borderRadius: raggio.pieno, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  stop: { width: STOP, height: STOP, borderRadius: RAGGIO_STOP, backgroundColor: colori.stato.registrazione },
  disabilitato: { opacity: opacita.pulsantePrimarioDisabilitato },
  premuto: { opacity: opacita.pulsantePremuto },
});
