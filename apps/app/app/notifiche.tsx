import { Redirect, useRouter } from 'expo-router';
import { useCallback } from 'react';

import type { Notifica } from '@/core/notifiche/notifiche';
import type { Profilo } from '@/core/stato/stato';
import { statoCorrente } from '@/servizi/statoCliente';
import { useNotifiche } from '@/servizi/useNotifiche';
import { SchermataNotifiche } from '@/ui/schermate/SchermataNotifiche';

/** Menu · 2 · Notifiche (step 11): dalla campanella della barra superiore dell'abbonato. */
export default function RottaNotifiche() {
  const stato = statoCorrente();
  if (stato?.codice !== 'J') return <Redirect href="/" />;
  return <Notifiche profilo={stato.profilo} />;
}

function Notifiche({ profilo }: { profilo: Profilo }) {
  const router = useRouter();
  const notifiche = useNotifiche(profilo);
  const onIndietro = useCallback(() => (router.canGoBack() ? router.back() : router.replace('/abbonato')), [router]);
  const { apri } = notifiche;
  const onApri = useCallback(
    (notifica: Notifica) => {
      apri(notifica).then((d) => {
        if (!d) return;
        switch (d.tipo) {
          case 'giornata':
            router.navigate({ pathname: '/abbonato', params: { giornata: d.data } });
            break;
          case 'revisione':
            router.push({ pathname: '/revisione/[id]', params: { id: d.id } });
            break;
          case 'revisioni':
            router.navigate('/revisioni');
            break;
          case 'nutrizionista':
            router.push('/nutrizionista');
            break;
        }
      });
    },
    [apri, router],
  );
  const fase =
    notifiche.fase.tipo === 'pronto'
      ? { tipo: 'pronto' as const, elenco: notifiche.elenco }
      : notifiche.fase.tipo === 'caricamento'
        ? { tipo: 'caricamento' as const }
        : { tipo: notifiche.fase.tipo, onRiprova: notifiche.ricarica };
  return <SchermataNotifiche fase={fase} onIndietro={onIndietro} onApri={onApri} />;
}
