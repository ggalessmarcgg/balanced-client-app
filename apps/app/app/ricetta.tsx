import { Redirect, useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { TESTI_RICETTE_SALVATE } from '@/core/ricette/salvate';
import { segnalaRicettaMostrata, useRicettaPronta } from '@/servizi/ricette';
import { salvaRicetta } from '@/servizi/ricetteSalvate';
import { statoCorrente } from '@/servizi/statoCliente';
import type { NotificaPiano } from '@/servizi/useSostituzione';
import { SchermataRicetta, type AzioneRicetta } from '@/ui/schermate/SchermataRicetta';

/**
 * La ricetta appena preparata (Piano · 5.4 / 5.5 / 5.6): legge la memoria del servizio, nessuna richiesta. "Salva
 * ricetta" inserisce in client_saved_recipes con la sessione del cliente (unica scrittura dell'app) e mostra la Notifica
 * breve; senza rete o in errore, la notifica d'errore e il pulsante di nuovo attivo.
 */
export default function RottaRicetta() {
  const router = useRouter();
  const navigation = useNavigation();
  const stato = statoCorrente();
  const pronta = useRicettaPronta();
  // A transizione d'ingresso completata il pannello "Ricetta" del Piano si chiude sotto questa pagina, senza animazione
  // (decisione del 29/10/2026: niente Piano visibile tra pannello e ricetta).
  useEffect(() => {
    const annulla = navigation.addListener('transitionEnd' as never, ((e: { data?: { closing?: boolean } }) => {
      if (!e.data?.closing) segnalaRicettaMostrata();
    }) as never);
    return annulla;
  }, [navigation]);
  const [statoSalvataggio, setStatoSalvataggio] = useState<AzioneRicetta['stato'] & ('normale' | 'inCorso' | 'salvata')>('normale');
  const [notifica, setNotifica] = useState<NotificaPiano | null>(null);
  const onIndietro = useCallback(() => (router.canGoBack() ? router.back() : router.replace('/piano')), [router]);
  const clientId = stato && 'profilo' in stato ? stato.profilo.clientId : null;
  const salva = useCallback(() => {
    if (!pronta || !clientId) return;
    setStatoSalvataggio('inCorso');
    salvaRicetta(clientId, pronta).then((esito) => {
      if (esito.tipo === 'ok') {
        setStatoSalvataggio('salvata');
        setNotifica({ chiave: Date.now(), testo: TESTI_RICETTE_SALVATE.notificaSalvata, tipo: 'conferma' });
      } else {
        setStatoSalvataggio('normale');
        setNotifica({ chiave: Date.now(), testo: TESTI_RICETTE_SALVATE.notificaErroreSalvataggio, tipo: 'errore' });
      }
    });
  }, [pronta, clientId]);
  const chiudiNotifica = useCallback(() => setNotifica(null), []);
  if (stato?.codice !== 'J' || !pronta) return <Redirect href="/piano" />;
  return (
    <SchermataRicetta
      ricetta={pronta.ricetta}
      pasto={pronta.pasto.nome}
      azione={{ tipo: 'salva', stato: statoSalvataggio, onPress: salva }}
      onIndietro={onIndietro}
      notifica={notifica}
      onNotificaScomparsa={chiudiNotifica}
      onRiprovaNotifica={salva}
    />
  );
}
