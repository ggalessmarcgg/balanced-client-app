import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';

import { useAreaToccabile } from '@/ui/areaToccabile';
import { Icona } from '@/ui/icone';
import { Testo } from '@/ui/Testo';
import { colori, raggio, spazio } from '@/ui/theme';

export type NotificaBreveProps = {
  testo: string;
  /** Conferma (spunta) oppure Errore (avviso con "Riprova"). Figma 563:293, "Tipo". */
  tipo: 'conferma' | 'errore';
  onRiprova?: () => void;
  /** Chiamata quando la notifica sparisce da sola (dopo `durataMs`); se assente resta visibile. */
  onScomparsa?: () => void;
  durataMs?: number;
};

const DURATA_INGRESSO_MS = 200;

/**
 * Messaggio breve in basso, sopra la barra di navigazione: pillola scura con icona a 18 e testo su azione,
 * che sparisce da sola dopo qualche secondo (dissolvenza). La posizione è a cura della schermata.
 */
export function NotificaBreve({ testo, tipo, onRiprova, onScomparsa, durataMs = 4000 }: NotificaBreveProps) {
  const [opacita] = useState(() => new Animated.Value(0));
  const { hitSlop, onLayout } = useAreaToccabile();

  useEffect(() => {
    Animated.timing(opacita, { toValue: 1, duration: DURATA_INGRESSO_MS, useNativeDriver: true }).start();
    if (!onScomparsa) return;
    const timer = setTimeout(() => {
      Animated.timing(opacita, { toValue: 0, duration: DURATA_INGRESSO_MS, useNativeDriver: true }).start(() => onScomparsa());
    }, durataMs);
    return () => clearTimeout(timer);
  }, [opacita, onScomparsa, durataMs]);

  return (
    <Animated.View style={[stili.pillola, { opacity: opacita }]} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Icona misura={24} nome={tipo === 'conferma' ? 'Spunta' : 'Avviso'} dimensione={18} colore={colori.testo.suAzione} />
      <Testo stile="bodyDetails" colore={colori.testo.suAzione} style={stili.testo}>
        {testo}
      </Testo>
      {tipo === 'errore' && (
        <Pressable onPress={onRiprova} hitSlop={hitSlop} onLayout={onLayout} accessibilityRole="button" accessibilityLabel="Riprova">
          <Testo stile="link" colore={colori.badge.sfondo}>
            Riprova
          </Testo>
        </Pressable>
      )}
    </Animated.View>
  );
}

const stili = StyleSheet.create({
  pillola: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spazio[10],
    minHeight: 48,
    paddingVertical: spazio[12],
    paddingHorizontal: spazio[16],
    backgroundColor: colori.testo.primario,
    borderRadius: raggio.pieno,
  },
  testo: { flex: 1 },
});
