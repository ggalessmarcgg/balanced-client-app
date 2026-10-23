import { Redirect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

import { statoCorrente } from '@/servizi/statoCliente';
import { useRacconta } from '@/servizi/useRacconta';
import { NotificaInBasso } from '@/ui/schermate/NotificaInBasso';
import { SchermataRacconta } from '@/ui/schermate/SchermataRacconta';

/**
 * "Racconta" dalla Card diario di Oggi (sezione Figma 3.1 · Diario vocale, step 10). Lotto 1: dal permesso del
 * microfono a "Il tuo racconto"; "Crea il mio diario" arriva con il lotto 2 (oggi una Notifica breve).
 */
export default function RottaRacconta() {
  const stato = statoCorrente();
  if (stato?.codice !== 'J') return <Redirect href="/" />;
  return <Racconta clientId={stato.profilo.clientId} />;
}

const TESTO_LOTTO_2 = 'La creazione del diario dal racconto arriva a breve.';

function Racconta({ clientId }: { clientId: string }) {
  const router = useRouter();
  const { stato, azioni } = useRacconta(clientId);
  const [notifica, setNotifica] = useState<number>(0);
  const onIndietro = useCallback(() => router.back(), [router]);
  const onCreaDiario = useCallback(() => setNotifica((n) => n + 1), []);
  const nascondi = useCallback(() => setNotifica(0), []);
  return (
    <SchermataRacconta
      stato={stato}
      azioni={azioni}
      onIndietro={onIndietro}
      onScrivi={onIndietro}
      onCreaDiario={onCreaDiario}
      sovrapposti={notifica > 0 ? <NotificaInBasso key={notifica} tipo="conferma" testo={TESTO_LOTTO_2} onScomparsa={nascondi} /> : undefined}
    />
  );
}
