import { Pressable, StyleSheet, View } from 'react-native';

import { useAreaToccabile } from '@/ui/areaToccabile';
import { colori, raggio, spazio } from '@/ui/theme';

export type InterruttoreProps = {
  acceso: boolean;
  onChange?: (acceso: boolean) => void;
  /** Etichetta per lo screen reader (di norma il testo della riga che lo contiene). */
  etichetta?: string;
  disabilitato?: boolean;
};

// Interruttore (Figma 498:208): 51 × 31 come iOS, pomello 27 a 2 dal bordo, ombra 0/2 sfocatura 4 al 15 %.
const LARGHEZZA = 51;
const ALTEZZA = 31;
const POMELLO = 27;
const BORDO = 2;

/** Interruttore acceso/spento. Area toccabile portata a 44 con l'hitSlop (in Figma vale l'intera riga). */
export function Interruttore({ acceso, onChange, etichetta, disabilitato = false }: InterruttoreProps) {
  const { hitSlop, onLayout } = useAreaToccabile();
  return (
    <Pressable
      onPress={() => onChange?.(!acceso)}
      disabled={disabilitato}
      hitSlop={hitSlop}
      onLayout={onLayout}
      accessibilityRole="switch"
      accessibilityLabel={etichetta}
      accessibilityState={{ checked: acceso, disabled: disabilitato }}
      style={[stili.binario, acceso ? stili.acceso : stili.spento]}
    >
      <View style={[stili.pomello, acceso ? stili.pomelloAcceso : stili.pomelloSpento]} />
    </Pressable>
  );
}

const stili = StyleSheet.create({
  binario: { width: LARGHEZZA, height: ALTEZZA, borderRadius: raggio.pieno },
  acceso: { backgroundColor: colori.azione.primaria },
  spento: { backgroundColor: colori.sfondo.campo },
  pomello: {
    position: 'absolute',
    top: BORDO,
    width: POMELLO,
    height: POMELLO,
    borderRadius: raggio.pieno,
    backgroundColor: colori.sfondo.pagina,
    shadowColor: colori.primitivi.black,
    shadowOpacity: 0.15,
    shadowRadius: spazio[4] / 2,
    shadowOffset: { width: 0, height: spazio[2] },
    elevation: 2,
  },
  pomelloAcceso: { left: LARGHEZZA - BORDO - POMELLO },
  pomelloSpento: { left: BORDO },
});
