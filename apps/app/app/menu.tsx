import Constants from 'expo-constants';
import { Redirect, useRouter } from 'expo-router';
import { useCallback } from 'react';

import { statoCorrente } from '@/servizi/statoCliente';
import { useAzioniStato } from '@/servizi/useAzioniStato';
import { SchermataMenu, type VoceMenu } from '@/ui/schermate/SchermataMenu';

/** Voci già costruite: Peso e misure e Contenuti arrivano con il lotto 2, Le tue ricette con lo step 9. */
const VOCI: VoceMenu[] = ['nutrizionista', 'appuntamenti'];
const ROTTE: Record<VoceMenu, '/nutrizionista' | '/appuntamenti' | '/menu'> = { nutrizionista: '/nutrizionista', appuntamenti: '/appuntamenti', pesoEMisure: '/menu', contenuti: '/menu' };

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
