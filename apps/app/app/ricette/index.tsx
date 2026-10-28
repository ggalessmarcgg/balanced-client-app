import { Redirect, useRouter } from 'expo-router';
import { useCallback } from 'react';

import type { RicettaSalvata } from '@/core/ricette/salvate';
import { statoCorrente } from '@/servizi/statoCliente';
import { useRicetteSalvate } from '@/servizi/useRicette';
import { SchermataRicetteSalvate, type SchermataRicetteSalvateProps } from '@/ui/schermate/SchermataRicetteSalvate';

/** Le tue ricette (Menu · 7): elenco dalla più recente, letto con la RLS del cliente e tenuto in memoria e su file. */
export default function RottaRicetteSalvate() {
  const router = useRouter();
  const stato = statoCorrente();
  const clientId = stato && 'profilo' in stato ? stato.profilo.clientId : null;
  const onIndietro = useCallback(() => (router.canGoBack() ? router.back() : router.replace('/')), [router]);
  const onApri = useCallback((r: RicettaSalvata) => router.push({ pathname: '/ricette/[id]', params: { id: r.id } }), [router]);
  if (!clientId) return <Redirect href="/" />;
  return <Elenco clientId={clientId} onIndietro={onIndietro} onApri={onApri} />;
}

function Elenco({ clientId, onIndietro, onApri }: { clientId: string; onIndietro: () => void; onApri: (r: RicettaSalvata) => void }) {
  const { fase, ricette, daCache, ricarica } = useRicetteSalvate(clientId);
  const faseSchermata: SchermataRicetteSalvateProps['fase'] = ricette && fase.tipo === 'pronto' ? { tipo: 'pronto', ricette, daCache } : fase.tipo === 'caricamento' || fase.tipo === 'pronto' ? { tipo: 'caricamento' } : { tipo: fase.tipo, onRiprova: ricarica };
  return <SchermataRicetteSalvate fase={faseSchermata} onIndietro={onIndietro} onApri={onApri} />;
}
