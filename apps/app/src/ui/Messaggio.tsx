import { StyleSheet, View } from 'react-native';

import { Icona } from '@/ui/icone';
import { Testo } from '@/ui/Testo';
import { colori, raggio, spazio } from '@/ui/theme';

export type MessaggioProps = {
  testo: string;
  /** Errore: terracotta, solo per validazione ed errori. Info: neutro su card. (Figma 419:104, "Tipo") */
  tipo: 'errore' | 'info';
};

/** Messaggio a livello di schermata: icona a 20 e testo Body details, padding verticale 12. */
export function Messaggio({ testo, tipo }: MessaggioProps) {
  if (tipo === 'errore') {
    return (
      <View style={[stili.base, stili.errore]} accessibilityRole="alert">
        <Icona misura={24} nome="Avviso" dimensione={20} colore={colori.stato.errore} />
        <Testo stile="bodyDetails" colore={colori.testo.errore} style={stili.testoErrore}>
          {testo}
        </Testo>
      </View>
    );
  }
  return (
    <View style={[stili.base, stili.info]} accessibilityLiveRegion="polite">
      <Icona misura={24} nome="Info" dimensione={20} />
      <Testo stile="bodyDetails" style={stili.testoInfo}>
        {testo}
      </Testo>
    </View>
  );
}

const stili = StyleSheet.create({
  base: { alignSelf: 'stretch', flexDirection: 'row', minHeight: 48, borderRadius: raggio.foto },
  errore: { paddingVertical: spazio[12], gap: spazio[4], alignItems: 'center', justifyContent: 'center' },
  testoErrore: { flexShrink: 1 },
  info: {
    paddingVertical: spazio[12],
    paddingHorizontal: spazio[16],
    gap: spazio[12],
    alignItems: 'flex-start',
    backgroundColor: colori.sfondo.card,
  },
  testoInfo: { flex: 1 },
});
