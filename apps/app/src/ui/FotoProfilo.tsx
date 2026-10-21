import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { Testo } from '@/ui/Testo';
import { colori, raggio } from '@/ui/theme';

export type FotoProfiloProps = {
  /** Diametro (35 nella Card commento, 40 nella revisione, 44 nella Riga elenco con avatar). */
  misura: number;
  foto: string | null | undefined;
  iniziali: string | undefined;
  /** La foto è già nella memoria su disco: si mostra subito, senza dissolvenza. */
  fotoPronta?: boolean;
};

const DISSOLVENZA_FOTO_MS = 200;

/**
 * Foto quadrata tonda di una nutrizionista con memoria su disco (expo-image): al primo scaricamento le iniziali
 * (Caption SemiBold su sfondo/foto) restano visibili finché la foto non è pronta, poi la foto compare in dissolvenza;
 * se è già in cache compare subito, senza dissolvenza, anche dopo il riavvio dell'app.
 */
export function FotoProfilo({ misura, foto, iniziali, fotoPronta = false }: FotoProfiloProps) {
  return (
    <View style={[stili.foto, { width: misura, height: misura }]}>
      {iniziali ? (
        <Testo stile="captionSemiBold" colore={colori.testo.suAzione}>
          {iniziali}
        </Testo>
      ) : null}
      {foto && <Image source={{ uri: foto }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" transition={fotoPronta ? 0 : DISSOLVENZA_FOTO_MS} recyclingKey={foto} accessible={false} />}
    </View>
  );
}

const stili = StyleSheet.create({
  foto: { borderRadius: raggio.pieno, backgroundColor: colori.sfondo.foto, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
