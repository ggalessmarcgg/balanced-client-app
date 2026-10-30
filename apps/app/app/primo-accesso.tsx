import { Redirect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

import { URL_PRIVACY } from '@/core/account/account';
import { PAGINA, riduci, type EventoCarosello } from '@/core/primoAccesso/carosello';
import { apriPaginaWeb } from '@/servizi/account';
import { registraConsensoAI } from '@/servizi/consenso';
import { aggiornaPermessoDispositivo } from '@/servizi/dispositivo';
import { chiediPermesso } from '@/servizi/notifichePush';
import { segnaPrimoAccessoVisto } from '@/servizi/primoAccesso';
import { rottaPerStato } from '@/servizi/rotte';
import { statoCorrente } from '@/servizi/statoCliente';
import { SchermataPrimoAccesso } from '@/ui/primoAccesso/SchermataPrimoAccesso';
import { NotificaInBasso } from '@/ui/schermate/NotificaInBasso';

const TESTO_ERRORE_CONSENSO = 'Non siamo riusciti a salvare il consenso. Riprova tra poco.';

/**
 * Carosello del primo accesso (step 6, contratto §7): dopo il login e prima della schermata dello stato, una volta
 * per telefono. "Accetto" scrive il consenso (§8) e passa alla pagina 5; "Attiva le notifiche" chiede il permesso di
 * sistema e aggiorna la riga del telefono; alla fine si va alla rotta dello stato già letto.
 */
export default function RottaPrimoAccesso() {
  const stato = statoCorrente();
  if (!stato || !('profilo' in stato)) return <Redirect href="/" />;
  return <PrimoAccesso clientId={stato.profilo.clientId} rottaFinale={rottaPerStato(stato.codice)} />;
}

function PrimoAccesso({ clientId, rottaFinale }: { clientId: string; rottaFinale: string }) {
  const router = useRouter();
  const [pagina, setPagina] = useState<number>(PAGINA.benvenuto);
  const [accettoInCorso, setAccettoInCorso] = useState(false);
  const [attivaInCorso, setAttivaInCorso] = useState(false);
  const [avviso, setAvviso] = useState<{ chiave: number; testo: string } | null>(null);

  const fine = useCallback(() => {
    segnaPrimoAccessoVisto();
    router.replace(rottaFinale as never);
  }, [router, rottaFinale]);

  const applica = useCallback(
    (evento: EventoCarosello) => {
      const t = riduci(pagina, evento);
      if (t.effetti.includes('registraConsenso')) {
        // La pagina cambia solo con il consenso salvato (senza rete si resta qui con l'avviso).
        setAccettoInCorso(true);
        registraConsensoAI(clientId, 'granted')
          .then((ok) => {
            if (ok) setPagina(t.pagina);
            else setAvviso({ chiave: Date.now(), testo: TESTO_ERRORE_CONSENSO });
          })
          .finally(() => setAccettoInCorso(false));
        return;
      }
      setPagina(t.pagina);
      if (t.effetti.includes('chiediPermesso')) {
        setAttivaInCorso(true);
        chiediPermesso()
          .then(() => aggiornaPermessoDispositivo())
          .finally(() => {
            setAttivaInCorso(false);
            fine();
          });
        return;
      }
      if (t.effetti.includes('fine')) fine();
    },
    [pagina, clientId, fine],
  );

  const onInformativa = useCallback(() => void apriPaginaWeb(URL_PRIVACY), []);
  const nascondiAvviso = useCallback(() => setAvviso(null), []);
  return (
    <SchermataPrimoAccesso
      pagina={pagina}
      onAvanti={() => applica('avanti')}
      onSalta={() => applica('salta')}
      onAccetto={() => applica('accetto')}
      onNonOra={() => applica('nonOra')}
      onInformativa={onInformativa}
      onAttiva={() => applica('attiva')}
      onPiuTardi={() => applica('piuTardi')}
      accettoInCorso={accettoInCorso}
      attivaInCorso={attivaInCorso}
      sovrapposti={avviso ? <NotificaInBasso key={avviso.chiave} tipo="errore" testo={avviso.testo} onScomparsa={nascondiAvviso} /> : null}
    />
  );
}
