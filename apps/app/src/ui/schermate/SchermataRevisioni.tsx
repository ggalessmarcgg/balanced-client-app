import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import type { CardRevisione as DatiCard } from '@/core/revisioni/stato';
import type { NuovaPerSchermata, PassataPerSchermata } from '@/servizi/useRevisioni';
import { BarraSuperiore } from '@/ui/BarraSuperiore';
import type { VoceNavigazione } from '@/ui/BarraNavigazione';
import { CardRevisione } from '@/ui/revisioni/CardRevisione';
import { ElencoRevisioni } from '@/ui/revisioni/ElencoRevisioni';
import { Pagina } from '@/ui/schermate/Pagina';
import { BarraNavigazioneFissa, INGOMBRO_BARRA_NAVIGAZIONE } from '@/ui/schermate/SchermateTrasversali';
import { Testo } from '@/ui/Testo';
import { margine, spazio } from '@/ui/theme';

export type SchermataRevisioniProps = {
  attive: DatiCard[];
  nuove: Record<string, NuovaPerSchermata>;
  passate: PassataPerSchermata[];
  nuovaPresente: boolean;
  onApri: (id: string) => void;
  onNavigazione?: (voce: VoceNavigazione) => void;
  onNotifiche?: () => void;
  onMenu?: () => void;
  /** Pallino rosso sulla campanella (notifiche non ancora viste). */
  notificheNuove?: boolean;
  sovrapposti?: ReactNode;
};

/**
 * Revisioni (Figma 494:1944 … 494:2528): barra superiore completa, titolo "Revisioni" in Accento serif (16 sopra,
 * margini 20, gap 24), poi il contenitore con spazio 12: card attive (avanzamento, In elaborazione, Nuove) ed elenco
 * delle revisioni passate. Barra di navigazione con Revisioni attiva.
 */
export function SchermataRevisioni({ attive, nuove, passate, nuovaPresente, onApri, onNavigazione, onNotifiche, onMenu, notificheNuove = false, sovrapposti }: SchermataRevisioniProps) {
  return (
    <Pagina
      sovrapposti={
        <>
          <BarraNavigazioneFissa attiva="revisioni" revisioneNuova={nuovaPresente} onSeleziona={onNavigazione} />
          {sovrapposti}
        </>
      }
    >
      <BarraSuperiore notifiche={notificheNuove ? 'conNuove' : 'campanella'} onNotifiche={onNotifiche} onAzione={onMenu} />
      <View style={stili.contenuto}>
        <Testo stile="accentoSerif" accessibilityRole="header">
          Revisioni
        </Testo>
        <View style={stili.card}>
          {attive.map((c) => {
            if (c.tipo === 'nuova') {
              const n = nuove[c.id];
              return <CardRevisione key={c.id} stato="nuova" numero={c.numero} autore={n?.autore ?? null} anteprima={n?.anteprima ?? ''} onLeggi={() => onApri(c.id)} />;
            }
            if (c.tipo === 'inElaborazione') return <CardRevisione key={c.id} stato="inElaborazione" numero={c.numero} diari={c.diari} />;
            return <CardRevisione key={c.id ?? 'inizia'} stato={c.tipo} numero={c.numero} diari={c.diari} primaRevisione={c.primaRevisione} />;
          })}
          <ElencoRevisioni voci={passate.map((p) => ({ id: p.id, titolo: p.titolo, incipit: p.incipit }))} onApri={onApri} />
        </View>
      </View>
    </Pagina>
  );
}

const stili = StyleSheet.create({
  contenuto: { paddingTop: spazio[16], paddingHorizontal: margine.pagina, paddingBottom: INGOMBRO_BARRA_NAVIGAZIONE + spazio[16], gap: spazio[24] },
  card: { alignSelf: 'stretch', gap: spazio[12] },
});
