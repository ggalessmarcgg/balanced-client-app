import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

import { MESSAGGI_ERRORE } from '@/core/accesso/errori';
import { richiediRecupero } from '@/servizi/accesso';
import { SchermataRecupero } from '@/ui/schermate/SchermataRecupero';

/** Recupero password · Email (Figma 425:286): invia il link e torna al login con la notifica breve di conferma. */
export default function RottaRecupero() {
  const router = useRouter();
  const { email: iniziale } = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(iniziale ?? '');
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState<string | undefined>();

  const onInvia = useCallback(async () => {
    if (inCorso) return;
    setInCorso(true);
    setErrore(undefined);
    const esito = await richiediRecupero(email);
    setInCorso(false);
    if (esito.ok) router.replace({ pathname: '/accesso', params: { avviso: 'recupero' } });
    else setErrore(MESSAGGI_ERRORE[esito.errore]);
  }, [email, inCorso, router]);

  const onIndietro = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/accesso');
  }, [router]);

  return (
    <SchermataRecupero
      email={email}
      onEmail={(v) => {
        setEmail(v);
        setErrore(undefined);
      }}
      onInvia={onInvia}
      onIndietro={onIndietro}
      inCorso={inCorso}
      errore={errore}
    />
  );
}
