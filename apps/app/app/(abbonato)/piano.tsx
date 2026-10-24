import { Redirect, useRouter } from 'expo-router';
import { useCallback } from 'react';

import type { Profilo } from '@/core/stato/stato';
import { useNuovaRevisione } from '@/servizi/memoriaRevisioni';
import { useNotificheNuove } from '@/servizi/notifiche';
import { statoCorrente } from '@/servizi/statoCliente';
import { usePiano } from '@/servizi/usePiano';
import { SchermataPiano, type FasePiano } from '@/ui/schermate/SchermataPiano';

/** Scheda Piano (step 8): il piano corrente dell'abbonato, letto all'apertura e al ritorno in primo piano. Solo per lo stato J. */
export default function RottaPiano() {
  const stato = statoCorrente();
  if (stato?.codice !== 'J') return <Redirect href="/" />;
  return <Piano profilo={stato.profilo} />;
}

function Piano({ profilo }: { profilo: Profilo }) {
  const router = useRouter();
  const notificheNuove = useNotificheNuove();
  const revisioneNuova = useNuovaRevisione();
  const { fase, dati, ricarica } = usePiano(profilo.clientId);
  const onIndicazioni = useCallback(() => router.push('/indicazioni'), [router]);
  const onMenu = useCallback(() => router.push('/menu'), [router]);
  const onNotifiche = useCallback(() => router.push('/notifiche'), [router]);
  const faseSchermata: FasePiano =
    fase.tipo === 'pronto' && dati ? { tipo: 'pronto', piano: dati.piano, daCache: dati.daCache } : fase.tipo === 'caricamento' || fase.tipo === 'pronto' ? { tipo: 'caricamento' } : { tipo: fase.tipo, onRiprova: ricarica };
  return <SchermataPiano fase={faseSchermata} onIndicazioni={onIndicazioni} onMenu={onMenu} onNotifiche={onNotifiche} notificheNuove={notificheNuove} revisioneNuova={revisioneNuova} />;
}
