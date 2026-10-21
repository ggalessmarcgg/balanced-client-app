import Constants from 'expo-constants';
import { Redirect, useRouter } from 'expo-router';
import { useCallback } from 'react';

import { statoCorrente } from '@/servizi/statoCliente';
import { useAzioniStato } from '@/servizi/useAzioniStato';
import { SchermataMenu, type VoceMenu } from '@/ui/schermate/SchermataMenu';

/** Voci già costruite ("Le tue ricette" arriva con lo step 9). */
const VOCI_ABBONATO: VoceMenu[] = ['nutrizionista', 'appuntamenti', 'pesoEMisure', 'contenuti'];
/** Prima dell'abbonamento (stati C, D, F, G; step 12): solo la nutrizionista, oltre a "Esci". */
const VOCI_PRENOTAZIONE: VoceMenu[] = ['nutrizionista'];
const ROTTE: Record<VoceMenu, '/nutrizionista' | '/appuntamenti' | '/peso-misure' | '/contenuti'> = { nutrizionista: '/nutrizionista', appuntamenti: '/appuntamenti', pesoEMisure: '/peso-misure', contenuti: '/contenuti' };

/** Menu a tutta pagina (step 11): dall'icona Menu della barra superiore dell'abbonato e, dallo step 12, degli stati prima dell'abbonamento. */
export default function RottaMenu() {
  const router = useRouter();
  const stato = statoCorrente();
  const { onEsci, sovrapposti } = useAzioniStato();
  const onVoce = useCallback((voce: VoceMenu) => router.push(ROTTE[voce]), [router]);
  const onChiudi = useCallback(() => (router.canGoBack() ? router.back() : router.replace('/')), [router]);
  if (!stato) return <Redirect href="/" />;
  const voci = stato.codice === 'J' ? VOCI_ABBONATO : stato.codice === 'C' || stato.codice === 'D' || stato.codice === 'F' || stato.codice === 'G' ? VOCI_PRENOTAZIONE : null;
  if (!voci) return <Redirect href="/" />;
  return <SchermataMenu voci={voci} versione={Constants.expoConfig?.version ?? '0.0.0'} onVoce={onVoce} onChiudi={onChiudi} onEsci={onEsci} sovrapposti={sovrapposti} />;
}
