import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import type { AutoreCommento } from '@/core/diario/commento';
import { Testo } from '@/ui/Testo';
import { colori, raggio, spazio } from '@/ui/theme';

export type CardCommentoProps = {
  testo: string;
  /** Autore da mostrare (profilo dell'autore o nutrizionista del cliente); null → "Commento della tua nutrizionista". */
  autore: AutoreCommento | null;
  /** Da leggere all'apertura: etichetta "Nuovo" con il pallino rosso (Figma 477:1916). */
  nuovo: boolean;
};

// Card commento (Figma 477:1923): card crema padding 20 raggio card, gap 8; foto 35 tonda, gap 4, intestazione
// "Commento di Margherita" (Etichetta) + "Nuovo" (pallino 8 stato/notifica + Caption attenuato, gap 4) con gap 8;
// testo Body. Senza foto: cerchio sfondo/foto con le iniziali in Caption su azione.
const FOTO = 35;
const PALLINO_NUOVO = 8;
const DISSOLVENZA_FOTO_MS = 200;

/** Commento della nutrizionista nel pannello della giornata: foto, nome, "Nuovo" se da leggere, testo. */
export function CardCommento({ testo, autore, nuovo }: CardCommentoProps) {
  const titolo = autore ? `Commento di ${autore.nome}` : 'Commento della tua nutrizionista';
  return (
    <View style={stili.card} accessible accessibilityLabel={`${titolo}${nuovo ? ', nuovo' : ''}. ${testo}`}>
      <View style={stili.intestazione}>
        <Foto autore={autore} />
        <View style={stili.titolo}>
          <Testo stile="etichetta">{titolo}</Testo>
          {nuovo && (
            <View style={stili.nuovo}>
              <View style={stili.pallinoNuovo} />
              <Testo stile="caption" colore={colori.testo.attenuato}>
                Nuovo
              </Testo>
            </View>
          )}
        </View>
      </View>
      <Testo stile="body">{testo}</Testo>
    </View>
  );
}

/**
 * Foto quadrata dell'autore con memoria su disco (expo-image): le iniziali restano visibili finché la foto non è pronta,
 * poi la foto compare in dissolvenza; dalla seconda apertura, anche dopo il riavvio, arriva subito dalla cache.
 */
function Foto({ autore }: { autore: AutoreCommento | null }) {
  return (
    <View style={stili.foto}>
      {autore?.iniziali ? (
        <Testo stile="captionSemiBold" colore={colori.testo.suAzione}>
          {autore.iniziali}
        </Testo>
      ) : null}
      {autore?.foto && (
        <Image
          source={{ uri: autore.foto }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={DISSOLVENZA_FOTO_MS}
          recyclingKey={autore.foto}
          accessible={false}
        />
      )}
    </View>
  );
}

const stili = StyleSheet.create({
  card: { alignSelf: 'stretch', padding: spazio[20], gap: spazio[8], backgroundColor: colori.sfondo.card, borderRadius: raggio.card },
  intestazione: { alignSelf: 'stretch', gap: spazio[4] },
  foto: { width: FOTO, height: FOTO, borderRadius: raggio.pieno, backgroundColor: colori.sfondo.foto, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  titolo: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: spazio[8] },
  nuovo: { flexDirection: 'row', alignItems: 'center', gap: spazio[4] },
  pallinoNuovo: { width: PALLINO_NUOVO, height: PALLINO_NUOVO, borderRadius: raggio.pieno, backgroundColor: colori.stato.notifica },
});
