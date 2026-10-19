import { Redirect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { rottaPerStato } from '@/servizi/rotte';
import { leggiStato, type EsitoStato } from '@/servizi/statoCliente';
import { SchermataCaricamento, SchermataErroreCaricamento, SchermataSenzaConnessione } from '@/ui/schermate/SchermateTrasversali';

// Solo in sviluppo: EXPO_PUBLIC_ROTTA_SVILUPPO=/sviluppo/stati?stato=H npx expo start
// apre direttamente una rotta di sviluppo (serve per gli screenshot automatici dal simulatore).
const ROTTA_SVILUPPO = __DEV__ ? process.env.EXPO_PUBLIC_ROTTA_SVILUPPO : undefined;

/**
 * Avvio: una sola lettura (sessione salvata + stato del cliente) e smistamento verso la rotta dello stato.
 * Intanto la schermata di caricamento (Trasversali 2); senza rete Trasversali 1; altri errori Trasversali 3.
 */
export default function Avvio() {
  const [esito, setEsito] = useState<EsitoStato | null>(null);
  const [tentativo, setTentativo] = useState(0);

  // "Riprova": azzera l'esito e fa ripartire la lettura (l'effetto dipende dal numero del tentativo).
  const carica = useCallback(() => {
    setEsito(null);
    setTentativo((t) => t + 1);
  }, []);

  useEffect(() => {
    if (ROTTA_SVILUPPO) return;
    let attivo = true;
    leggiStato({ forza: true }).then((e) => {
      if (attivo) setEsito(e);
    });
    return () => {
      attivo = false;
    };
  }, [tentativo]);

  if (ROTTA_SVILUPPO) return <Redirect href={ROTTA_SVILUPPO as never} />;
  if (!esito) return <SchermataCaricamento />;
  switch (esito.tipo) {
    case 'nonAutenticato':
      return <Redirect href="/accesso" />;
    case 'rete':
      return <SchermataSenzaConnessione onRiprova={carica} />;
    case 'errore':
      return <SchermataErroreCaricamento onRiprova={carica} descrizione="Non riusciamo a caricare il tuo percorso. Riprova tra poco." />;
    case 'ok':
      return <Redirect href={rottaPerStato(esito.stato.codice)} />;
  }
}
