import { Redirect, useRouter } from 'expo-router';
import { useCallback } from 'react';

import { elencoContenuti, type Contenuto } from '@/core/contenuti/contenuti';
import { statoCorrente } from '@/servizi/statoCliente';
import { useContenuti } from '@/servizi/useMenu';
import { SchermataContenuti } from '@/ui/schermate/SchermataContenuti';

/** Contenuti (step 11): griglia della libreria; il tocco apre la lettura (nessuna richiesta: i corpi sono già in cache). */
export default function RottaContenuti() {
  const router = useRouter();
  const stato = statoCorrente();
  const { fase, dati, ricarica } = useContenuti();
  const onIndietro = useCallback(() => (router.canGoBack() ? router.back() : router.replace('/')), [router]);
  const onApri = useCallback((c: Contenuto) => router.push({ pathname: '/contenuti/[id]', params: { id: c.id } }), [router]);
  if (!stato || !('profilo' in stato)) return <Redirect href="/" />;
  const faseSchermata = fase.tipo === 'pronto' && dati ? { tipo: 'pronto' as const, contenuti: elencoContenuti(dati) } : fase.tipo === 'caricamento' || fase.tipo === 'pronto' ? { tipo: 'caricamento' as const } : { tipo: fase.tipo, onRiprova: ricarica };
  return <SchermataContenuti fase={faseSchermata} onIndietro={onIndietro} onApri={onApri} />;
}
