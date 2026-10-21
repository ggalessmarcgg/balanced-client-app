// Sezione Revisioni: lettura all'apertura e al ritorno in primo piano (stato leggero + testi mancanti), card e
// elenco dalla logica pura (core/revisioni/stato), autrici delle Nuove dalla memoria dei profili (servizi/diario).
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import type { RigaAutore } from '@/core/diario/letture';
import { autoreRevisione, type AutoreRevisione } from '@/core/revisioni/autore';
import { sezioneRevisioni, type CardRevisione, type RevisionePassata } from '@/core/revisioni/stato';
import { leggiAutore } from '@/servizi/diario';
import { fotoInCache } from '@/servizi/foto';
import { useMemoriaRevisioni } from '@/servizi/memoriaRevisioni';
import { caricaRevisioni } from '@/servizi/revisioni';
import type { NutrizionistaCliente } from '@/servizi/usePannelloGiornata';

export type FaseRevisioni = { tipo: 'caricamento' } | { tipo: 'rete' } | { tipo: 'errore'; messaggio: string } | { tipo: 'pronto' };

/** Card "Nuova" con autrice e anteprima risolte per la schermata. */
export type NuovaPerSchermata = { id: string; numero: number; autore: AutoreRevisione | null; anteprima: string };
export type PassataPerSchermata = RevisionePassata & { incipit: string };

export type StatoSezioneRevisioni = {
  fase: FaseRevisioni;
  attive: CardRevisione[];
  nuove: Record<string, NuovaPerSchermata>;
  passate: PassataPerSchermata[];
  nuovaPresente: boolean;
  carica: () => void;
};

/** Profili delle autrici letti in questa sessione (memoria dei profili in servizi/diario) con la foto già su disco. */
type Autori = Record<string, { profilo: RigaAutore | null; fotoPronta: boolean }>;

export function useRevisioni(clientId: string, nutrizionista: NutrizionistaCliente): StatoSezioneRevisioni {
  const memoria = useMemoriaRevisioni();
  const giaInMemoria = memoria.clientId === clientId && memoria.righe !== null;
  const [fase, setFase] = useState<FaseRevisioni>(giaInMemoria ? { tipo: 'pronto' } : { tipo: 'caricamento' });
  const [autori, setAutori] = useState<Autori>({});
  const montato = useRef(true);
  const nutrizionistaRef = useRef(nutrizionista);
  useEffect(() => {
    nutrizionistaRef.current = nutrizionista;
  }, [nutrizionista]);

  const carica = useCallback(() => {
    let attivo = true;
    caricaRevisioni(clientId, nutrizionistaRef.current?.foto ?? null).then((esito) => {
      if (!attivo || !montato.current) return;
      switch (esito.tipo) {
        case 'ok':
          setFase({ tipo: 'pronto' });
          break;
        case 'rete':
          setFase((f) => (f.tipo === 'pronto' ? f : { tipo: 'rete' }));
          break;
        case 'errore':
        case 'nonAutenticato':
          setFase((f) => (f.tipo === 'pronto' ? f : { tipo: 'errore', messaggio: esito.tipo === 'errore' ? esito.messaggio : 'Sessione non valida' }));
          break;
      }
    });
    return () => {
      attivo = false;
    };
  }, [clientId]);

  useEffect(() => {
    montato.current = true;
    const annulla = carica();
    const sub = AppState.addEventListener('change', (stato: AppStateStatus) => {
      if (stato === 'active') carica();
    });
    return () => {
      montato.current = false;
      annulla();
      sub.remove();
    };
  }, [carica]);

  const righe = memoria.clientId === clientId ? (memoria.righe ?? []) : [];
  const sezione = sezioneRevisioni(righe);

  // Autrici delle Nuove: una lettura per profilo (in memoria dopo la prima), più la verifica della foto su disco.
  const idsAutrici = sezione.attive.flatMap((c) => (c.tipo === 'nuova' && c.autoreId ? [c.autoreId] : [])).join(',');
  useEffect(() => {
    let attivo = true;
    const ids = idsAutrici ? idsAutrici.split(',') : [];
    void Promise.all(
      ids.map(async (id) => {
        const profilo = await leggiAutore(id);
        const fotoPronta = profilo?.app_square_photo_url ? await fotoInCache(profilo.app_square_photo_url) : false;
        return [id, { profilo, fotoPronta }] as const;
      }),
    ).then((voci) => {
      if (attivo && montato.current) setAutori((a) => ({ ...a, ...Object.fromEntries(voci) }));
    });
    return () => {
      attivo = false;
    };
  }, [idsAutrici]);

  const nuove: Record<string, NuovaPerSchermata> = {};
  for (const c of sezione.attive) {
    if (c.tipo !== 'nuova') continue;
    const noto = c.autoreId ? autori[c.autoreId] : undefined;
    const autore = autoreRevisione(noto?.profilo ?? null, nutrizionista);
    if (autore && noto?.fotoPronta) autore.fotoPronta = true;
    nuove[c.id] = { id: c.id, numero: c.numero, autore, anteprima: memoria.testi[c.id]?.anteprima ?? '' };
  }
  const passate: PassataPerSchermata[] = sezione.passate.map((p) => ({ ...p, incipit: memoria.testi[p.id]?.incipit ?? '' }));

  return { fase, attive: sezione.attive, nuove, passate, nuovaPresente: sezione.nuovaPresente, carica };
}
