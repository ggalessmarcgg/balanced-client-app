// Hook delle schermate del menu: lettura all'apertura e al ritorno in primo piano, fase per gli stati trasversali.
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { appuntamenti as calcolaAppuntamenti, type Appuntamenti } from '@/core/appuntamenti/appuntamenti';
import { leggiAppuntamenti } from '@/servizi/appuntamenti';
import { leggiNutrizionista, type DatiNutrizionista } from '@/servizi/nutrizionista';

export type FaseMenu = { tipo: 'caricamento' } | { tipo: 'rete' } | { tipo: 'errore' } | { tipo: 'pronto' };

type Lettura<T> = () => Promise<{ tipo: 'ok'; dati: T } | { tipo: 'nonAutenticato' } | { tipo: 'rete' } | { tipo: 'errore'; messaggio: string }>;

/** Lettura comune: prima volta e a ogni ritorno in primo piano; i dati già mostrati non si sostituiscono con un errore. */
function useLetturaMenu<T>(leggi: Lettura<T>): { fase: FaseMenu; dati: T | null; ricarica: () => void } {
  const [fase, setFase] = useState<FaseMenu>({ tipo: 'caricamento' });
  const [dati, setDati] = useState<T | null>(null);
  const montato = useRef(true);
  const ricarica = useCallback(() => {
    let attivo = true;
    leggi().then((esito) => {
      if (!attivo || !montato.current) return;
      if (esito.tipo === 'ok') {
        setDati(esito.dati);
        setFase({ tipo: 'pronto' });
      } else setFase((f) => (f.tipo === 'pronto' ? f : { tipo: esito.tipo === 'rete' ? 'rete' : 'errore' }));
    });
    return () => {
      attivo = false;
    };
  }, [leggi]);
  useEffect(() => {
    montato.current = true;
    const annulla = ricarica();
    const sub = AppState.addEventListener('change', (stato: AppStateStatus) => {
      if (stato === 'active') ricarica();
    });
    return () => {
      montato.current = false;
      annulla();
      sub.remove();
    };
  }, [ricarica]);
  return { fase, dati, ricarica };
}

export function useNutrizionista(clientId: string) {
  const leggi = useCallback<Lettura<DatiNutrizionista>>(async () => {
    const esito = await leggiNutrizionista(clientId);
    return esito.tipo === 'ok' ? { tipo: 'ok', dati: esito.dati } : esito;
  }, [clientId]);
  return useLetturaMenu(leggi);
}

export function useAppuntamenti(clientId: string) {
  const leggi = useCallback<Lettura<Appuntamenti>>(async () => {
    const esito = await leggiAppuntamenti(clientId);
    return esito.tipo === 'ok' ? { tipo: 'ok', dati: calcolaAppuntamenti(esito.riga, new Date()) } : esito;
  }, [clientId]);
  return useLetturaMenu(leggi);
}
