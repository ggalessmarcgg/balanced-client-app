import { useCallback, useEffect, useRef, useState } from 'react';

import { presentaErrore, type EsitoEliminazione } from '@/core/account/eliminazione';
import type { PassoEliminazione } from '@/ui/account/PannelloEliminaAccount';

export type NotificaEliminazione = { chiave: number; testo: string; onRiprova: (() => void) | null };

export type StatoEliminazione = {
  passo: PassoEliminazione | null;
  /** Messaggio sotto il campo password (password errata, troppi tentativi); null se non c'è. */
  erroreCampo: string | null;
  inCorso: boolean;
  /** Notifica breve d'errore (rete, servizio: con "Riprova"; sessione o account non riconosciuto: senza). */
  notifica: NotificaEliminazione | null;
  apri: () => void;
  chiudi: () => void;
  continua: () => void;
  /** "Elimina definitivamente" con la password del pannello. */
  conferma: (password: string) => void;
  /** Il cliente cambia la password nel campo: il messaggio d'errore sparisce. */
  onCambioPassword: () => void;
  nascondiNotifica: () => void;
};

/**
 * Percorso "Elimina account" (contratto eliminazione account v0.1 §2): avviso → conferma con la password → richiesta al
 * server (`richiedi`, iniettato: il servizio vero dalla rotta, uno finto dalla pagina di sviluppo). Esito positivo, anche
 * "già registrata" → `dopoRegistrata` (la rotta esegue "Esci" e mostra la conferma); password errata o troppi tentativi →
 * messaggio sotto il campo, si resta sul pannello; rete o servizio → Notifica breve con "Riprova" (stessa password);
 * sessione scaduta o account non riconosciuto → Notifica breve senza "Riprova". Una sola richiesta in corso alla volta.
 */
export function useEliminazioneAccount({ richiedi, dopoRegistrata }: { richiedi: (password: string) => Promise<EsitoEliminazione>; dopoRegistrata: () => void | Promise<void> }): StatoEliminazione {
  const [passo, setPasso] = useState<PassoEliminazione | null>(null);
  const [erroreCampo, setErroreCampo] = useState<string | null>(null);
  const [inCorso, setInCorso] = useState(false);
  const [notifica, setNotifica] = useState<NotificaEliminazione | null>(null);
  const inCorsoRef = useRef(false);
  const montato = useRef(true);
  useEffect(() => {
    montato.current = true;
    return () => {
      montato.current = false;
    };
  }, []);

  const conferma = useCallback(
    (password: string) => {
      if (inCorsoRef.current) return;
      inCorsoRef.current = true;
      setInCorso(true);
      setErroreCampo(null);
      setNotifica(null);
      void (async () => {
        try {
          const esito = await richiedi(password);
          if (esito.tipo === 'registrata') {
            await dopoRegistrata();
            return;
          }
          if (!montato.current) return;
          const presentazione = presentaErrore(esito.errore);
          if (presentazione.dove === 'campo') setErroreCampo(presentazione.testo);
          else setNotifica({ chiave: Date.now(), testo: presentazione.testo, onRiprova: presentazione.riprova ? () => conferma(password) : null });
        } finally {
          inCorsoRef.current = false;
          if (montato.current) setInCorso(false);
        }
      })();
    },
    [richiedi, dopoRegistrata],
  );

  const apri = useCallback(() => {
    setErroreCampo(null);
    setNotifica(null);
    setPasso('avviso');
  }, []);
  const chiudi = useCallback(() => {
    if (inCorsoRef.current) return;
    setPasso(null);
    setErroreCampo(null);
  }, []);
  const continua = useCallback(() => setPasso('conferma'), []);
  const onCambioPassword = useCallback(() => setErroreCampo(null), []);
  const nascondiNotifica = useCallback(() => setNotifica(null), []);

  return { passo, erroreCampo, inCorso, notifica, apri, chiudi, continua, conferma, onCambioPassword, nascondiNotifica };
}
