import { Pressable, StyleSheet } from 'react-native';

import { useAreaToccabile } from '@/ui/areaToccabile';
import { Testo } from '@/ui/Testo';
import { colori, raggio, spazio, tocco } from '@/ui/theme';

export type OpzioneProps = {
  etichetta: string;
  /** Standard (padding 16, altezza 44) · Compatta (padding 4, altezza 44) · Su più righe (padding 8/16, altezza libera). */
  forma?: 'standard' | 'compatta' | 'suPiuRighe';
  selezionata: boolean;
  onPress?: () => void;
  /** Riempie lo spazio della riga (opzioni affiancate a larghezza uguale, come nel diario). */
  cresce?: boolean;
  /** Non toccabile (l'opacità al 50 % la applica il contenitore, come nella Card diario · Sport riposo). */
  disabilitato?: boolean;
  /** Sfondo da non selezionata: card (predefinito) o campo quando la pillola sta su una card crema (competenze, Figma 516:2770). */
  fondo?: 'card' | 'campo';
};

/** Opzione selezionabile a pillola (Figma 439:96): sfondo card / verde quando selezionata, testo Body details. */
export function Opzione({ etichetta, forma = 'standard', selezionata, onPress, cresce = false, disabilitato = false, fondo = 'card' }: OpzioneProps) {
  const { hitSlop, onLayout } = useAreaToccabile();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabilitato}
      hitSlop={hitSlop}
      onLayout={onLayout}
      accessibilityRole="button"
      accessibilityLabel={etichetta}
      accessibilityState={{ selected: selezionata, disabled: disabilitato }}
      style={[stili.base, stili[forma], selezionata ? stili.selezionata : fondo === 'campo' ? stili.nonSelezionataSuCard : stili.nonSelezionata, cresce && stili.cresce]}
    >
      <Testo stile="bodyDetails" colore={selezionata ? colori.testo.suAzione : colori.testo.primario} style={stili.etichetta}>
        {etichetta}
      </Testo>
    </Pressable>
  );
}

const stili = StyleSheet.create({
  base: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: raggio.piccolo },
  standard: { minHeight: tocco.minimoIos, paddingHorizontal: spazio[16] },
  compatta: { minHeight: tocco.minimoIos, paddingHorizontal: spazio[4] },
  suPiuRighe: { paddingVertical: spazio[8], paddingHorizontal: spazio[16] },
  nonSelezionata: { backgroundColor: colori.sfondo.card },
  nonSelezionataSuCard: { backgroundColor: colori.sfondo.campo },
  selezionata: { backgroundColor: colori.azione.primaria },
  cresce: { flex: 1, alignSelf: 'stretch' },
  etichetta: { flexShrink: 1, textAlign: 'center' },
});
