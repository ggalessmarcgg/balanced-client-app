import { Redirect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

import type { Profilo } from '@/core/stato/stato';
import { statoCorrente } from '@/servizi/statoCliente';
import { usePannelloGiornata, type NotificaDiario } from '@/servizi/usePannelloGiornata';
import { useStorico } from '@/servizi/useStorico';
import { PannelloGiornata } from '@/ui/diario/PannelloGiornata';
import { NotificaInBasso } from '@/ui/schermate/NotificaInBasso';
import { SchermataStorico } from '@/ui/schermate/SchermataStorico';

/** Storico delle giornate (step 5, lotto 3): dall'icona Calendario della Card settimana; i giorni condivisi aprono il pannello della giornata. */
export default function RottaStorico() {
  const stato = statoCorrente();
  if (stato?.codice !== 'J') return <Redirect href="/" />;
  return <Storico profilo={stato.profilo} />;
}

function Storico({ profilo }: { profilo: Profilo }) {
  const router = useRouter();
  const storico = useStorico(profilo.clientId);
  const [notifica, setNotifica] = useState<NotificaDiario | null>(null);
  const mostraNotifica = useCallback((n: NotificaDiario) => setNotifica(n), []);
  const pannello = usePannelloGiornata(profilo.clientId, profilo.nutrizionista, mostraNotifica);
  const onIndietro = useCallback(() => router.back(), [router]);
  const onRiprova = useCallback(() => {
    setNotifica(null);
    pannello.salvaModifiche(true);
  }, [pannello]);

  return (
    <SchermataStorico
      mesi={storico.mesi}
      calendarioDi={storico.calendarioDi}
      onMeseVisibile={storico.caricaMese}
      onApriGiorno={pannello.apriGiornata}
      onIndietro={onIndietro}
      errore={storico.fase === 'rete' || storico.fase === 'errore' ? { tipo: storico.fase, onRiprova: storico.riprova } : undefined}
      sovrapposti={
        <>
          <PannelloGiornata
            pannello={pannello.pannello}
            onChiudi={pannello.chiudiPannello}
            onRiprova={pannello.riprovaPannello}
            onModifica={pannello.modificaGiornata}
            onChiudiModifica={pannello.chiudiModifica}
            onAvanti={pannello.avantiModifica}
            onIndietro={pannello.indietroModifica}
            onVaiA={pannello.vaiAModifica}
            onAggiorna={pannello.aggiornaGiornata}
          />
          {notifica && (
            <NotificaInBasso
              key={notifica.testo}
              tipo={notifica.tipo}
              testo={notifica.testo}
              onRiprova={notifica.tipo === 'errore' && notifica.riprova ? onRiprova : undefined}
              onScomparsa={notifica.tipo === 'conferma' ? () => setNotifica(null) : undefined}
            />
          )}
        </>
      }
    />
  );
}
