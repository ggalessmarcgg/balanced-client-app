import type { ComponentRef } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { useAreaToccabile } from '@/ui/areaToccabile';
import { Icona } from '@/ui/icone';
import { Testo } from '@/ui/Testo';
import { colori, opacita, spazio } from '@/ui/theme';

/**
 * Etichetta AI (Figma 532:3430): introduce una funzione AI con l'icona a sfumatura (Icona AI / 20 / Sostituisci) e il
 * nome della funzione in App/Etichetta AI su azione/primaria, gap 4. Usata come testata dei pannelli "Sostituisci" e
 * "Ricetta" e della pagina della ricetta.
 */
export function EtichettaAI({ etichetta }: { etichetta: string }) {
  return (
    <View style={stili.riga} accessibilityRole="header">
      <Contenuto etichetta={etichetta} />
    </View>
  );
}

export type EtichettaAIToccabileProps = {
  etichetta: string;
  onPress?: () => void;
  accessibilityHint?: string;
  /** Contenitore misurabile per il tutorial (Tutorial · 2 · ricette 586:5598). */
  riferimento?: (v: ComponentRef<typeof View> | null) => void;
  onLayout?: (e: LayoutChangeEvent) => void;
};

/**
 * Etichetta AI toccabile (accesso "Ricetta" sotto il selettore del Piano, Figma 817:7860): stesso disegno, area
 * toccabile estesa a 44 con l'hitSlop (il disegno è alto 20), opacità del pulsante premuto durante il tocco.
 */
export function EtichettaAIToccabile({ etichetta, onPress, accessibilityHint, riferimento, onLayout }: EtichettaAIToccabileProps) {
  const { hitSlop, onLayout: misuraArea } = useAreaToccabile();
  return (
    <View ref={riferimento} onLayout={onLayout} collapsable={false}>
      <Pressable
        onPress={onPress}
        hitSlop={hitSlop}
        onLayout={misuraArea}
        accessibilityRole="button"
        accessibilityLabel={etichetta}
        accessibilityHint={accessibilityHint}
        style={({ pressed }) => [stili.riga, pressed && stili.premuta]}
      >
        <Contenuto etichetta={etichetta} />
      </Pressable>
    </View>
  );
}

function Contenuto({ etichetta }: { etichetta: string }) {
  return (
    <>
      <Icona misura={20} nome="Sostituisci" />
      <Testo stile="etichettaAI" colore={colori.azione.primaria}>
        {etichetta}
      </Testo>
    </>
  );
}

const stili = StyleSheet.create({
  riga: { flexDirection: 'row', alignItems: 'center', gap: spazio[4] },
  premuta: { opacity: opacita.pulsantePremuto },
});
