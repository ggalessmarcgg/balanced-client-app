// Schermata Notifiche: elenco composto dalle righe in memoria e dai dati già caricati (nutrizionista, giornate,
// revisioni, ferie), lettura all'apertura e al rientro, segnatura "viste" all'apertura, destinazione al tocco.
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { elencoNotifiche, nomeDiBattesimo, type ContestoNotifiche, type Destinazione, type Notifica } from '@/core/notifiche/notifiche';
import type { Profilo } from '@/core/stato/stato';
import { leggiGiornata } from '@/servizi/diario';
import { memoriaDiario } from '@/servizi/memoriaDiario';
import { useMemoriaRevisioni } from '@/servizi/memoriaRevisioni';
import { caricaNotifiche, segnaCliccataNotifica, segnaTutteViste, useMemoriaNotifiche } from '@/servizi/notifiche';
import { ferieInCache } from '@/servizi/nutrizionista';

export type FaseNotifiche = { tipo: 'caricamento' } | { tipo: 'rete' } | { tipo: 'errore' } | { tipo: 'pronto' };

export type StatoNotifiche = {
  fase: FaseNotifiche;
  elenco: Notifica[];
  ricarica: () => void;
  /** Segna la riga come cliccata e restituisce dove andare (la giornata ha bisogno della data: una lettura se non è in memoria). */
  apri: (notifica: Notifica) => Promise<DestinazioneRisolta | null>;
};

export type DestinazioneRisolta = { tipo: 'giornata'; data: string } | Exclude<Destinazione, { tipo: 'giornata' }>;

/** Data di una giornata per id, dalle righe del diario già in memoria (settimana, giorni aperti, giornate). */
function dataGiornataInMemoria(submissionId: string): string | null {
  const m = memoriaDiario();
  const riga = m.settimana.find((r) => r.id === submissionId) ?? Object.values(m.righeFuoriSettimana).find((r) => r.id === submissionId);
  if (riga) return riga.submission_date;
  const giornata = Object.values(m.giornate).find((g) => g.id === submissionId);
  return giornata?.data ?? null;
}

export function useNotifiche(profilo: Profilo): StatoNotifiche {
  const memoria = useMemoriaNotifiche();
  const revisioni = useMemoriaRevisioni();
  const [fase, setFase] = useState<FaseNotifiche>(memoria.righe ? { tipo: 'pronto' } : { tipo: 'caricamento' });
  const [ferie, setFerie] = useState<ContestoNotifiche['ferie']>(null);
  const montato = useRef(true);

  const ricarica = useCallback(() => {
    let attivo = true;
    caricaNotifiche().then((esito) => {
      if (!attivo || !montato.current) return;
      if (esito.tipo === 'ok') {
        setFase({ tipo: 'pronto' });
        void segnaTutteViste();
      } else setFase((f) => (f.tipo === 'pronto' ? f : { tipo: esito.tipo === 'rete' ? 'rete' : 'errore' }));
    });
    return () => {
      attivo = false;
    };
  }, []);

  useEffect(() => {
    montato.current = true;
    const annulla = ricarica();
    ferieInCache(profilo.clientId).then((f) => {
      if (montato.current) setFerie(f ? { al: f.al, sostituta: f.sostituta?.nome ?? null } : null);
    });
    const sub = AppState.addEventListener('change', (stato: AppStateStatus) => {
      if (stato === 'active') ricarica();
    });
    return () => {
      montato.current = false;
      annulla();
      sub.remove();
    };
  }, [ricarica, profilo.clientId]);

  const righeRevisioni = revisioni.righe ?? [];
  const contesto: ContestoNotifiche = {
    nomeNutrizionista: nomeDiBattesimo(profilo.nutrizionista?.nome),
    dataGiornata: dataGiornataInMemoria,
    revisione: (id) => {
      const r = righeRevisioni.find((x) => x.id === id);
      return r ? { numero: r.review_number, diari: r.submissions_count } : null;
    },
    ferie,
  };
  const elenco = memoria.righe ? elencoNotifiche(memoria.righe, contesto, new Date()) : [];

  const apri = useCallback(async (notifica: Notifica): Promise<DestinazioneRisolta | null> => {
    segnaCliccataNotifica(notifica.id);
    const d = notifica.destinazione;
    if (!d) return null;
    if (d.tipo !== 'giornata') return d;
    const inMemoria = dataGiornataInMemoria(d.submissionId);
    if (inMemoria) return { tipo: 'giornata', data: inMemoria };
    const esito = await leggiGiornata(d.submissionId);
    return esito.tipo === 'ok' && esito.dati ? { tipo: 'giornata', data: esito.dati.submission_date } : null;
  }, []);

  return { fase, elenco, ricarica, apri };
}
