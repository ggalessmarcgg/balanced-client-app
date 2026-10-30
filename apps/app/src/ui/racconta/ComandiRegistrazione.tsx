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
      {props.stato === 'pronto' ? null : props.stato === 'registrazione' ? (
        props.inPausa ? (
          <Testo stile="link" colore={colori.testo.attenuato} accessibilityLiveRegion="polite">
            In pausa
          </Testo>
        ) : (
          <LivelloVoce livello={props.livello} />
        )
      ) : null}
      {/* "Tocca per iniziare", timer e pulsante insieme: è l'elemento che il tutorial evidenzia e sopra cui sta il fumetto
          (il timer resta visibile, 31/10/2026). */}
      <View ref={props.misura?.ref} onLayout={props.misura?.onLayout} collapsable={false} style={stili.timerEPulsante}>
        {props.stato === 'pronto' && <Invito />}
        <Timer durataMs={durataMs} />
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

function Invito() {
  return (
    <Testo stile="link" colore={colori.testo.attenuato}>
      Tocca per iniziare
    </Testo>
  );
}

function Timer({ durataMs }: { durataMs: number }) {
  return (
    <Testo stile="caption" colore={colori.testo.secondario} accessibilityLabel={`${etichettaTimer(durataMs)} minuti`}>
      {etichettaTimer(durataMs)}
    </Testo>
  );
}

/** Copia di invito, timer e pulsante resa sopra il velo del tutorial (Tutorial · 3 e · 4), nella stessa posizione dell'originale. */
export function TimerEPulsanteTutorial({ stato, durataMs }: { stato: 'pronto' | 'daInviare'; durataMs: number }) {
  return (
    <View style={stili.timerEPulsante}>
      {stato === 'pronto' && <Invito />}
      <Timer durataMs={durataMs} />
      <PulsanteRegistrazione stato={stato} />
    </View>
  );
}

const stili = StyleSheet.create({
  comandi: { alignSelf: 'stretch', alignItems: 'center', gap: spazio[4], paddingTop: spazio[16], paddingBottom: spazio[8], paddingHorizontal: margine.pagina },
  // A tutta la riga: la copia del tutorial prende la stessa larghezza e su Android "Tocca per iniziare" non va a capo
  // (con la larghezza al pixel del testo il rendering della copia lo spezzava, 31/10/2026).
  timerEPulsante: { alignSelf: 'stretch', alignItems: 'center', gap: spazio[4] },
  centrato: { alignSelf: 'center' },
});
