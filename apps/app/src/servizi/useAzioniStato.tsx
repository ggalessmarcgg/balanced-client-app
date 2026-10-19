import { useRouter } from 'expo-router';
import { useCallback, useState, type ReactNode } from 'react';

import { esci } from '@/servizi/accesso';
import { copiaContattoSupporto, TESTO_COPIATO, type ContattoCopiato } from '@/servizi/contatti';
import { NotificaInBasso } from '@/ui/schermate/NotificaInBasso';

/**
 * Azioni comuni alle schermate di stato: Esci, copia dei contatti del supporto (con Notifica breve di conferma,
 * da passare come `sovrapposti` alla schermata) e Account (segnaposto fino allo step 4).
 */
export function useAzioniStato(): {
  onEsci: () => void;
  onAccount: () => void;
  onEmailSupporto: () => void;
  onTelefonoSupporto: () => void;
  sovrapposti: ReactNode;
} {
  const router = useRouter();
  const [copiato, setCopiato] = useState<ContattoCopiato | null>(null);

  const onEsci = useCallback(async () => {
    await esci();
    router.replace('/accesso');
  }, [router]);
  const onAccount = useCallback(() => router.push('/account'), [router]);
  const copia = useCallback(async (contatto: ContattoCopiato) => {
    setCopiato(null);
    if (await copiaContattoSupporto(contatto)) setCopiato(contatto);
  }, []);
  const onEmailSupporto = useCallback(() => void copia('email'), [copia]);
  const onTelefonoSupporto = useCallback(() => void copia('telefono'), [copia]);
  const nascondi = useCallback(() => setCopiato(null), []);

  const sovrapposti = copiato ? <NotificaInBasso key={copiato} tipo="conferma" testo={TESTO_COPIATO[copiato]} onScomparsa={nascondi} /> : null;
  return { onEsci, onAccount, onEmailSupporto, onTelefonoSupporto, sovrapposti };
}
