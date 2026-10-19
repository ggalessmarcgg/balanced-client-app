import { useRouter } from 'expo-router';
import { useCallback } from 'react';

import { esci } from '@/servizi/accesso';
import { apriEmailSupporto, apriWhatsAppSupporto } from '@/servizi/contatti';

/** Azioni comuni alle schermate di stato: Esci, contatti del supporto, Account (segnaposto fino allo step 4). */
export function useAzioniStato() {
  const router = useRouter();
  const onEsci = useCallback(async () => {
    await esci();
    router.replace('/accesso');
  }, [router]);
  const onAccount = useCallback(() => router.push('/account'), [router]);
  return { onEsci, onAccount, onEmailSupporto: apriEmailSupporto, onTelefonoSupporto: apriWhatsAppSupporto };
}
