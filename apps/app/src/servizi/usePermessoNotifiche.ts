// Permesso delle notifiche in Account (step 6, contratto §5): letto all'apertura e a ogni rientro in primo piano (il
// cliente può cambiarlo nelle impostazioni), "Attiva le notifiche" chiede il permesso di sistema, "Apri le impostazioni"
// quando il sistema non permette più di chiederlo; la riga del telefono si aggiorna dopo ogni cambio.
import { useCallback, useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { azionePerPermesso, type AzionePermesso } from '@/core/notifiche/dispositivo';
import { aggiornaPermessoDispositivo } from '@/servizi/dispositivo';
import { apriImpostazioniNotifiche, chiediPermesso, statoPermesso } from '@/servizi/notifichePush';

export type PermessoNotificheAccount = {
  /** null finché il permesso non è stato letto. */
  azione: AzionePermesso | null;
  inRichiesta: boolean;
  attiva: () => void;
  apriImpostazioni: () => void;
};

export function usePermessoNotifiche(): PermessoNotificheAccount {
  const [azione, setAzione] = useState<AzionePermesso | null>(null);
  const [inRichiesta, setInRichiesta] = useState(false);
  const rileggi = useCallback(() => {
    let attivo = true;
    statoPermesso().then((s) => {
      if (attivo) setAzione(azionePerPermesso(s.permesso, s.puoChiedere));
      void aggiornaPermessoDispositivo();
    });
    return () => {
      attivo = false;
    };
  }, []);
  useEffect(() => {
    const annulla = rileggi();
    const sub = AppState.addEventListener('change', (stato: AppStateStatus) => {
      if (stato === 'active') rileggi();
    });
    return () => {
      annulla();
      sub.remove();
    };
  }, [rileggi]);
  const attiva = useCallback(() => {
    setInRichiesta(true);
    chiediPermesso()
      .then((s) => {
        setAzione(azionePerPermesso(s.permesso, s.puoChiedere));
        void aggiornaPermessoDispositivo();
      })
      .finally(() => setInRichiesta(false));
  }, []);
  return { azione, inRichiesta, attiva, apriImpostazioni: apriImpostazioniNotifiche };
}
