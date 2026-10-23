import { Redirect, Stack, useRouter } from 'expo-router';
import { useCallback, useEffect } from 'react';

import { gestoIndietroDisattivato } from '@/core/racconta/flusso';
import { statoCorrente } from '@/servizi/statoCliente';
import { useRacconta } from '@/servizi/useRacconta';
import { SchermataRacconta } from '@/ui/schermate/SchermataRacconta';

/**
 * "Racconta" dalla Card diario di Oggi (sezione Figma 3.1 · Diario vocale, step 10): dal permesso del microfono a
 * "Il tuo racconto" (lotto 1) e, con "Crea il mio diario", "Preparando il tuo diario" e il riepilogo (lotto 2).
 */
export default function RottaRacconta() {
  const stato = statoCorrente();
  if (stato?.codice !== 'J') return <Redirect href="/" />;
  return <Racconta clientId={stato.profilo.clientId} />;
}

function Racconta({ clientId }: { clientId: string }) {
  const router = useRouter();
  const { stato, tutorial, azioni } = useRacconta(clientId);
  const onIndietro = useCallback(() => router.back(), [router]);

  // Diario compilato e già nella bozza: il riepilogo prende il posto di Racconta, così "Chiudi" e la freccia tornano a Oggi.
  const compilato = stato.tipo === 'compilato';
  useEffect(() => {
    if (compilato) router.replace('/racconta-riepilogo');
  }, [compilato, router]);

  return (
    <>
      {/* Il gesto di scorrimento indietro di iOS non si può annullare una volta partito: mentre si registra, sulla 5.2 e
          durante la compilazione resta solo la freccia (che mostra l'avviso prima di uscire); negli altri stati il gesto è attivo. */}
      <Stack.Screen options={{ gestureEnabled: !gestoIndietroDisattivato(stato) }} />
      <SchermataRacconta stato={stato} azioni={azioni} tutorial={tutorial} onIndietro={onIndietro} onScrivi={onIndietro} onCreaDiario={azioni.creaDiario} />
    </>
  );
}
