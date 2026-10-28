import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

import { TESTI_RICETTE_SALVATE } from '@/core/ricette/salvate';
import { eliminaRicetta } from '@/servizi/ricetteSalvate';
import { statoCorrente } from '@/servizi/statoCliente';
import { useRicetteSalvate } from '@/servizi/useRicette';
import type { NotificaPiano } from '@/servizi/useSostituzione';
import { SchermataRicetta } from '@/ui/schermate/SchermataRicetta';
import { SchermataCaricamento, SchermataErroreCaricamento, SchermataSenzaConnessione } from '@/ui/schermate/SchermateTrasversali';

/**
 * Una ricetta salvata (Menu · 7.2): la stessa pagina della ricetta con "Elimina ricetta", che chiede conferma con
 * l'avviso di sistema, elimina da client_saved_recipes e torna all'elenco già aggiornato.
 */
export default function RottaRicettaSalvata() {
  const stato = statoCorrente();
  const { id } = useLocalSearchParams<{ id: string }>();
  const clientId = stato && 'profilo' in stato ? stato.profilo.clientId : null;
  if (!clientId || !id) return <Redirect href="/" />;
  return <Dettaglio clientId={clientId} id={id} />;
}

function Dettaglio({ clientId, id }: { clientId: string; id: string }) {
  const router = useRouter();
  const { fase, ricette, ricarica } = useRicetteSalvate(clientId);
  const [inCorso, setInCorso] = useState(false);
  const [notifica, setNotifica] = useState<NotificaPiano | null>(null);
  const onIndietro = useCallback(() => (router.canGoBack() ? router.back() : router.replace('/ricette')), [router]);
  const elimina = useCallback(() => {
    setInCorso(true);
    eliminaRicetta(clientId, id).then((esito) => {
      setInCorso(false);
      if (esito.tipo === 'ok') onIndietro();
      else setNotifica({ chiave: Date.now(), testo: TESTI_RICETTE_SALVATE.notificaErroreEliminazione, tipo: 'errore' });
    });
  }, [clientId, id, onIndietro]);
  const chiediConferma = useCallback(() => {
    const t = TESTI_RICETTE_SALVATE.avvisoElimina;
    Alert.alert(t.titolo, t.testo, [
      { text: t.annulla, style: 'cancel' },
      { text: t.conferma, style: 'destructive', onPress: elimina },
    ]);
  }, [elimina]);
  const chiudiNotifica = useCallback(() => setNotifica(null), []);
  const ricetta = ricette?.find((r) => r.id === id);
  if (ricetta)
    return (
      <SchermataRicetta
        ricetta={ricetta.ricetta}
        pasto={ricetta.pasto}
        azione={{ tipo: 'elimina', stato: inCorso ? 'inCorso' : 'normale', onPress: chiediConferma }}
        onIndietro={onIndietro}
        notifica={notifica}
        onNotificaScomparsa={chiudiNotifica}
        onRiprovaNotifica={elimina}
      />
    );
  if (ricette && fase.tipo === 'pronto') return <Redirect href="/ricette" />;
  if (fase.tipo === 'rete') return <SchermataSenzaConnessione onRiprova={ricarica} />;
  if (fase.tipo === 'errore') return <SchermataErroreCaricamento onRiprova={ricarica} descrizione="Non riusciamo a caricare la ricetta. Riprova tra poco." />;
  return <SchermataCaricamento />;
}
