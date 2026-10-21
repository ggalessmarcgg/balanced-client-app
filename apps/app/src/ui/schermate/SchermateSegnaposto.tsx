import { StyleSheet, View } from 'react-native';

import { BarraSuperiore } from '@/ui/BarraSuperiore';
import { Intestazione } from '@/ui/Intestazione';
import { Pagina } from '@/ui/schermate/Pagina';
import { BarraNavigazioneFissa, INGOMBRO_BARRA_NAVIGAZIONE } from '@/ui/schermate/SchermateTrasversali';
import { Testo } from '@/ui/Testo';
import { colori, margine, spazio } from '@/ui/theme';

export type SchermataRaccontaSegnapostoProps = { onIndietro: () => void };

/** Segnaposto di "Racconta" (diario vocale, sezione Figma 3.1): le schermate vere arrivano con lo step 10. */
export function SchermataRaccontaSegnaposto({ onIndietro }: SchermataRaccontaSegnapostoProps) {
  return (
    <Pagina>
      <View style={stili.contenutoIntestazione}>
        <Intestazione titolo="Racconta" onIndietro={onIndietro} />
        <Testo stile="body" colore={colori.testo.corpoAttenuato}>
          Qui potrai raccontare la tua giornata a voce e lasciare che il diario si compili da solo. Arriva con lo step 10.
        </Testo>
        <Testo stile="caption" colore={colori.testo.secondario}>
          Segnaposto · Racconta · sezione Figma 3.1 · Diario vocale
        </Testo>
      </View>
    </Pagina>
  );
}

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
  contenutoIntestazione: { flex: 1, paddingTop: spazio[12], paddingHorizontal: margine.pagina, gap: spazio[24] },
});
