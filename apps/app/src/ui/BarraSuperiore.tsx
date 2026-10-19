import { Pressable, StyleSheet, View } from 'react-native';

import { Icona } from '@/ui/icone';
import { Logo } from '@/ui/Logo';
import { colori, margine, misuraIcona, raggio, spazio, tocco } from '@/ui/theme';

export type BarraSuperioreProps = {
  /** Campanella | Con nuove (pallino rosso) | Nascosta (l'area 44 resta, così la larghezza non cambia). */
  notifiche?: 'campanella' | 'conNuove' | 'nascosta';
  /** Menu | Chiudi | Nascosta. */
  azione?: 'menu' | 'chiudi' | 'nascosta';
  onNotifiche?: () => void;
  onAzione?: () => void;
};

// Pallino "Da leggere" del Pulsante notifiche (Figma 474:177): 10 × 10 a (15, 0) nel riquadro 24 dell'icona,
// contorno esterno 2 color sfondo/pagina → riquadro di 14 a (13, −2).
const PALLINO = 10;
const CONTORNO_PALLINO = 2;

/**
 * Barra superiore delle schermate in-app (Figma 625:382): Logo a sinistra, spazio a riempimento, due aree
 * toccabili 44 × 44 (notifiche e azione). Padding 4 / 8 / 4 / margine pagina, gap 4, altezza 52.
 */
export function BarraSuperiore({ notifiche = 'campanella', azione = 'menu', onNotifiche, onAzione }: BarraSuperioreProps) {
  return (
    <View style={stili.barra}>
      <Logo etichetta="Balanced" />
      <View style={stili.spazio} />
      {notifiche === 'nascosta' ? (
        <View style={stili.area} />
      ) : (
        <Pressable
          onPress={onNotifiche}
          style={stili.area}
          accessibilityRole="button"
          accessibilityLabel={notifiche === 'conNuove' ? 'Notifiche, nuove da leggere' : 'Notifiche'}
        >
          <View style={stili.icona}>
            <Icona misura={24} nome="Campanella" />
            {notifiche === 'conNuove' && <View style={stili.pallino} />}
          </View>
        </Pressable>
      )}
      {azione === 'nascosta' ? (
        <View style={stili.area} />
      ) : (
        <Pressable onPress={onAzione} style={stili.area} accessibilityRole="button" accessibilityLabel={azione === 'menu' ? 'Menu' : 'Chiudi'}>
          <Icona misura={24} nome={azione === 'menu' ? 'Menu' : 'Chiudi'} />
        </Pressable>
      )}
    </View>
  );
}

const stili = StyleSheet.create({
  barra: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spazio[4],
    minHeight: 52,
    paddingTop: spazio[4],
    paddingBottom: spazio[4],
    paddingRight: spazio[8],
    paddingLeft: margine.pagina,
  },
  spazio: { flex: 1 },
  area: { width: tocco.minimoIos, height: tocco.minimoIos, alignItems: 'center', justifyContent: 'center' },
  icona: { width: misuraIcona[24], height: misuraIcona[24] },
  pallino: {
    position: 'absolute',
    left: 15 - CONTORNO_PALLINO,
    top: -CONTORNO_PALLINO,
    width: PALLINO + 2 * CONTORNO_PALLINO,
    height: PALLINO + 2 * CONTORNO_PALLINO,
    borderRadius: raggio.pieno,
    borderWidth: CONTORNO_PALLINO,
    borderColor: colori.sfondo.pagina,
    backgroundColor: colori.stato.notifica,
  },
});
