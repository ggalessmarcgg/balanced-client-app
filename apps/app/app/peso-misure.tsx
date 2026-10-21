import { Redirect, useRouter } from 'expo-router';
import { useCallback } from 'react';

import { statoCorrente } from '@/servizi/statoCliente';
import { usePesoMisure } from '@/servizi/useMenu';
import { SchermataPesoMisure } from '@/ui/schermate/SchermataPesoMisure';

/** Peso e misure (step 11): BMI, grafico o tabella del peso, radar o tabella delle circonferenze. Solo lettura. */
export default function RottaPesoMisure() {
  const router = useRouter();
  const stato = statoCorrente();
  const onIndietro = useCallback(() => (router.canGoBack() ? router.back() : router.replace('/')), [router]);
  if (!stato || !('profilo' in stato)) return <Redirect href="/" />;
  return <PesoMisure clientId={stato.profilo.clientId} onIndietro={onIndietro} />;
}

function PesoMisure({ clientId, onIndietro }: { clientId: string; onIndietro: () => void }) {
  const { fase, dati, ricarica } = usePesoMisure(clientId);
  const faseSchermata = fase.tipo === 'pronto' && dati ? { tipo: 'pronto' as const, dati } : fase.tipo === 'caricamento' || fase.tipo === 'pronto' ? { tipo: 'caricamento' as const } : { tipo: fase.tipo, onRiprova: ricarica };
  return <SchermataPesoMisure fase={faseSchermata} onIndietro={onIndietro} />;
}
