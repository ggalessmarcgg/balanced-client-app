import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';

import type { Profilo } from '@/core/stato/stato';
import { statoCorrente } from '@/servizi/statoCliente';
import { useLetturaRevisione } from '@/servizi/useLetturaRevisione';
import { SchermataLetturaRevisione } from '@/ui/schermate/SchermataLetturaRevisione';

/**
 * Lettura di una revisione per id (step 7): dalla card Nuova, dall'elenco delle passate o dalla rotta diretta
 * `/revisioni/<id>` (notifica di invio, step 6). Se la revisione non è più Nuova si apre comunque; se non esiste o
 * non è stata inviata si torna all'elenco.
 */
export default function RottaLetturaRevisione() {
  const stato = statoCorrente();
  const { id } = useLocalSearchParams<{ id: string }>();
  if (stato?.codice !== 'J') return <Redirect href="/" />;
  if (!id) return <Redirect href="/revisioni" />;
  return <Lettura id={id} profilo={stato.profilo} />;
}

function Lettura({ id, profilo }: { id: string; profilo: Profilo }) {
  const router = useRouter();
  const lettura = useLetturaRevisione(id, profilo.clientId, profilo.nutrizionista);
  const onIndietro = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/revisioni');
  }, [router]);

  if (lettura.fase.tipo === 'nonLeggibile') return <Redirect href="/revisioni" />;
  const fase =
    lettura.fase.tipo === 'pronto'
      ? { tipo: 'pronto' as const, data: lettura.fase.revisione.data, autore: lettura.fase.revisione.autore, testo: lettura.fase.revisione.testo }
      : lettura.fase.tipo === 'caricamento'
        ? { tipo: 'caricamento' as const }
        : { tipo: lettura.fase.tipo, onRiprova: lettura.riprova };
  return <SchermataLetturaRevisione numero={lettura.numero} fase={fase} onIndietro={onIndietro} onFondoRaggiunto={lettura.onFondoRaggiunto} />;
}
