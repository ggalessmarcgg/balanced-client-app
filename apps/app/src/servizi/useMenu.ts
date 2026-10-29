// Hook delle schermate del menu: lettura all'apertura e al ritorno in primo piano, fase per gli stati trasversali.
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { appuntamenti as calcolaAppuntamenti, type Appuntamenti } from '@/core/appuntamenti/appuntamenti';
import type { RigaContenuto } from '@/core/contenuti/contenuti';
import { datiMisure, type DatiMisure } from '@/core/misure/misure';
import { leggiAppuntamenti } from '@/servizi/appuntamenti';
import { leggiContenuti } from '@/servizi/contenuti';
import { copiaMisure, leggiMisure } from '@/servizi/misure';
import { leggiNutrizionista, type DatiNutrizionista } from '@/servizi/nutrizionista';

export type FaseMenu = { tipo: 'caricamento' } | { tipo: 'rete' } | { tipo: 'errore' } | { tipo: 'pronto' };

export type Lettura<T> = () => Promise<{ tipo: 'ok'; dati: T } | { tipo: 'nonAutenticato' } | { tipo: 'rete' } | { tipo: 'errore'; messaggio: string }>;

/**
 * Lettura comune: prima volta e a ogni ritorno in primo piano; i dati già mostrati non si sostituiscono con un errore.
 * `iniziale`: dati già in memoria da mostrare subito (fase pronta) mentre la lettura li aggiorna.
 * `copia`: copia salvata su file (lettura asincrona), mostrata appena arriva se la lettura dal server non ha ancora
 * risposto; i dati del server, quando arrivano, la sostituiscono. Senza, con la rete assente la schermata restava sui
 * segnaposti finché la richiesta non scadeva (su Android anche 20 s, correzione del 30/10/2026).
 */
export function useLetturaMenu<T>(leggi: Lettura<T>, iniziale?: () => T | null, copia?: () => Promise<T | null>): { fase: FaseMenu; dati: T | null; ricarica: () => void } {
  const [dati, setDati] = useState<T | null>(() => iniziale?.() ?? null);
  const [fase, setFase] = useState<FaseMenu>(() => (dati !== null ? { tipo: 'pronto' } : { tipo: 'caricamento' }));
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
    if (copia) {
      copia().then((c) => {
        if (!montato.current || c === null) return;
        // Solo se il server non ha ancora risposto: i suoi dati, se già arrivati, restano.
        setDati((d) => d ?? c);
        setFase((f) => (f.tipo === 'pronto' ? f : { tipo: 'pronto' }));
      });
    }
    const sub = AppState.addEventListener('change', (stato: AppStateStatus) => {
      if (stato === 'active') ricarica();
    });
    return () => {
      montato.current = false;
      annulla();
      sub.remove();
    };
  }, [ricarica, copia]);
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

export function usePesoMisure(clientId: string) {
  const leggi = useCallback<Lettura<DatiMisure>>(async () => {
    const esito = await leggiMisure(clientId);
    return esito.tipo === 'ok' ? { tipo: 'ok', dati: datiMisure(esito.riga) } : esito;
  }, [clientId]);
  // La copia su file compare subito, come nelle altre schermate; la lettura dal server poi la aggiorna.
  const copia = useCallback(async () => {
    const salvata = await copiaMisure(clientId);
    return salvata ? datiMisure(salvata.riga) : null;
  }, [clientId]);
  return useLetturaMenu(leggi, undefined, copia);
}

export function useContenuti() {
  const leggi = useCallback<Lettura<RigaContenuto[]>>(async () => {
    const esito = await leggiContenuti();
    return esito.tipo === 'ok' ? { tipo: 'ok', dati: esito.righe } : esito;
  }, []);
  return useLetturaMenu(leggi);
}
