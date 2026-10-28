// Hook della scheda Piano per le ricette (step 9, lotto 3): stato del pannello dalla macchina a stati pura
// (src/core/ricette/pannello.ts), effetti eseguiti qui (le due chiamate al server, la rilettura del piano con la
// Notifica breve, l'apertura della pagina della ricetta) e hook di "Le tue ricette" sullo stampo dei contenuti.
import { useCallback, useEffect, useRef, useState } from 'react';

import type { ContestoRicetta, PastoScelto } from '@/core/ricette/contesto';
import { NOTIFICA_PIANO_AGGIORNATO, riduci, STATO_CHIUSO, type EventoPannello, type RicettaPronta, type StatoPannello } from '@/core/ricette/pannello';
import type { RicettaSalvata } from '@/core/ricette/salvate';
import { leggiPiano } from '@/servizi/piano';
import { impostaRicettaPronta, preparaRicetta, trovaIdee } from '@/servizi/ricette';
import { leggiRicetteSalvate, useRicetteSalvateInMemoria } from '@/servizi/ricetteSalvate';
import { useLetturaMenu, type FaseMenu, type Lettura } from '@/servizi/useMenu';
import type { NotificaPiano } from '@/servizi/useSostituzione';

export type AzioniRicette = {
  apri: (contesto: ContestoRicetta) => void;
  chiudi: () => void;
  scegliPasto: (pasto: PastoScelto) => void;
  scrivi: (testo: string) => void;
  trova: () => void;
  scegliIdea: (indice: number) => void;
  vediRicetta: () => void;
  riprova: () => void;
};

export type Ricette = { stato: StatoPannello; azioni: AzioniRicette; notifica: NotificaPiano | null; chiudiNotifica: () => void };

/**
 * `onRicettaPronta` apre la pagina della ricetta (la ricetta è già in memoria); `onPianoRiletto` mostra subito il
 * piano riletto dopo pasto_non_disponibile.
 */
export function useRicette(clientId: string, onRicettaPronta: (ricetta: RicettaPronta) => void, onPianoRiletto?: () => void): Ricette {
  const [stato, setStato] = useState<StatoPannello>(STATO_CHIUSO);
  const [notifica, setNotifica] = useState<NotificaPiano | null>(null);
  const statoCorrente = useRef<StatoPannello>(STATO_CHIUSO);
  const prossimaRichiesta = useRef(1);
  const montato = useRef(true);
  const apriRicetta = useRef(onRicettaPronta);
  const rilettura = useRef(onPianoRiletto);
  const inviaRef = useRef<(evento: EventoPannello) => void>(() => {});
  useEffect(() => {
    montato.current = true;
    return () => {
      montato.current = false;
    };
  }, []);
  useEffect(() => {
    apriRicetta.current = onRicettaPronta;
    rilettura.current = onPianoRiletto;
  }, [onRicettaPronta, onPianoRiletto]);

  // Applica l'evento alla macchina a stati ed esegue gli effetti; le risposte del server rientrano come eventi (tramite
  // il riferimento, così la funzione non dipende da sé stessa) e si ignorano se il pannello è stato chiuso o riaperto.
  const invia = useCallback(
    (evento: EventoPannello) => {
      const { stato: nuovo, effetti } = riduci(statoCorrente.current, evento, prossimaRichiesta.current);
      statoCorrente.current = nuovo;
      setStato(nuovo);
      for (const effetto of effetti) {
        switch (effetto.tipo) {
          case 'chiamaIdee':
            prossimaRichiesta.current = effetto.richiesta + 1;
            void trovaIdee(effetto.pastoId, effetto.campo).then((esito) => {
              if (montato.current) inviaRef.current({ tipo: 'rispostaIdee', richiesta: effetto.richiesta, esito });
            });
            break;
          case 'chiamaRicetta':
            prossimaRichiesta.current = effetto.richiesta + 1;
            void preparaRicetta(effetto.pastoId, effetto.richiestaId, effetto.stima, effetto.idea, effetto.campo).then((esito) => {
              if (montato.current) inviaRef.current({ tipo: 'rispostaRicetta', richiesta: effetto.richiesta, esito });
            });
            break;
          case 'rileggiPiano':
            setNotifica({ chiave: Date.now(), testo: NOTIFICA_PIANO_AGGIORNATO, tipo: 'conferma' });
            void leggiPiano(clientId, { ignoraVersione: true }).then(() => {
              if (montato.current) rilettura.current?.();
            });
            break;
          case 'apriRicetta':
            impostaRicettaPronta(effetto.ricetta);
            apriRicetta.current(effetto.ricetta);
            break;
        }
      }
    },
    [clientId],
  );
  useEffect(() => {
    inviaRef.current = invia;
  }, [invia]);

  const azioni: AzioniRicette = {
    apri: useCallback((contesto: ContestoRicetta) => invia({ tipo: 'apri', contesto }), [invia]),
    chiudi: useCallback(() => invia({ tipo: 'chiudi' }), [invia]),
    scegliPasto: useCallback((pasto: PastoScelto) => invia({ tipo: 'scegliPasto', pasto }), [invia]),
    scrivi: useCallback((testo: string) => invia({ tipo: 'scrivi', testo }), [invia]),
    trova: useCallback(() => invia({ tipo: 'trova' }), [invia]),
    scegliIdea: useCallback((indice: number) => invia({ tipo: 'scegliIdea', indice }), [invia]),
    vediRicetta: useCallback(() => invia({ tipo: 'vediRicetta' }), [invia]),
    riprova: useCallback(() => invia({ tipo: 'riprova' }), [invia]),
  };
  const chiudiNotifica = useCallback(() => setNotifica(null), []);
  return { stato, azioni, notifica, chiudiNotifica };
}

/** "Le tue ricette": lettura all'apertura e al rientro; l'elenco viene dalla memoria, che salvataggi ed eliminazioni aggiornano da soli. */
export function useRicetteSalvate(clientId: string): { fase: FaseMenu; ricette: RicettaSalvata[] | null; daCache: boolean; ricarica: () => void } {
  const inMemoria = useRicetteSalvateInMemoria(clientId);
  const leggi = useCallback<Lettura<{ daCache: boolean }>>(async () => {
    const esito = await leggiRicetteSalvate(clientId);
    return esito.tipo === 'ok' ? { tipo: 'ok', dati: { daCache: esito.daCache } } : esito;
  }, [clientId]);
  const iniziale = useCallback(() => (inMemoria ? { daCache: false } : null), [inMemoria]);
  const { fase, dati, ricarica } = useLetturaMenu(leggi, iniziale);
  return { fase: inMemoria && fase.tipo !== 'pronto' ? { tipo: 'pronto' } : fase, ricette: inMemoria, daCache: dati?.daCache ?? false, ricarica };
}
