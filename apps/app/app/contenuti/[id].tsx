import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';

import { contenutoDa } from '@/core/contenuti/contenuti';
import { statoCorrente } from '@/servizi/statoCliente';
import { useContenuti } from '@/servizi/useMenu';
import { SchermataContenuto } from '@/ui/schermate/SchermataContenuto';
import { SchermataCaricamento, SchermataErroreCaricamento, SchermataSenzaConnessione } from '@/ui/schermate/SchermateTrasversali';

/** Lettura di un contenuto per id (dalla cache dei contenuti; se manca, la lettura della libreria). */
export default function RottaContenuto() {
  const router = useRouter();
  const stato = statoCorrente();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { fase, dati, ricarica } = useContenuti();
  const onIndietro = useCallback(() => (router.canGoBack() ? router.back() : router.replace('/contenuti')), [router]);
  if (!stato || !('profilo' in stato)) return <Redirect href="/" />;
  const riga = dati?.find((r) => r.id === id);
  if (riga) return <SchermataContenuto contenuto={contenutoDa(riga)} corpo={riga.content_body} onIndietro={onIndietro} />;
  if (fase.tipo === 'pronto') return <Redirect href="/contenuti" />;
  if (fase.tipo === 'rete') return <SchermataSenzaConnessione onRiprova={ricarica} />;
  if (fase.tipo === 'errore') return <SchermataErroreCaricamento onRiprova={ricarica} descrizione="Non riusciamo a caricare il contenuto. Riprova tra poco." />;
  return <SchermataCaricamento />;
}
