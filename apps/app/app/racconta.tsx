import { Redirect, Stack, useRouter } from 'expo-router';
import { useCallback, useEffect } from 'react';

import { URL_PRIVACY } from '@/core/account/account';
import { gestoIndietroDisattivato } from '@/core/racconta/flusso';
import { apriPaginaWeb } from '@/servizi/account';
import { statoCorrente } from '@/servizi/statoCliente';
import { useConsensoAI } from '@/servizi/useConsensoAI';
import { useRacconta } from '@/servizi/useRacconta';
import { PannelloConsensoAI } from '@/ui/consenso/ConsensoAI';
import { SchermataRacconta } from '@/ui/schermate/SchermataRacconta';

const TITOLO_CONSENSO = 'Racconta la tua giornata';

/**
 * "Racconta" dalla Card diario di Oggi (sezione Figma 3.1 · Diario vocale, step 10): dal permesso del microfono a
 * "Il tuo racconto" (lotto 1) e, con "Crea il mio diario", "Preparando il tuo diario" e il riepilogo (lotto 2).
 * Step 6: senza consenso valido alle funzioni AI compare il pannello del consenso prima di partire (anche quando il
 * server risponde consenso_mancante); "Non ora" torna a Oggi.
 */
export default function RottaRacconta() {
  const stato = statoCorrente();
  if (stato?.codice !== 'J') return <Redirect href="/" />;
  return <Racconta clientId={stato.profilo.clientId} />;
}

function Racconta({ clientId }: { clientId: string }) {
  const router = useRouter();
  const { stato, tutorial, azioni } = useRacconta(clientId);
  const consenso = useConsensoAI(clientId);
  const onIndietro = useCallback(() => router.back(), [router]);

  // Diario compilato e già nella bozza: il riepilogo prende il posto di Racconta, così "Chiudi" e la freccia tornano a Oggi.
  const compilato = stato.tipo === 'compilato';
  useEffect(() => {
    if (compilato) router.replace('/racconta-riepilogo');
  }, [compilato, router]);

  const consensoRifiutatoDalServer = (stato.tipo === 'errore' || stato.tipo === 'erroreCompilazione') && stato.errore.esito === 'consensoMancante';
  const consensoRichiesto = (consenso.valido === false && stato.tipo !== 'compilazione' && stato.tipo !== 'compilato') || consensoRifiutatoDalServer;
  const { riprova } = azioni;
  const onAccetto = useCallback(() => {
    consenso.accetta().then((ok) => {
      if (ok && consensoRifiutatoDalServer) riprova();
    });
  }, [consenso, consensoRifiutatoDalServer, riprova]);
  const onInformativa = useCallback(() => void apriPaginaWeb(URL_PRIVACY), []);

  return (
    <>
      {/* Il gesto di scorrimento indietro di iOS non si può annullare una volta partito: mentre si registra, sulla 5.2 e
          durante la compilazione resta solo la freccia (che mostra l'avviso prima di uscire); negli altri stati il gesto è attivo. */}
      <Stack.Screen options={{ gestureEnabled: !gestoIndietroDisattivato(stato) }} />
      <SchermataRacconta
        stato={stato}
        azioni={azioni}
        tutorial={consensoRichiesto ? null : tutorial}
        onIndietro={onIndietro}
        onScrivi={onIndietro}
        onCreaDiario={azioni.creaDiario}
        sovrapposti={<PannelloConsensoAI aperto={consensoRichiesto} funzione="racconta" titolo={TITOLO_CONSENSO} onAccetto={onAccetto} onNonOra={onIndietro} onInformativa={onInformativa} />}
      />
    </>
  );
}
