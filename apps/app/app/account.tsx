import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useAzioniStato } from '@/servizi/useAzioniStato';
import { Intestazione } from '@/ui/Intestazione';
import { Pulsante } from '@/ui/Pulsante';
import { Pagina } from '@/ui/schermate/Pagina';
import { Testo } from '@/ui/Testo';
import { colori, margine, spazio } from '@/ui/theme';

/** Segnaposto della pagina Account (schermate vere allo step 4): raggiunta dal pulsante "Account" degli stati. */
export default function RottaAccount() {
  const router = useRouter();
  const { onEsci, sovrapposti } = useAzioniStato();
  return (
    <Pagina
      sovrapposti={sovrapposti}
      piede={
        <View style={stili.comandi}>
          <Pulsante etichetta="Esci" livello="terziario" onPress={onEsci} style={stili.centrato} />
        </View>
      }
    >
      <View style={stili.contenuto}>
        <Intestazione titolo="Account" onIndietro={() => router.back()} />
        <Testo stile="body" colore={colori.testo.corpoAttenuato}>
          La pagina Account arriva con lo step 4.
        </Testo>
      </View>
    </Pagina>
  );
}

const stili = StyleSheet.create({
  contenuto: { flex: 1, paddingTop: spazio[12], paddingHorizontal: margine.pagina, gap: spazio[24] },
  centrato: { alignSelf: 'center' },
  comandi: { paddingTop: spazio[12], paddingBottom: spazio[8], paddingHorizontal: margine.pagina, alignItems: 'center' },
});
