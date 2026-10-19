import { useMemo, useState } from 'react';
import { PanResponder, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';

import { SAZIETA_MAX, SAZIETA_MIN } from '@/core/diario/modello';
import { Testo } from '@/ui/Testo';
import { colori, raggio, spazio, testi } from '@/ui/theme';

export type CursoreSazietaProps = {
  /** 1..10, null = stato "Vuoto": pallino a sinistra senza numero, nessun riempimento; satiety_level resta null finché non si trascina. */
  valore: number | null;
  onChange: (valore: number) => void;
  etichettaMinimo?: string;
  etichettaMassimo?: string;
};

// Cursore sazietà (Figma 691:7467, stati Vuoto | Con valore): traccia alta 28 con base 6 sempre grigia (linea/avanzamento),
// riempimento verde fino al pallino, pallino 24 verde con il valore in SemiBold 9,5 (misura del solo pallino, senza stile
// Figma), estremi in Caption al 60 % con gap 8.
const ALTEZZA_TRACCIA = 28;
const SPESSORE = 6;
const PALLINO = 24;
const CORPO_VALORE = 9.5;

/** Cursore della sazietà 1–10: tocco o trascinamento sulla traccia, accessibile come controllo regolabile. */
export function CursoreSazieta({ valore, onChange, etichettaMinimo = 'Poco sazio', etichettaMassimo = 'Pieno' }: CursoreSazietaProps) {
  const [larghezza, setLarghezza] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setLarghezza(e.nativeEvent.layout.width);

  // Il gestore del tocco viene ricreato quando cambiano la larghezza misurata o la callback.
  const gesto = useMemo(() => {
    const daX = (x: number) => {
      if (larghezza <= 0) return;
      const v = Math.round((x / larghezza) * SAZIETA_MAX);
      onChange(Math.min(SAZIETA_MAX, Math.max(SAZIETA_MIN, v)));
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => daX(e.nativeEvent.locationX),
      onPanResponderMove: (e) => daX(e.nativeEvent.locationX),
    });
  }, [onChange, larghezza]);

  const vuoto = valore === null;
  const riempimento = vuoto ? 0 : (valore / SAZIETA_MAX) * larghezza;
  const sinistraPallino = vuoto ? 0 : Math.min(Math.max(riempimento - PALLINO / 2, 0), Math.max(larghezza - PALLINO, 0));

  return (
    <View style={stili.cursore}>
      <View
        style={stili.traccia}
        onLayout={onLayout}
        {...gesto.panHandlers}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Sazietà"
        accessibilityValue={{ min: SAZIETA_MIN, max: SAZIETA_MAX, now: valore ?? undefined, text: vuoto ? 'Non indicata' : `${valore} su ${SAZIETA_MAX}` }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => {
          const attuale = valore ?? SAZIETA_MIN - 1;
          if (e.nativeEvent.actionName === 'increment') onChange(Math.min(SAZIETA_MAX, attuale + 1));
          if (e.nativeEvent.actionName === 'decrement') onChange(Math.max(SAZIETA_MIN, attuale - 1));
        }}
      >
        <View style={stili.base} />
        {!vuoto && <View style={[stili.riempimento, { width: riempimento }]} />}
        <View style={[stili.pallino, { left: sinistraPallino }]}>
          {!vuoto && (
            <Text style={stili.valore} allowFontScaling={false}>
              {valore}
            </Text>
          )}
        </View>
      </View>
      <View style={stili.estremi}>
        <Testo stile="caption" colore={colori.testo.secondario}>
          {etichettaMinimo}
        </Testo>
        <Testo stile="caption" colore={colori.testo.secondario}>
          {etichettaMassimo}
        </Testo>
      </View>
    </View>
  );
}

const stili = StyleSheet.create({
  cursore: { alignSelf: 'stretch', gap: spazio[8] },
  traccia: { alignSelf: 'stretch', height: ALTEZZA_TRACCIA, justifyContent: 'center' },
  base: { position: 'absolute', left: 0, right: 0, height: SPESSORE, borderRadius: raggio.pieno, backgroundColor: colori.linea.avanzamento },
  riempimento: { position: 'absolute', left: 0, height: SPESSORE, borderRadius: raggio.pieno, backgroundColor: colori.azione.primaria },
  pallino: {
    position: 'absolute',
    top: (ALTEZZA_TRACCIA - PALLINO) / 2,
    width: PALLINO,
    height: PALLINO,
    borderRadius: raggio.pieno,
    backgroundColor: colori.azione.primaria,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valore: { fontFamily: testi.captionSemiBold.fontFamily, fontSize: CORPO_VALORE, lineHeight: PALLINO, color: colori.testo.suAzione, textAlign: 'center' },
  estremi: { alignSelf: 'stretch', flexDirection: 'row', justifyContent: 'space-between' },
});
