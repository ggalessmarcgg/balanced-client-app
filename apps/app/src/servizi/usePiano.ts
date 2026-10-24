// Hook della scheda Piano (step 8): lettura all'apertura e al ritorno in primo piano, sullo stampo di useLetturaMenu.
// `piano` null con fase pronta = nessun piano corrente ("Piano in elaborazione").
import { useCallback } from 'react';

import { componiPiano, type PianoComposto } from '@/core/piano/composizione';
import { leggiPiano, memoriaPiano } from '@/servizi/piano';
import { useLetturaMenu, type Lettura } from '@/servizi/useMenu';

export type DatiPiano = { piano: PianoComposto | null; daCache: boolean };

export function usePiano(clientId: string) {
  const leggi = useCallback<Lettura<DatiPiano>>(async () => {
    const esito = await leggiPiano(clientId);
    return esito.tipo === 'ok' ? { tipo: 'ok', dati: { piano: esito.piano ? componiPiano(esito.piano) : null, daCache: esito.daCache } } : esito;
  }, [clientId]);
  // La copia già in memoria (dall'avvio dell'app dell'abbonato o da un'apertura precedente) si mostra subito.
  const iniziale = useCallback((): DatiPiano | null => {
    const m = memoriaPiano();
    return m.clientId === clientId && m.noto ? { piano: m.piano ? componiPiano(m.piano) : null, daCache: false } : null;
  }, [clientId]);
  return useLetturaMenu(leggi, iniziale);
}
