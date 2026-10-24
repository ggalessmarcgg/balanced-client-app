import { Redirect, useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';

import { componiPiano } from '@/core/piano/composizione';
import { useMemoriaPiano } from '@/servizi/piano';
import { statoCorrente } from '@/servizi/statoCliente';
import { SchermataIndicazioni } from '@/ui/schermate/SchermataIndicazioni';

/** Indicazioni del piano (step 8): dalla riga del titolo della scheda Piano; legge il piano già in memoria, nessuna richiesta. */
export default function RottaIndicazioni() {
  const router = useRouter();
  const stato = statoCorrente();
  const memoria = useMemoriaPiano();
  const piano = useMemo(() => (memoria.piano ? componiPiano(memoria.piano) : null), [memoria.piano]);
  const onIndietro = useCallback(() => (router.canGoBack() ? router.back() : router.replace('/piano')), [router]);
  if (stato?.codice !== 'J' || !piano) return <Redirect href="/" />;
  return <SchermataIndicazioni indicazioni={piano.indicazioni} onIndietro={onIndietro} />;
}
