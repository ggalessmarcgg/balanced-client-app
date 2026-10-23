import type { ComponentRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { etichettaTimer } from '@/core/racconta/audio';
import { Pulsante } from '@/ui/Pulsante';
import { LivelloVoce } from '@/ui/racconta/LivelloVoce';
import { PulsanteRegistrazione } from '@/ui/racconta/PulsanteRegistrazione';
import { Testo } from '@/ui/Testo';
import { colori, margine, spazio } from '@/ui/theme';

/** Misura del pulsante per il tutorial (ref e onLayout sul suo contenitore). */
export type MisuraPulsante = { ref: (v: ComponentRef<typeof View> | null) => void; onLayout: () => void };

export type ComandiRegistrazioneProps = (
  | { stato: 'pronto'; onAvvia: () => void }
  | { stato: 'registrazione'; durataMs: number; inPausa: boolean; livello: number | null; onFerma: () => void }
  | { stato: 'terminata'; durataMs: number; onInvia: () => void; onRicomincia: () => void }
) & { misura?: MisuraPulsante };

/**
 * Comandi in fondo alle schermate Pronto, In registrazione e Registrazione terminata (Figma 459:743, 459:803,
 * 756:7654): "Tocca per iniziare" (o il livello voce, o "In pausa"; niente nella 5.2), il timer "m:ss / 3:00", il
 * Pulsante registrazione e, nella 5.2, "Ricomincia"; gap 4, padding 16 sopra e 8 sotto.
 */
export function ComandiRegistrazione(props: ComandiRegistrazioneProps) {
  const durataMs = props.stato === 'pronto' ? 0 : props.durataMs;
  return (
    <View style={stili.comandi}>
      {props.stato === 'pronto' ? (
        <Testo stile="link" colore={colori.testo.attenuato}>
          Tocca per iniziare
        </Testo>
      ) : props.stato === 'registrazione' ? (
        props.inPausa ? (
          <Testo stile="link" colore={colori.testo.attenuato} accessibilityLiveRegion="polite">
            In pausa
          </Testo>
        ) : (
          <LivelloVoce livello={props.livello} />
        )
      ) : null}
      <Testo stile="caption" colore={colori.testo.secondario} accessibilityLabel={`${etichettaTimer(durataMs)} minuti`}>
        {etichettaTimer(durataMs)}
      </Testo>
      <View ref={props.misura?.ref} onLayout={props.misura?.onLayout} collapsable={false}>
        {props.stato === 'pronto' ? (
          <PulsanteRegistrazione stato="pronto" onPress={props.onAvvia} />
        ) : props.stato === 'registrazione' ? (
          <PulsanteRegistrazione stato="inRegistrazione" onPress={props.onFerma} />
        ) : (
          <PulsanteRegistrazione stato="daInviare" onPress={props.onInvia} />
        )}
      </View>
      {props.stato === 'terminata' && <Pulsante etichetta="Ricomincia" livello="terziario" onPress={props.onRicomincia} accessibilityHint="Scarta la registrazione e registra di nuovo" style={stili.centrato} />}
    </View>
  );
}

const stili = StyleSheet.create({
  comandi: { alignSelf: 'stretch', alignItems: 'center', gap: spazio[4], paddingTop: spazio[16], paddingBottom: spazio[8], paddingHorizontal: margine.pagina },
  centrato: { alignSelf: 'center' },
});
