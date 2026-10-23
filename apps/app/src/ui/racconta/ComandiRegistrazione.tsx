import { StyleSheet, View } from 'react-native';

import { etichettaTimer } from '@/core/racconta/audio';
import { LivelloVoce } from '@/ui/racconta/LivelloVoce';
import { PulsanteRegistrazione } from '@/ui/racconta/PulsanteRegistrazione';
import { Testo } from '@/ui/Testo';
import { colori, margine, spazio } from '@/ui/theme';

export type ComandiRegistrazioneProps =
  | { stato: 'pronto'; onAvvia: () => void }
  | { stato: 'registrazione'; durataMs: number; inPausa: boolean; livelli: readonly number[]; onFerma: () => void };

/**
 * Comandi in fondo alle schermate Pronto e In registrazione (Figma 459:743 e 459:803): "Tocca per iniziare" (o il
 * livello voce, o "In pausa"), il timer "m:ss / 3:00" e il Pulsante registrazione; gap 4, padding 16 sopra e 8 sotto.
 */
export function ComandiRegistrazione(props: ComandiRegistrazioneProps) {
  const registrando = props.stato === 'registrazione';
  const durataMs = registrando ? props.durataMs : 0;
  return (
    <View style={stili.comandi}>
      {!registrando ? (
        <Testo stile="link" colore={colori.testo.attenuato}>
          Tocca per iniziare
        </Testo>
      ) : props.inPausa ? (
        <Testo stile="link" colore={colori.testo.attenuato} accessibilityLiveRegion="polite">
          In pausa
        </Testo>
      ) : (
        <LivelloVoce livelli={props.livelli} />
      )}
      <Testo stile="caption" colore={colori.testo.secondario} accessibilityLabel={`${etichettaTimer(durataMs)} minuti`}>
        {etichettaTimer(durataMs)}
      </Testo>
      <PulsanteRegistrazione stato={registrando ? 'inRegistrazione' : 'pronto'} onPress={registrando ? props.onFerma : props.onAvvia} />
    </View>
  );
}

const stili = StyleSheet.create({
  comandi: { alignSelf: 'stretch', alignItems: 'center', gap: spazio[4], paddingTop: spazio[16], paddingBottom: spazio[8], paddingHorizontal: margine.pagina },
});
