import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';

import { dataValida } from '@/core/diario/data';
import { giorniSettimana } from '@/core/diario/settimana';
import type { Profilo } from '@/core/stato/stato';
import { statoCorrente } from '@/servizi/statoCliente';
import { useDiario } from '@/servizi/useDiario';
import type { VoceNavigazione } from '@/ui/BarraNavigazione';
import { SchermataOggi } from '@/ui/schermate/SchermataOggi';
import { SchermataCaricamento, SchermataErroreCaricamento, SchermataSenzaConnessione } from '@/ui/schermate/SchermateTrasversali';

/**
 * Stato J: app dell'abbonato, pagina Oggi (step 5). Piano, Revisioni, campanella e menu restano segnaposti.
 * `/abbonato?giornata=YYYY-MM-DD` apre direttamente il pannello di quella giornata (per la push del commento, step 6).
 */
export default function RottaAbbonato() {
  const stato = statoCorrente();
  if (stato?.codice !== 'J') return <Redirect href="/" />;
  return <Oggi profilo={stato.profilo} />;
}

const STRUTTURA = { barraSuperiore: 'completa', barraNavigazione: 'oggi' } as const;

function Oggi({ profilo }: { profilo: Profilo }) {
  const router = useRouter();
  const { giornata: giornataRichiesta } = useLocalSearchParams<{ giornata?: string }>();
  const diario = useDiario(profilo.clientId, profilo.nutrizionista);

  // Rotta diretta: appena la pagina è pronta si apre il pannello della data richiesta, una volta per valore.
  const giornataAperta = useRef<string | null>(null);
  useEffect(() => {
    if (diario.fase.tipo !== 'pronto' || !giornataRichiesta || !dataValida(giornataRichiesta) || giornataAperta.current === giornataRichiesta) return;
    giornataAperta.current = giornataRichiesta;
    diario.apriGiornata(giornataRichiesta);
  }, [diario, giornataRichiesta]);

  const onNavigazione = useCallback(
    (voce: VoceNavigazione) => {
      // Account è l'unica pagina già esistente (segnaposto con "Esci"); Piano e Revisioni arrivano con gli step successivi.
      if (voce === 'account') router.push('/account');
    },
    [router],
  );
  const onRacconta = useCallback(() => router.push('/racconta'), [router]);
  const onRiprovaPannello = useCallback(() => {
    const data = diario.pannello?.data;
    if (!data) return;
    diario.chiudiPannello();
    diario.apriGiornata(data);
  }, [diario]);

  if (diario.fase.tipo === 'caricamento' || !diario.locale) {
    if (diario.fase.tipo === 'rete') return <SchermataSenzaConnessione onRiprova={diario.carica} {...STRUTTURA} />;
    if (diario.fase.tipo === 'errore') return <SchermataErroreCaricamento onRiprova={diario.carica} descrizione="Non riusciamo a caricare il tuo diario. Riprova tra poco." {...STRUTTURA} />;
    return <SchermataCaricamento {...STRUTTURA} />;
  }

  const notifica = diario.notifica
    ? {
        chiave: diario.notifica.testo,
        tipo: diario.notifica.tipo,
        testo: diario.notifica.testo,
        onRiprova: diario.notifica.tipo === 'errore' && diario.notifica.riprova ? diario.riprova : undefined,
        onScomparsa: diario.notifica.tipo === 'conferma' ? diario.nascondiNotifica : undefined,
      }
    : undefined;

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
      notifica={notifica}
      giornata={{
        pannello: diario.pannello,
        onApriGiorno: diario.apriGiornata,
        onChiudiPannello: diario.chiudiPannello,
        onRiprovaPannello,
        onModifica: diario.modificaGiornata,
        onChiudiModifica: diario.chiudiModifica,
        onAvantiModifica: diario.avantiModifica,
        onIndietroModifica: diario.indietroModifica,
        onVaiAModifica: diario.vaiAModifica,
        onAggiornaGiornata: diario.aggiornaGiornata,
      }}
    />
  );
}
