import { Slot, useFocusEffect, usePathname, useRouter } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { BackHandler, Platform, StyleSheet, View } from 'react-native';

import { percorsoDiSviluppo, percorsoDiVoce, voceDaPercorso, type VoceNavigazione } from '@/core/navigazione/voci';
import { segnalaAbbonatoMontato } from '@/servizi/aperturaNotifiche';
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
  // Notifiche (step 6, contratto §6): la destinazione di una notifica toccata ad app chiusa si apre appena le schede
  // dell'abbonato sono montate (lo stato del cliente è già caricato).
  useEffect(() => {
    segnalaAbbonatoMontato(true);
    return () => segnalaAbbonatoMontato(false);
  }, []);
  const onSeleziona = useCallback(
    (scelta: VoceNavigazione) => {
      const percorso = percorsoDiVoce(scelta, pathname);
      if (percorso !== pathname) router.replace(percorso as never);
    },
    [pathname, router],
  );
  // "Indietro" di sistema su Android (tasto o gesto dal bordo; correzione del 30/10/2026): le schede non hanno uno
  // stack sotto, quindi senza questo l'app si chiudeva. Da Piano, Revisioni e Account si torna a Oggi; da Oggi vale
  // il comportamento standard (l'app va in secondo piano). Registrato solo mentre il gruppo è a fuoco: con una pagina
  // aperta sopra (menu, ricetta, Indicazioni…) resta la navigazione normale. Tutorial e pannelli dal basso hanno il
  // loro gestore, registrato dopo questo e quindi chiamato prima: chiudono se stessi. Su iOS non fa nulla.
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') return undefined;
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (voce === null || voce === 'oggi') return false;
        router.replace(percorsoDiVoce('oggi', pathname) as never);
        return true;
      });
      return () => sub.remove();
    }, [voce, pathname, router]),
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
