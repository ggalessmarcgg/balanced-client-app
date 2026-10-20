// Storico delle giornate (lotto 3): i mesi dal primo diario al mese corrente; ogni mese si legge quando entra nello
// schermo (una lettura per mese, solo data e stato) e resta in memoria per la sessione; il mese corrente riusa la
// settimana già in memoria e legge solo la parte del mese che la precede.
import { useCallback, useEffect, useMemo, useState } from 'react';

import { dataOggiRoma } from '@/core/diario/data';
import { giorniMese, intervalloMese, intervalloMeseFuoriSettimana, meseDi, mesiStorico, type Mese, type MeseCalendario } from '@/core/diario/storico';
import { leggiMese, leggiPrimoDiario } from '@/servizi/diario';
import { aggiornaMemoria, memoriaDiario, persistiMemoria, useMemoriaDiario, type FaseLettura } from '@/servizi/memoriaDiario';

export type StatoStorico = {
  /** Lettura del primo diario: finché non è pronta si mostra il solo mese corrente. */
  fase: FaseLettura;
  oggi: string;
  mesi: Mese[];
  /** Calendario del mese, o null finché non è letto. */
  calendarioDi: (mese: Mese) => MeseCalendario | null;
  faseDi: (mese: Mese) => FaseLettura;
  /** Da chiamare quando un mese entra (o sta per entrare) nello schermo: legge se non è ancora in memoria. */
  caricaMese: (mese: Mese) => void;
  riprova: () => void;
};

export function useStorico(clientId: string): StatoStorico {
  const memoria = useMemoriaDiario();
  const oggi = useMemo(() => memoria.locale?.data ?? dataOggiRoma(new Date()), [memoria.locale?.data]);
  const meseCorrente = meseDi(oggi);
  // Primo diario: una lettura minima, una volta per sessione (poi in memoria e nel portachiavi). La fase è "pronto"
  // appena il primo diario è noto; altrimenti segue l'esito della lettura.
  const [faseLettura, setFaseLettura] = useState<FaseLettura>('caricamento');
  const [tentativo, setTentativo] = useState(0);
  const fase: FaseLettura = memoria.primoDiario !== undefined ? 'pronto' : faseLettura;
  useEffect(() => {
    if (memoriaDiario().primoDiario !== undefined) return;
    let attivo = true;
    leggiPrimoDiario(clientId).then((esito) => {
      if (!attivo) return;
      if (esito.tipo === 'ok') {
        aggiornaMemoria({ primoDiario: esito.dati });
        persistiMemoria();
      } else setFaseLettura(esito.tipo);
    });
    return () => {
      attivo = false;
    };
  }, [clientId, tentativo]);

  const caricaMese = useCallback(
    (mese: Mese) => {
      const noto = memoriaDiario().mesi[mese];
      if (noto && (noto.fase === 'pronto' || noto.fase === 'caricamento')) return;
      const intervallo = mese === meseCorrente ? intervalloMeseFuoriSettimana(mese, oggi) : intervalloMese(mese);
      const imposta = (valore: { fase: FaseLettura; righe: typeof noto extends undefined ? never : NonNullable<typeof noto>['righe'] }) =>
        aggiornaMemoria({ mesi: { ...memoriaDiario().mesi, [mese]: valore } });
      if (!intervallo) return imposta({ fase: 'pronto', righe: [] }); // mese corrente tutto dentro la settimana: nulla da leggere
      imposta({ fase: 'caricamento', righe: noto?.righe ?? [] });
      leggiMese(clientId, intervallo.da, intervallo.a).then((esito) => {
        if (esito.tipo === 'ok') imposta({ fase: 'pronto', righe: esito.dati });
        else imposta({ fase: esito.tipo, righe: noto?.righe ?? [] });
      });
    },
    [clientId, meseCorrente, oggi],
  );

  const mesi = useMemo(() => mesiStorico(memoria.primoDiario ?? null, oggi), [memoria.primoDiario, oggi]);

  const calendarioDi = useCallback(
    (mese: Mese): MeseCalendario | null => {
      const noto = memoria.mesi[mese];
      if (!noto || noto.fase !== 'pronto') return null;
      // Il mese corrente (e l'eventuale mese precedente a cavallo della settimana) prende dalla settimana in memoria le righe più aggiornate.
      return giorniMese(mese, [...noto.righe, ...memoria.settimana], oggi);
    },
    [memoria.mesi, memoria.settimana, oggi],
  );

  const faseDi = useCallback((mese: Mese): FaseLettura => memoria.mesi[mese]?.fase ?? 'caricamento', [memoria.mesi]);

  const riprova = useCallback(() => {
    setFaseLettura('caricamento');
    setTentativo((t) => t + 1);
    // I mesi rimasti in errore si rileggono quando tornano nello schermo.
    const mesiInErrore = Object.fromEntries(Object.entries(memoriaDiario().mesi).filter(([, m]) => m.fase === 'pronto' || m.fase === 'caricamento'));
    aggiornaMemoria({ mesi: mesiInErrore });
  }, []);

  return { fase, oggi, mesi, calendarioDi, faseDi, caricaMese, riprova };
}
