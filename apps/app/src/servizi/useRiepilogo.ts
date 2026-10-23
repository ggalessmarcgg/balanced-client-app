// Riepilogo "Modifica e invia" di Racconta (Figma 747:7517, lotto 2): il diario di oggi già compilato e salvato come
// bozza, tutto aperto e modificabile. Stesse regole del diario di Oggi: copia locale a ogni modifica (memoria di
// sessione e file), salvataggio della bozza su "Chiudi", all'uscita e quando l'app va in secondo piano (mai a ogni
// tasto); "Invia alla nutrizionista" è la condivisione esistente (servizi/condivisione.ts).
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { aggiornaDiario, type DiarioLocale } from '@/core/diario/bozza';
import type { Diario } from '@/core/diario/modello';
import { condividiOggi } from '@/servizi/condivisione';
import { salvaBozzaInAttesa } from '@/servizi/giornate';
import { aggiornaMemoria, memoriaDiario, persistiMemoria, useMemoriaDiario } from '@/servizi/memoriaDiario';
import { segnaTutorialVisto, useMemoriaRacconta } from '@/servizi/racconta';
import { mostraNotificaInOggi, notificaScrittura, type NotificaDiario } from '@/servizi/useDiario';

export type StatoRiepilogo = {
  locale: DiarioLocale | null;
  inviando: boolean;
  /** Tutorial · 6 al primo arrivo sul riepilogo (una volta per account). */
  tutorial: boolean;
  notifica: NotificaDiario | null;
};

export type AzioniRiepilogo = {
  aggiorna: (diario: Diario) => void;
  /** "Chiudi" e freccia indietro: salva la bozza e torna a Oggi ("Continua"). */
  chiudi: () => void;
  condividi: () => void;
  hoCapito: () => void;
  nascondiNotifica: () => void;
};

/** `esci` torna a Oggi (la rotta sa come). */
export function useRiepilogo(esci: () => void): StatoRiepilogo & { azioni: AzioniRiepilogo } {
  const { locale } = useMemoriaDiario();
  const { tutorialVisti } = useMemoriaRacconta();
  const [inviando, setInviando] = useState(false);
  const [notifica, setNotifica] = useState<NotificaDiario | null>(null);
  const montato = useRef(true);

  /** Salvataggio della bozza (in coda con le altre scritture). Un errore si mostra in Oggi, dove il cliente torna. */
  const salva = useCallback(() => {
    void salvaBozzaInAttesa().then((esito) => {
      const n = esito ? notificaScrittura(esito, false) : null;
      if (n) mostraNotificaInOggi(n);
    });
  }, []);

  // Secondo piano e uscita (anche con il gesto o il tasto indietro di Android): si salva la bozza.
  useEffect(() => {
    montato.current = true;
    const sub = AppState.addEventListener('change', (s: AppStateStatus) => {
      if (s === 'background' || s === 'inactive') salva();
    });
    return () => {
      montato.current = false;
      sub.remove();
      salva();
    };
  }, [salva]);

  const aggiorna = useCallback((diario: Diario) => {
    const attuale = memoriaDiario().locale;
    if (!attuale) return;
    aggiornaMemoria({ locale: aggiornaDiario(attuale, diario) });
    persistiMemoria();
  }, []);

  const condividi = useCallback(() => {
    if (inviando) return;
    setInviando(true);
    condividiOggi()
      .then((esito) => {
        if (!montato.current) return;
        setInviando(false);
        if (!esito) return;
        const n = notificaScrittura(esito, true);
        if (esito.tipo === 'errore') {
          setNotifica(n);
          return;
        }
        // Condivisa (o già condivisa altrove): la conferma compare in Oggi, con la card "Hai condiviso la giornata!".
        if (n) mostraNotificaInOggi(n);
        esci();
      })
      .catch(() => {
        if (montato.current) setInviando(false);
      });
  }, [inviando, esci]);

  return {
    locale,
    inviando,
    tutorial: !tutorialVisti.riepilogo,
    notifica,
    azioni: {
      aggiorna,
      chiudi: esci,
      condividi,
      hoCapito: useCallback(() => segnaTutorialVisto('riepilogo'), []),
      nascondiNotifica: useCallback(() => setNotifica(null), []),
    },
  };
}
