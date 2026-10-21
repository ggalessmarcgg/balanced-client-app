import Constants from 'expo-constants';
import { Redirect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { cambiaPromemoria, inizialiNome, revisioniRicevute, TESTI_ELIMINAZIONE, URL_PRIVACY, URL_TERMINI, type Promemoria } from '@/core/account/account';
import type { Profilo } from '@/core/stato/stato';
import { apriPaginaWeb, leggiAbbonamento, scriviPromemoria } from '@/servizi/account';
import { useMemoriaRevisioni, useNuovaRevisione } from '@/servizi/memoriaRevisioni';
import { useNotificheNuove } from '@/servizi/notifiche';
import { aggiornaStatoRevisioni } from '@/servizi/revisioni';
import { aggiornaAccountInMemoria, statoCorrente } from '@/servizi/statoCliente';
import { useAzioniStato } from '@/servizi/useAzioniStato';
import { PannelloEliminaAccount, type PassoEliminazione } from '@/ui/account/PannelloEliminaAccount';
import { NotificaInBasso } from '@/ui/schermate/NotificaInBasso';
import { SchermataAccount, type FaseAbbonamento } from '@/ui/schermate/SchermataAccount';
import { INGOMBRO_BARRA_NAVIGAZIONE } from '@/ui/schermate/SchermateTrasversali';
import { useBarraPersistente } from '@/ui/schermate/Sovrapposti';

const TESTO_ERRORE_PROMEMORIA = 'Non siamo riusciti a salvare la preferenza. Riprova tra poco.';

/**
 * Account · 1 (step 11): scheda della barra per l'abbonato, pulsante "Account" degli stati H e K (senza barra).
 * Profilo e statistiche dallo stato già letto; abbonamento dalla function (una volta l'ora); promemoria scritti su
 * clients; eliminazione dell'account solo come percorso di interfaccia (nessun sistema la esegue oggi).
 */
export default function RottaAccount() {
  const stato = statoCorrente();
  if (!stato || !('profilo' in stato)) return <Redirect href="/" />;
  return <Account profilo={stato.profilo} />;
}

function Account({ profilo }: { profilo: Profilo }) {
  const router = useRouter();
  const conBarra = useBarraPersistente();
  const { onEsci, onNutrizionista, onNotifiche, onEmailSupporto, onTelefonoSupporto, sovrapposti } = useAzioniStato({ sopraLaBarra: conBarra });
  const revisioneNuova = useNuovaRevisione();
  const notificheNuove = useNotificheNuove();
  const revisioni = useMemoriaRevisioni();
  const [promemoria, setPromemoria] = useState<Promemoria>(profilo.account.promemoria);
  const [abbonamento, setAbbonamento] = useState<FaseAbbonamento>({ tipo: 'caricamento' });
  const [passo, setPasso] = useState<PassoEliminazione | null>(null);
  const [avviso, setAvviso] = useState<{ chiave: number; testo: string } | null>(null);

  // "Revisioni ricevute" dalle revisioni già in memoria: una lettura leggera se non ci sono ancora.
  useEffect(() => {
    if (revisioni.clientId !== profilo.clientId || revisioni.righe === null) aggiornaStatoRevisioni(profilo.clientId);
  }, [profilo.clientId, revisioni.clientId, revisioni.righe]);

  useEffect(() => {
    let attivo = true;
    leggiAbbonamento(profilo.account.conStripe).then((esito) => {
      if (attivo) setAbbonamento({ tipo: 'pronto', abbonamento: esito.tipo === 'ok' ? esito.abbonamento : null });
    });
    return () => {
      attivo = false;
    };
  }, [profilo.account.conStripe]);

  const onPromemoria = useCallback(
    (campo: keyof Promemoria, valore: boolean) => {
      const precedente = promemoria;
      const { promemoria: nuovo, scrittura } = cambiaPromemoria(precedente, campo, valore);
      if (Object.keys(scrittura).length === 0) return;
      setPromemoria(nuovo);
      scriviPromemoria(profilo.clientId, scrittura).then((ok) => {
        if (ok) aggiornaAccountInMemoria({ promemoria: nuovo }, scrittura);
        else {
          setPromemoria(precedente);
          setAvviso({ chiave: Date.now(), testo: TESTO_ERRORE_PROMEMORIA });
        }
      });
    },
    [promemoria, profilo.clientId],
  );
  const onPrivacy = useCallback(() => void apriPaginaWeb(URL_PRIVACY), []);
  const onTermini = useCallback(() => void apriPaginaWeb(URL_TERMINI), []);
  const onElimina = useCallback(() => setPasso('avviso'), []);
  const chiudiEliminazione = useCallback(() => setPasso(null), []);
  const continuaEliminazione = useCallback(() => setPasso('conferma'), []);
  const confermaEliminazione = useCallback(() => {
    setPasso(null);
    setAvviso({ chiave: Date.now(), testo: TESTI_ELIMINAZIONE.nonDisponibile });
  }, []);
  const nascondiAvviso = useCallback(() => setAvviso(null), []);
  const onMenu = useCallback(() => router.push('/menu'), [router]);
  const onIndietro = useCallback(() => (router.canGoBack() ? router.back() : router.replace('/')), [router]);

  return (
    <SchermataAccount
      nomeCompleto={profilo.nomeCompleto}
      iniziali={inizialiNome(profilo.nomeCompleto)}
      email={profilo.account.email}
      giornateCondivise={profilo.account.giornateCondivise}
      revisioniRicevute={revisioniRicevute(revisioni.clientId === profilo.clientId ? (revisioni.righe ?? []) : [])}
      nutrizionista={profilo.nutrizionista}
      promemoria={promemoria}
      abbonamento={abbonamento}
      versione={Constants.expoConfig?.version ?? '0.0.0'}
      notificheNuove={notificheNuove}
      revisioneNuova={revisioneNuova}
      conBarra={conBarra}
      onPromemoria={onPromemoria}
      onNutrizionista={onNutrizionista}
      onEmailSupporto={onEmailSupporto}
      onTelefonoSupporto={onTelefonoSupporto}
      onPrivacy={onPrivacy}
      onTermini={onTermini}
      onElimina={onElimina}
      onEsci={onEsci}
      onNotifiche={onNotifiche}
      onMenu={onMenu}
      onIndietro={onIndietro}
      sovrapposti={
        <>
          {sovrapposti}
          <PannelloEliminaAccount passo={passo} onIndietro={chiudiEliminazione} onContinua={continuaEliminazione} onElimina={confermaEliminazione} />
          {avviso ? <NotificaInBasso key={avviso.chiave} tipo="conferma" testo={avviso.testo} onScomparsa={nascondiAvviso} sopra={conBarra ? INGOMBRO_BARRA_NAVIGAZIONE : 0} /> : null}
        </>
      }
    />
  );
}
