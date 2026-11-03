import { Redirect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { misura } from '@/servizi/analisi';
import { leggiConsenso } from '@/servizi/consenso';
import { impostaStatoCliente, segnalaErrore } from '@/servizi/monitoraggio';
import { registraDispositivo } from '@/servizi/dispositivo';
import { primoAccessoVisto } from '@/servizi/primoAccesso';
import { rottaPerStato } from '@/servizi/rotte';
import { leggiStato, type EsitoStato } from '@/servizi/statoCliente';
import { SchermataErrore } from '@/ui/schermate/SchermataErrore';
import { SchermataCaricamento, SchermataErroreCaricamento, SchermataSenzaConnessione } from '@/ui/schermate/SchermateTrasversali';

// Solo in sviluppo: EXPO_PUBLIC_ROTTA_SVILUPPO=/sviluppo/stati?stato=H npx expo start
// apre direttamente una rotta di sviluppo (serve per gli screenshot automatici dal simulatore).
const ROTTA_SVILUPPO = __DEV__ ? process.env.EXPO_PUBLIC_ROTTA_SVILUPPO : undefined;

type EsitoAvvio = { esito: EsitoStato; carosello: boolean } | { esito: { tipo: 'imprevisto' }; carosello: false };

/**
 * Avvio: una sola lettura (sessione salvata + stato del cliente) e smistamento verso la rotta dello stato; con un
 * cliente in sessione si registra il telefono per le notifiche e si legge il consenso alle funzioni AI (step 6), e
 * al primo accesso su questo telefono si passa dal carosello (contratto §7). Intanto la schermata di caricamento
 * (Trasversali 2); senza rete Trasversali 1; altri errori Trasversali 3. Un'eccezione imprevista nella lettura (es.
 * portachiavi) non lascia più l'app sulla schermata di avvio per sempre: arriva a Sentry (step 4) e si mostra la
 * schermata "Qualcosa è andato storto" con "Riprova".
 */
export default function Avvio() {
  const [avvio, setAvvio] = useState<EsitoAvvio | null>(null);
  const [tentativo, setTentativo] = useState(0);

  // "Riprova": azzera l'esito e fa ripartire la lettura (l'effetto dipende dal numero del tentativo).
  const carica = useCallback(() => {
    setAvvio(null);
    setTentativo((t) => t + 1);
  }, []);

  useEffect(() => {
    if (ROTTA_SVILUPPO) return;
    let attivo = true;
    Promise.all([leggiStato({ forza: true }), primoAccessoVisto()])
      .then(([esito, visto]) => {
        if (!attivo) return;
        if (esito.tipo === 'ok' && 'profilo' in esito.stato) {
          const { clientId } = esito.stato.profilo;
          void registraDispositivo(clientId);
          void leggiConsenso(clientId);
        }
        impostaStatoCliente(esito.tipo === 'ok' ? esito.stato.codice : null);
        if (esito.tipo === 'rete' || esito.tipo === 'errore') misura('errore_chiamata', { funzione: 'avvio', codice: esito.tipo === 'rete' ? 'rete' : 'altro' });
        setAvvio({ esito, carosello: esito.tipo === 'ok' && 'profilo' in esito.stato && !visto });
      })
      .catch((errore: unknown) => {
        segnalaErrore(errore, { origine: 'avvio' });
        if (attivo) setAvvio({ esito: { tipo: 'imprevisto' }, carosello: false });
      });
    return () => {
      attivo = false;
    };
  }, [tentativo]);

  if (ROTTA_SVILUPPO) return <Redirect href={ROTTA_SVILUPPO as never} />;
  if (!avvio) return <SchermataCaricamento />;
  const { esito } = avvio;
  switch (esito.tipo) {
    case 'nonAutenticato':
      return <Redirect href="/accesso" />;
    case 'rete':
      return <SchermataSenzaConnessione onRiprova={carica} />;
    case 'errore':
      return <SchermataErroreCaricamento onRiprova={carica} descrizione="Non riusciamo a caricare il tuo percorso. Riprova tra poco." />;
    case 'imprevisto':
      return <SchermataErrore onRiprova={carica} />;
    case 'ok':
      if (avvio.carosello) return <Redirect href="/primo-accesso" />;
      return <Redirect href={rottaPerStato(esito.stato.codice)} />;
  }
}
