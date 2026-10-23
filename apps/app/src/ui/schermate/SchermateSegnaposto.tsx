import { StyleSheet, View } from 'react-native';

import { BarraSuperiore } from '@/ui/BarraSuperiore';
import { Pagina } from '@/ui/schermate/Pagina';
import { BarraNavigazioneFissa, INGOMBRO_BARRA_NAVIGAZIONE } from '@/ui/schermate/SchermateTrasversali';
import { Testo } from '@/ui/Testo';
import { colori, margine, spazio } from '@/ui/theme';

/** Segnaposto della scheda Piano (sezione Figma 4 · Piano, step successivo): titolo in Accento serif e testo, con la barra di navigazione. */
export function SchermataPianoSegnaposto({ onMenu, onNotifiche, notificheNuove = false, revisioneNuova = false }: { onMenu?: () => void; onNotifiche?: () => void; notificheNuove?: boolean; revisioneNuova?: boolean } = {}) {
  return (
    <Pagina sovrapposti={<BarraNavigazioneFissa attiva="piano" revisioneNuova={revisioneNuova} />}>
      <BarraSuperiore notifiche={notificheNuove ? 'conNuove' : 'campanella'} onNotifiche={onNotifiche} onAzione={onMenu} />
      <View style={stili.contenutoScheda}>
        <Testo stile="accentoSerif" accessibilityRole="header">
          Piano
        </Testo>
        <Testo stile="body" colore={colori.testo.corpoAttenuato}>
          Qui troverai il tuo piano alimentare. Arriva con uno step successivo.
        </Testo>
        <Testo stile="caption" colore={colori.testo.secondario}>
          Segnaposto · Piano · sezione Figma 4
        </Testo>
      </View>
    </Pagina>
  );
}

const stili = StyleSheet.create({
  contenutoScheda: { flex: 1, paddingTop: spazio[16], paddingHorizontal: margine.pagina, paddingBottom: INGOMBRO_BARRA_NAVIGAZIONE + spazio[16], gap: spazio[24] },
});
