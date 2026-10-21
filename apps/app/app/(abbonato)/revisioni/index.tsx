import { Redirect, useRouter } from 'expo-router';
import { useCallback } from 'react';

import type { Profilo } from '@/core/stato/stato';
import { useNotificheNuove } from '@/servizi/notifiche';
import { statoCorrente } from '@/servizi/statoCliente';
import { useRevisioni } from '@/servizi/useRevisioni';
import { SchermataRevisioni } from '@/ui/schermate/SchermataRevisioni';
import { SchermataCaricamento, SchermataErroreCaricamento, SchermataSenzaConnessione } from '@/ui/schermate/SchermateTrasversali';

/** Sezione Revisioni (step 7): card di avanzamento, revisioni Nuove ed elenco delle passate. Solo per l'abbonato (stato J). */
export default function RottaRevisioni() {
  const stato = statoCorrente();
  if (stato?.codice !== 'J') return <Redirect href="/" />;
  return <Revisioni profilo={stato.profilo} />;
}

const STRUTTURA = { barraSuperiore: 'completa', barraNavigazione: 'revisioni' } as const;

function Revisioni({ profilo }: { profilo: Profilo }) {
  const router = useRouter();
  const revisioni = useRevisioni(profilo.clientId, profilo.nutrizionista);
  const onApri = useCallback((id: string) => router.push({ pathname: '/revisione/[id]', params: { id } }), [router]);
  const onMenu = useCallback(() => router.push('/menu'), [router]);
  const onNotifiche = useCallback(() => router.push('/notifiche'), [router]);
  const notificheNuove = useNotificheNuove();

  if (revisioni.fase.tipo === 'rete') return <SchermataSenzaConnessione onRiprova={revisioni.carica} {...STRUTTURA} revisioneNuova={revisioni.nuovaPresente} notificheNuove={notificheNuove} />;
  if (revisioni.fase.tipo === 'errore') return <SchermataErroreCaricamento onRiprova={revisioni.carica} titolo="Revisioni" descrizione="Non riusciamo a caricare le tue revisioni. Riprova tra poco." {...STRUTTURA} notificheNuove={notificheNuove} />;
  if (revisioni.fase.tipo === 'caricamento') return <SchermataCaricamento {...STRUTTURA} notificheNuove={notificheNuove} />;

  return <SchermataRevisioni attive={revisioni.attive} nuove={revisioni.nuove} passate={revisioni.passate} nuovaPresente={revisioni.nuovaPresente} onApri={onApri} onMenu={onMenu} onNotifiche={onNotifiche} notificheNuove={notificheNuove} />;
}
