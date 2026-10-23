import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

import { Icona } from '@/ui/icone';
import { colori, gradienti, opacita, raggio } from '@/ui/theme';

/** Stato del Pulsante registrazione (Figma 458:161, proprietà "Stato"). */
export type StatoPulsanteRegistrazione = 'pronto' | 'inRegistrazione' | 'daInviare' | 'disabilitato';

export type PulsanteRegistrazioneProps = {
  stato: StatoPulsanteRegistrazione;
  onPress?: () => void;
};

// Misure di Figma: area 112, cerchio 88 con la sfumatura della Card diario, microfono a 32, quadrato di stop 26 con
// raggio 6 (metà del raggio piccolo) in stato/registrazione, "Icona / 24 / Penna" (761:448) nella variante "Da inviare".
const AREA = 112;
const CERCHIO = 88;
const STOP = 26;
const RAGGIO_STOP = raggio.piccolo / 2;

const ETICHETTE: Record<StatoPulsanteRegistrazione, string> = {
  pronto: 'Inizia a registrare',
  inRegistrazione: 'Ferma la registrazione',
  daInviare: 'Genera la trascrizione del racconto',
  disabilitato: 'Inizia a registrare',
};

/**
 * Pulsante principale della registrazione: Pronto mostra il microfono, In registrazione il quadrato di stop (nessun
 * alone, decisione del 23/10/2026), Da inviare la penna che avvia la trascrizione, Disabilitato al 40 %.
 */
export function PulsanteRegistrazione({ stato, onPress }: PulsanteRegistrazioneProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={stato === 'disabilitato'}
      accessibilityRole="button"
      accessibilityLabel={ETICHETTE[stato]}
      accessibilityState={{ disabled: stato === 'disabilitato' }}
      style={({ pressed }) => [stili.area, stato === 'disabilitato' && stili.disabilitato, pressed && stato !== 'disabilitato' && stili.premuto]}
    >
      <View style={stili.cerchio}>
        <CerchioSfumato diametro={CERCHIO} />
        {stato === 'inRegistrazione' ? (
          <View style={stili.stop} />
        ) : stato === 'daInviare' ? (
          <Icona misura={24} nome="Penna" />
        ) : (
          <Icona misura={24} nome="Microfono" dimensione={32} />
        )}
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
  cerchio: { width: CERCHIO, height: CERCHIO, borderRadius: raggio.pieno, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  stop: { width: STOP, height: STOP, borderRadius: RAGGIO_STOP, backgroundColor: colori.stato.registrazione },
  disabilitato: { opacity: opacita.pulsantePrimarioDisabilitato },
  premuto: { opacity: opacita.pulsantePremuto },
});
