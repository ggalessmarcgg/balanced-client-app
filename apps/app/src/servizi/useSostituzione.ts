// Hook della scheda Piano per la sostituzione (step 9, lotto 3): stato del pannello dalla macchina a stati pura
// (src/core/sostituzione/pannello.ts), effetti eseguiti qui (chiamata al server, rilettura del piano senza versione nota
// con la Notifica breve) e tutorial della prima visita (una volta per account, nel portachiavi).
import { useCallback, useEffect, useRef, useState } from 'react';

import { NOTIFICA_PIANO_AGGIORNATO, riduci, STATO_CHIUSO, type EventoPannello, type RigaScelta, type StatoPannello } from '@/core/sostituzione/pannello';
import { leggiPiano } from '@/servizi/piano';
import { segnaTutorialPianoVisto, trovaAlternative, tutorialPianoVisto } from '@/servizi/sostituzione';

export type AzioniSostituzione = {
  apri: (riga: RigaScelta) => void;
  chiudi: () => void;
  scrivi: (testo: string) => void;
  trova: () => void;
  riprova: () => void;
};

export type NotificaPiano = { chiave: number; testo: string; tipo: 'conferma' | 'errore' };

export function useSostituzione(clientId: string, onPianoRiletto?: () => void): { stato: StatoPannello; azioni: AzioniSostituzione; notifica: NotificaPiano | null; chiudiNotifica: () => void } {
  const [stato, setStato] = useState<StatoPannello>(STATO_CHIUSO);
  const [notifica, setNotifica] = useState<NotificaPiano | null>(null);
  const statoCorrente = useRef<StatoPannello>(STATO_CHIUSO);
  const prossimaRichiesta = useRef(1);
  const montato = useRef(true);
  const rilettura = useRef(onPianoRiletto);
  const inviaRef = useRef<(evento: EventoPannello) => void>(() => {});
  useEffect(() => {
    montato.current = true;
    return () => {
      montato.current = false;
    };
  }, []);
  useEffect(() => {
    rilettura.current = onPianoRiletto;
  }, [onPianoRiletto]);

  // Applica l'evento alla macchina a stati ed esegue gli effetti; la risposta del server rientra come evento (tramite
  // il riferimento, così la funzione non dipende da sé stessa) e si ignora se il pannello è stato chiuso o riaperto.
  const invia = useCallback(
    (evento: EventoPannello) => {
      const { stato: nuovo, effetti } = riduci(statoCorrente.current, evento, prossimaRichiesta.current);
      statoCorrente.current = nuovo;
      setStato(nuovo);
      for (const effetto of effetti) {
        switch (effetto.tipo) {
          case 'chiama':
            prossimaRichiesta.current = effetto.richiesta + 1;
            void trovaAlternative(effetto.rigaId, effetto.inCasa).then((esito) => {
              if (montato.current) inviaRef.current({ tipo: 'risposta', richiesta: effetto.richiesta, esito });
            });
            break;
          case 'rileggiPiano':
            setNotifica({ chiave: Date.now(), testo: NOTIFICA_PIANO_AGGIORNATO, tipo: 'conferma' });
            void leggiPiano(clientId, { ignoraVersione: true }).then(() => {
              if (montato.current) rilettura.current?.();
            });
            break;
        }
      }
    },
    [clientId],
  );
  useEffect(() => {
    inviaRef.current = invia;
  }, [invia]);

  const azioni: AzioniSostituzione = {
    apri: useCallback((riga: RigaScelta) => invia({ tipo: 'apri', riga }), [invia]),
    chiudi: useCallback(() => invia({ tipo: 'chiudi' }), [invia]),
    scrivi: useCallback((testo: string) => invia({ tipo: 'scrivi', testo }), [invia]),
    trova: useCallback(() => invia({ tipo: 'trova' }), [invia]),
    riprova: useCallback(() => invia({ tipo: 'riprova' }), [invia]),
  };
  const chiudiNotifica = useCallback(() => setNotifica(null), []);
  return { stato, azioni, notifica, chiudiNotifica };
}

/**
 * Tutorial · 1 della sostituzione: compare alla prima visita del Piano con un piano presente, una volta per account;
 * `null` finché non si sa se è già stato visto. "Ho capito" lo registra nel portachiavi.
 */
export function useTutorialPiano(clientId: string): { daMostrare: boolean; hoCapito: () => void } {
  // Esito della lettura per cliente: un altro cliente riparte da "non ancora letto" senza setState nell'effetto.
  const [letto, setLetto] = useState<{ clientId: string; visto: boolean } | null>(null);
  useEffect(() => {
    let attivo = true;
    tutorialPianoVisto(clientId).then((visto) => {
      if (attivo) setLetto({ clientId, visto });
    });
    return () => {
      attivo = false;
    };
  }, [clientId]);
  const hoCapito = useCallback(() => {
    setLetto({ clientId, visto: true });
    segnaTutorialPianoVisto(clientId);
  }, [clientId]);
  return { daMostrare: letto !== null && letto.clientId === clientId && !letto.visto, hoCapito };
}
