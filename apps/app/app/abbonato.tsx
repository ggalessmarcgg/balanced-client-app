import { Redirect, useRouter } from 'expo-router';
import { useCallback } from 'react';

import { giorniSettimana } from '@/core/diario/settimana';
import type { Profilo } from '@/core/stato/stato';
import { statoCorrente } from '@/servizi/statoCliente';
import { useDiario } from '@/servizi/useDiario';
import type { VoceNavigazione } from '@/ui/BarraNavigazione';
import { NotificaInBasso } from '@/ui/schermate/NotificaInBasso';
import { SchermataOggi } from '@/ui/schermate/SchermataOggi';
import { INGOMBRO_BARRA_NAVIGAZIONE, SchermataCaricamento, SchermataErroreCaricamento, SchermataSenzaConnessione } from '@/ui/schermate/SchermateTrasversali';

/** Stato J: app dell'abbonato, pagina Oggi (step 5, lotto 1). Piano, Revisioni, campanella e menu restano segnaposti. */
export default function RottaAbbonato() {
  const stato = statoCorrente();
  if (stato?.codice !== 'J') return <Redirect href="/" />;
  return <Oggi profilo={stato.profilo} />;
}

const STRUTTURA = { barraSuperiore: 'completa', barraNavigazione: 'oggi' } as const;

function Oggi({ profilo }: { profilo: Profilo }) {
  const router = useRouter();
  const diario = useDiario(profilo.clientId);

  const onNavigazione = useCallback(
    (voce: VoceNavigazione) => {
      // Account è l'unica pagina già esistente (segnaposto con "Esci"); Piano e Revisioni arrivano con gli step successivi.
      if (voce === 'account') router.push('/account');
    },
    [router],
  );
  const onRacconta = useCallback(() => router.push('/racconta'), [router]);

  if (diario.fase.tipo === 'caricamento' || !diario.locale) {
    if (diario.fase.tipo === 'rete') return <SchermataSenzaConnessione onRiprova={diario.carica} {...STRUTTURA} />;
    if (diario.fase.tipo === 'errore') return <SchermataErroreCaricamento onRiprova={diario.carica} descrizione="Non riusciamo a caricare il tuo diario. Riprova tra poco." {...STRUTTURA} />;
    return <SchermataCaricamento {...STRUTTURA} />;
  }

  const notifica = diario.notifica ? (
    <NotificaInBasso
      key={diario.notifica.testo}
      tipo={diario.notifica.tipo}
      testo={diario.notifica.testo}
      sopra={INGOMBRO_BARRA_NAVIGAZIONE}
      onRiprova={diario.notifica.tipo === 'errore' && diario.notifica.riprova ? diario.riprova : undefined}
      onScomparsa={diario.notifica.tipo === 'conferma' ? diario.nascondiNotifica : undefined}
    />
  ) : null;

  return (
    <SchermataOggi
      nome={profilo.nome}
      locale={diario.locale}
      giorni={giorniSettimana(diario.locale.data, diario.settimana)}
      blocco={diario.blocco}
      inviando={diario.inviando}
      onScrivi={diario.scrivi}
      onRacconta={onRacconta}
      onChiudi={diario.chiudi}
      onAvanti={diario.avanti}
      onIndietro={diario.indietro}
      onVaiA={diario.vaiA}
      onAggiorna={diario.aggiorna}
      onCondividi={diario.condividi}
      onNavigazione={onNavigazione}
      sovrapposti={notifica}
    />
  );
}
