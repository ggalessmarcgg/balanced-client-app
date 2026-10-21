import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { andamentoSettimana } from '@/core/diario/andamento';
import { dataValida } from '@/core/diario/data';
import { giorniSettimana } from '@/core/diario/settimana';
import type { Profilo } from '@/core/stato/stato';
import { useNuovaRevisione } from '@/servizi/memoriaRevisioni';
import { aggiornaStatoRevisioni } from '@/servizi/revisioni';
import { statoCorrente } from '@/servizi/statoCliente';
import { useDiario } from '@/servizi/useDiario';
import { usePannelloGiornata } from '@/servizi/usePannelloGiornata';
import type { VoceNavigazione } from '@/ui/BarraNavigazione';
import { SchermataOggi } from '@/ui/schermate/SchermataOggi';
import { SchermataCaricamento, SchermataErroreCaricamento, SchermataSenzaConnessione } from '@/ui/schermate/SchermateTrasversali';

/**
 * Stato J: app dell'abbonato, pagina Oggi (step 5). Revisioni dallo step 7; Piano, campanella e menu restano segnaposti.
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
  const pannello = usePannelloGiornata(profilo.clientId, profilo.nutrizionista, diario.mostraNotifica);
  // Pallino "Nuova revisione" sulla barra: una lettura leggera dello stato delle revisioni all'avvio dell'app
  // dell'abbonato, a ogni ritorno in primo piano (e dopo la condivisione di un diario, in useDiario); nessun testo.
  const revisioneNuova = useNuovaRevisione();
  useEffect(() => {
    aggiornaStatoRevisioni(profilo.clientId);
    const sub = AppState.addEventListener('change', (stato: AppStateStatus) => {
      if (stato === 'active') aggiornaStatoRevisioni(profilo.clientId);
    });
    return () => sub.remove();
  }, [profilo.clientId]);

  // Rotta diretta: appena la pagina è pronta si apre il pannello della data richiesta, una volta per valore.
  const giornataAperta = useRef<string | null>(null);
  const { apriGiornata } = pannello;
  useEffect(() => {
    if (diario.fase.tipo !== 'pronto' || !giornataRichiesta || !dataValida(giornataRichiesta) || giornataAperta.current === giornataRichiesta) return;
    giornataAperta.current = giornataRichiesta;
    apriGiornata(giornataRichiesta);
  }, [diario.fase.tipo, giornataRichiesta, apriGiornata]);

  const onNavigazione = useCallback(
    (voce: VoceNavigazione) => {
      // Account è un segnaposto con "Esci"; Piano arriva con uno step successivo. Tra le voci della barra si passa
      // senza impilare le pagine.
      if (voce === 'account') router.push('/account');
      if (voce === 'revisioni') router.replace('/revisioni');
    },
    [router],
  );
  const onRacconta = useCallback(() => router.push('/racconta'), [router]);
  const onApriStorico = useCallback(() => router.push('/storico'), [router]);
  const { riprova: riprovaBozza } = diario;
  const { salvaModifiche } = pannello;
  const onRiprova = useCallback(() => {
    riprovaBozza();
    salvaModifiche(true);
  }, [riprovaBozza, salvaModifiche]);

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
        onRiprova: diario.notifica.tipo === 'errore' && diario.notifica.riprova ? onRiprova : undefined,
        onScomparsa: diario.notifica.tipo === 'conferma' ? diario.nascondiNotifica : undefined,
      }
    : undefined;

  return (
    <SchermataOggi
      nome={profilo.nome}
      locale={diario.locale}
      giorni={giorniSettimana(diario.locale.data, diario.settimana)}
      andamento={andamentoSettimana(diario.locale.data, diario.settimana, { diario: diario.locale.diario, condiviso: diario.locale.riga.tipo === 'condiviso' })}
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
      revisioneNuova={revisioneNuova}
      onApriStorico={onApriStorico}
      notifica={notifica}
      giornata={{
        pannello: pannello.pannello,
        onApriGiorno: pannello.apriGiornata,
        onChiudiPannello: pannello.chiudiPannello,
        onRiprovaPannello: pannello.riprovaPannello,
        onModifica: pannello.modificaGiornata,
        onChiudiModifica: pannello.chiudiModifica,
        onAvantiModifica: pannello.avantiModifica,
        onIndietroModifica: pannello.indietroModifica,
        onVaiAModifica: pannello.vaiAModifica,
        onAggiornaGiornata: pannello.aggiornaGiornata,
      }}
    />
  );
}
