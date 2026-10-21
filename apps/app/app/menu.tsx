import Constants from 'expo-constants';
import { Redirect, useRouter } from 'expo-router';
import { useCallback } from 'react';

import { statoCorrente } from '@/servizi/statoCliente';
import { useAzioniStato } from '@/servizi/useAzioniStato';
import { SchermataMenu, type VoceMenu } from '@/ui/schermate/SchermataMenu';

/** Voci già costruite ("Le tue ricette" arriva con lo step 9). */
const VOCI: VoceMenu[] = ['nutrizionista', 'appuntamenti', 'pesoEMisure', 'contenuti'];
const ROTTE: Record<VoceMenu, '/nutrizionista' | '/appuntamenti' | '/peso-misure' | '/contenuti'> = { nutrizionista: '/nutrizionista', appuntamenti: '/appuntamenti', pesoEMisure: '/peso-misure', contenuti: '/contenuti' };

/** Menu a tutta pagina (step 11): dall'icona Menu della barra superiore dell'abbonato. */
export default function RottaMenu() {
  const router = useRouter();
  const stato = statoCorrente();
  const { onEsci, sovrapposti } = useAzioniStato();
  const onVoce = useCallback((voce: VoceMenu) => router.push(ROTTE[voce]), [router]);
  const onChiudi = useCallback(() => (router.canGoBack() ? router.back() : router.replace('/abbonato')), [router]);
  if (stato?.codice !== 'J') return <Redirect href="/" />;
  return <SchermataMenu voci={VOCI} versione={Constants.expoConfig?.version ?? '0.0.0'} onVoce={onVoce} onChiudi={onChiudi} onEsci={onEsci} sovrapposti={sovrapposti} />;
}
