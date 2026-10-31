import Constants from 'expo-constants';
import { Redirect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { cambiaPromemoria, inizialiNome, revisioniRicevute, URL_PRIVACY, URL_TERMINI, type Promemoria } from '@/core/account/account';
import type { Profilo } from '@/core/stato/stato';
import { esci } from '@/servizi/accesso';
import { apriPaginaWeb, leggiAbbonamento, scriviPromemoria } from '@/servizi/account';
import { richiediEliminazione } from '@/servizi/eliminazioneAccount';
import { useMemoriaRevisioni, useNuovaRevisione } from '@/servizi/memoriaRevisioni';
import { useNotificheNuove } from '@/servizi/notifiche';
import { aggiornaStatoRevisioni } from '@/servizi/revisioni';
import { aggiornaAccountInMemoria, statoCorrente } from '@/servizi/statoCliente';
import { useAzioniStato } from '@/servizi/useAzioniStato';
import { useConsensoAI } from '@/servizi/useConsensoAI';
import { usePermessoNotifiche } from '@/servizi/usePermessoNotifiche';
import { PannelloEliminaAccount } from '@/ui/account/PannelloEliminaAccount';
import { useEliminazioneAccount } from '@/ui/account/useEliminazioneAccount';
import { NotificaInBasso } from '@/ui/schermate/NotificaInBasso';
import { SchermataAccount, type FaseAbbonamento } from '@/ui/schermate/SchermataAccount';
import { INGOMBRO_BARRA_NAVIGAZIONE } from '@/ui/schermate/SchermateTrasversali';
import { useBarraPersistente } from '@/ui/schermate/Sovrapposti';

const TESTO_ERRORE_PROMEMORIA = 'Non siamo riusciti a salvare la preferenza. Riprova tra poco.';
const TESTO_ERRORE_CONSENSO = 'Non siamo riusciti a salvare la scelta sulle funzioni AI. Riprova tra poco.';
const DURATA_NOTIFICA_ELIMINAZIONE_MS = 6000;

/**
 * Account · 1 (step 11): scheda della barra per l'abbonato, pulsante "Account" degli stati H e K (senza barra).
 * Profilo e statistiche dallo stato già letto; abbonamento dalla function (una volta l'ora); promemoria scritti su
 * clients; eliminazione dell'account con la richiesta al server degli agenti (contratto eliminazione account v0.1 §2):
 * dopo l'esito positivo lo stesso percorso di "Esci" e la conferma nella schermata di accesso.
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
  const [avviso, setAvviso] = useState<{ chiave: number; testo: string } | null>(null);
  // Eliminazione (contratto §2.4): esito positivo, anche "già registrata" → Esci e conferma nella schermata di accesso.
  const dopoRegistrata = useCallback(async () => {
    await esci();
    router.replace({ pathname: '/accesso', params: { avviso: 'eliminazione' } });
  }, [router]);
  const eliminazione = useEliminazioneAccount({ richiedi: richiediEliminazione, dopoRegistrata });
  // Step 6: card "Notifiche disattivate" / "Apri le impostazioni" (contratto §5) e interruttore delle funzioni AI (§8).
  const permesso = usePermessoNotifiche();
  const consenso = useConsensoAI(profilo.clientId);
  const [consensoInScrittura, setConsensoInScrittura] = useState(false);
  const onConsensoAI = useCallback(
    (acceso: boolean) => {
      setConsensoInScrittura(true);
      (acceso ? consenso.accetta() : consenso.revoca())
        .then((ok) => {
          if (!ok) setAvviso({ chiave: Date.now(), testo: TESTO_ERRORE_CONSENSO });
        })
        .finally(() => setConsensoInScrittura(false));
    },
    [consenso],
  );

  // "Revisioni ricevute": una lettura leggera dello stato all'apertura (una per montaggio, mai innescata dal
  // proprio risultato: l'effetto dipende solo dal cliente). Il valore in memoria si mostra subito.
  useEffect(() => {
    aggiornaStatoRevisioni(profilo.clientId);
  }, [profilo.clientId]);

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
      notifichePush={permesso.azione === 'attiva' ? { azione: 'attiva', onPress: permesso.attiva, inCorso: permesso.inRichiesta } : permesso.azione === 'impostazioni' ? { azione: 'impostazioni', onPress: permesso.apriImpostazioni } : null}
      consensoAI={consenso.valido === null ? null : { acceso: consenso.valido, onChange: onConsensoAI, disabilitato: consensoInScrittura }}
      onPromemoria={onPromemoria}
      onNutrizionista={onNutrizionista}
      onEmailSupporto={onEmailSupporto}
      onTelefonoSupporto={onTelefonoSupporto}
      onPrivacy={onPrivacy}
      onTermini={onTermini}
      onElimina={eliminazione.apri}
      onEsci={onEsci}
      onNotifiche={onNotifiche}
      onMenu={onMenu}
      onIndietro={onIndietro}
      sovrapposti={
        <>
          {sovrapposti}
          <PannelloEliminaAccount
            passo={eliminazione.passo}
            onIndietro={eliminazione.chiudi}
            onContinua={eliminazione.continua}
            onElimina={eliminazione.conferma}
            onCambioPassword={eliminazione.onCambioPassword}
            errore={eliminazione.erroreCampo}
            inCorso={eliminazione.inCorso}
          />
          {avviso ? <NotificaInBasso key={avviso.chiave} tipo="conferma" testo={avviso.testo} onScomparsa={nascondiAvviso} sopra={conBarra ? INGOMBRO_BARRA_NAVIGAZIONE : 0} /> : null}
          {eliminazione.notifica ? (
            // Con il pannello aperto la barra è coperta: la notifica sta in fondo, sopra le azioni del pannello, per 6 s.
            <NotificaInBasso
              key={eliminazione.notifica.chiave}
              tipo="errore"
              testo={eliminazione.notifica.testo}
              onRiprova={eliminazione.notifica.onRiprova}
              onScomparsa={eliminazione.nascondiNotifica}
              durataMs={DURATA_NOTIFICA_ELIMINAZIONE_MS}
              sopra={conBarra && eliminazione.passo === null ? INGOMBRO_BARRA_NAVIGAZIONE : 0}
            />
          ) : null}
        </>
      }
    />
  );
}
