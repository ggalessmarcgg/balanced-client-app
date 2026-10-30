import { Redirect, useRouter } from 'expo-router';
import { useCallback } from 'react';

import type { Profilo } from '@/core/stato/stato';
import { useNuovaRevisione } from '@/servizi/memoriaRevisioni';
import { useNotificheNuove } from '@/servizi/notifiche';
import { statoCorrente } from '@/servizi/statoCliente';
import { usePiano } from '@/servizi/usePiano';
import { useRicette } from '@/servizi/useRicette';
import { useSostituzione, useTutorialPiano } from '@/servizi/useSostituzione';
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
  // Sostituzione e ricette (step 9): pannelli dalla riga toccata e da "Ricetta"; dopo riga_non_disponibile o
  // pasto_non_disponibile il piano riletto si mostra subito. La ricetta pronta apre la sua pagina.
  const sostituzione = useSostituzione(profilo.clientId, ricarica);
  const apriRicetta = useCallback(() => router.push('/ricetta'), [router]);
  const ricette = useRicette(profilo.clientId, apriRicetta, ricarica);
  const tutorial = useTutorialPiano(profilo.clientId);
  const { chiudi: chiudiPannello } = sostituzione.azioni;
  const { chiudi: chiudiPannelloRicette } = ricette.azioni;
  const onNutrizionista = useCallback(() => {
    chiudiPannello();
    router.push('/nutrizionista');
  }, [chiudiPannello, router]);
  const onNutrizionistaRicette = useCallback(() => {
    chiudiPannelloRicette();
    router.push('/nutrizionista');
  }, [chiudiPannelloRicette, router]);
  const notifica = ricette.notifica ?? sostituzione.notifica;
  const { chiudiNotifica: chiudiNotificaRicette } = ricette;
  const { chiudiNotifica: chiudiNotificaSostituzione } = sostituzione;
  const chiudiNotifica = useCallback(() => {
    chiudiNotificaRicette();
    chiudiNotificaSostituzione();
  }, [chiudiNotificaRicette, chiudiNotificaSostituzione]);
  const onIndicazioni = useCallback(() => router.push('/indicazioni'), [router]);
  const onMenu = useCallback(() => router.push('/menu'), [router]);
  const onNotifiche = useCallback(() => router.push('/notifiche'), [router]);
  const faseSchermata: FasePiano =
    fase.tipo === 'pronto' && dati ? { tipo: 'pronto', piano: dati.piano, daCache: dati.daCache } : fase.tipo === 'caricamento' || fase.tipo === 'pronto' ? { tipo: 'caricamento' } : { tipo: fase.tipo, onRiprova: ricarica };
  return (
    <SchermataPiano
      fase={faseSchermata}
      sostituzione={{ stato: sostituzione.stato, azioni: sostituzione.azioni, onNutrizionista, consenso: sostituzione.consenso }}
      ricette={{ stato: ricette.stato, azioni: ricette.azioni, onNutrizionista: onNutrizionistaRicette, consenso: ricette.consenso }}
      tutorial={{ passo: tutorial.passo, onAvanti: tutorial.avanti, onHoCapito: tutorial.hoCapito }}
      notifica={notifica}
      onNotificaScomparsa={chiudiNotifica}
      onIndicazioni={onIndicazioni}
      onMenu={onMenu}
      onNotifiche={onNotifiche}
      notificheNuove={notificheNuove}
      revisioneNuova={revisioneNuova}
    />
  );
}
