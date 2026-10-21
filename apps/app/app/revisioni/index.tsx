import { Redirect, useRouter } from 'expo-router';
import { useCallback } from 'react';

import type { Profilo } from '@/core/stato/stato';
import { statoCorrente } from '@/servizi/statoCliente';
import { useRevisioni } from '@/servizi/useRevisioni';
import type { VoceNavigazione } from '@/ui/BarraNavigazione';
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
  const onApri = useCallback((id: string) => router.push({ pathname: '/revisioni/[id]', params: { id } }), [router]);
  const onNavigazione = useCallback(
    (voce: VoceNavigazione) => {
      if (voce === 'oggi') router.replace('/abbonato');
      if (voce === 'account') router.push('/account');
    },
    [router],
  );

  if (revisioni.fase.tipo === 'rete') return <SchermataSenzaConnessione onRiprova={revisioni.carica} {...STRUTTURA} revisioneNuova={revisioni.nuovaPresente} />;
  if (revisioni.fase.tipo === 'errore') return <SchermataErroreCaricamento onRiprova={revisioni.carica} titolo="Revisioni" descrizione="Non riusciamo a caricare le tue revisioni. Riprova tra poco." {...STRUTTURA} />;
  if (revisioni.fase.tipo === 'caricamento') return <SchermataCaricamento {...STRUTTURA} />;

  return <SchermataRevisioni attive={revisioni.attive} nuove={revisioni.nuove} passate={revisioni.passate} nuovaPresente={revisioni.nuovaPresente} onApri={onApri} onNavigazione={onNavigazione} />;
}
