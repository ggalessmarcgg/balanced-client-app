import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import type { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { Icona } from '@/ui/icone';
import { Testo } from '@/ui/Testo';
import { colori, coloriCodice, misuraIcona, raggio, spazio, type IconaPerMisura } from '@/ui/theme';

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

/**
 * Barra di navigazione fluttuante: pillola alta 64 con quattro voci (icona 24 + Caption), voce attiva su
 * sfondo/campo con Caption SemiBold, voci inattive al 60 %. La posizione (8 sopra l'area sicura, margini 20,
 * fissa al viewport) è a cura della schermata.
 * Fondo (Figma: sfondo/barra all'80 % con effetto App/Vetro): vetro nativo iOS (expo-glass-effect, Liquid Glass
 * su iOS 26+); su Android, e dove il vetro non è disponibile, sfondo/card al 90 % senza sfocatura (coloriCodice).
 */
export function BarraNavigazione({ attiva, revisioneNuova = false, onSeleziona }: BarraNavigazioneProps) {
  const voci = VOCI.map(({ voce, etichetta, icona }) => {
    const selezionata = voce === attiva;
    const conPallino = voce === 'revisioni' && revisioneNuova;
    return (
      <Pressable
        key={voce}
        onPress={() => onSeleziona?.(voce)}
        accessibilityRole="tab"
        accessibilityLabel={etichetta}
        accessibilityHint={conPallino ? 'Nuova revisione' : undefined}
        accessibilityState={{ selected: selezionata }}
        style={[stili.voce, selezionata && stili.voceAttiva]}
      >
        <View style={stili.icona}>
          <Icona misura={24} nome={icona} colore={selezionata ? colori.icona.primaria : colori.icona.secondaria} />
          {conPallino && <View style={stili.pallino} />}
        </View>
        <Testo stile={selezionata ? 'captionSemiBold' : 'caption'} colore={selezionata ? colori.testo.primario : colori.testo.secondario}>
          {etichetta}
        </Testo>
      </Pressable>
    );
  });
  return (
    <Sfondo>
      <View style={stili.barra} accessibilityRole="tablist">
        {voci}
      </View>
    </Sfondo>
  );
}

const VETRO_NATIVO = Platform.OS === 'ios' && isLiquidGlassAvailable();

function Sfondo({ children }: { children: ReactNode }) {
  if (VETRO_NATIVO) {
    return (
      <GlassView glassEffectStyle="regular" colorScheme="light" tintColor={colori.sfondo.barra} style={stili.vetro}>
        {children}
      </GlassView>
    );
  }
  return <View style={[stili.vetro, stili.senzaVetro]}>{children}</View>;
}

const stili = StyleSheet.create({
  vetro: { alignSelf: 'stretch', borderRadius: raggio.pieno, overflow: 'hidden' },
  senzaVetro: { backgroundColor: coloriCodice.sfondoBarraAndroid },
  barra: { flexDirection: 'row', alignItems: 'center', minHeight: 64, paddingVertical: spazio[6], paddingHorizontal: spazio[8] },
  voce: { flex: 1, minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: raggio.pieno },
  voceAttiva: { backgroundColor: colori.sfondo.campo },
  icona: { width: misuraIcona[24], height: misuraIcona[24] },
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
