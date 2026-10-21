import { Slot, usePathname, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { percorsoDiSviluppo, percorsoDiVoce, voceDaPercorso, type VoceNavigazione } from '@/core/navigazione/voci';
import { useNuovaRevisione } from '@/servizi/memoriaRevisioni';
import { statoCorrente } from '@/servizi/statoCliente';
import { BarraNavigazioneFissa } from '@/ui/schermate/SchermateTrasversali';
import { BarraPersistenteContesto, FornitoreSovrapposti, PortaleSovrapposti } from '@/ui/schermate/Sovrapposti';
import { colori } from '@/ui/theme';

/**
 * Schede dell'abbonato (Oggi, Piano, Revisioni, Account): le schermate cambiano sotto (Slot), la barra di navigazione
 * è una sola e resta montata, così l'evidenza scorre fino alla voce toccata. Gli elementi sovrapposti delle schermate
 * (pannello della giornata, Notifica breve, dialogo) arrivano al portale, reso dopo la barra per starle sopra.
 * La barra c'è solo per l'abbonato (stato J); l'Account raggiunto dagli altri stati ne resta senza.
 */
export default function LayoutAbbonato() {
  const pathname = usePathname();
  const router = useRouter();
  const nuova = useNuovaRevisione();
  const voce = voceDaPercorso(pathname);
  const conBarra = (statoCorrente()?.codice === 'J' || (__DEV__ && percorsoDiSviluppo(pathname))) && voce !== null;
  const onSeleziona = useCallback(
    (scelta: VoceNavigazione) => {
      const percorso = percorsoDiVoce(scelta, pathname);
      if (percorso !== pathname) router.replace(percorso as never);
    },
    [pathname, router],
  );
  return (
    <BarraPersistenteContesto.Provider value={conBarra ? 'conBarra' : 'senzaBarra'}>
      <FornitoreSovrapposti>
        <View style={stili.schede}>
          <Slot />
          {conBarra && voce && <BarraNavigazioneFissa persistente attiva={voce} revisioneNuova={nuova} onSeleziona={onSeleziona} />}
          <PortaleSovrapposti />
        </View>
      </FornitoreSovrapposti>
    </BarraPersistenteContesto.Provider>
  );
}

const stili = StyleSheet.create({
  schede: { flex: 1, backgroundColor: colori.sfondo.pagina },
});
