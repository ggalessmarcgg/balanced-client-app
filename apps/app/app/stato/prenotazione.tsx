import { Redirect, useRouter } from 'expo-router';
import { useCallback } from 'react';

import { statoCorrente } from '@/servizi/statoCliente';
import { useAzioniStato } from '@/servizi/useAzioniStato';
import { usePrenotazione, type StatoPrenotazione } from '@/servizi/usePrenotazione';
import { PannelloSceltaOrario } from '@/ui/prenotazione/PannelloSceltaOrario';
import { NotificaInBasso } from '@/ui/schermate/NotificaInBasso';
import { SchermataPrenotazione } from '@/ui/schermate/SchermataPrenotazione';

/**
 * Stati C (consulenza da confermare) e D (orario passato senza conferma), step 12: scelta dell'orario dal pannello
 * (orari da get_nutritionist_available_slots_v2), sempre in due passaggi; la conferma con confirm_initial_appointment
 * parte solo da "Conferma la consulenza".
 */
export default function Rotta() {
  const stato = statoCorrente();
  if (!stato || !(stato.codice === 'C' || stato.codice === 'D')) return <Redirect href="/" />;
  return <Prenotazione stato={stato} />;
}

function Prenotazione({ stato }: { stato: StatoPrenotazione }) {
  const router = useRouter();
  const { onEmailSupporto, onTelefonoSupporto, sovrapposti } = useAzioniStato();
  const p = usePrenotazione(stato);
  const onMenu = useCallback(() => router.push('/menu'), [router]);
  // La card è barrata in D (orario passato o assente) finché non si sceglie un nuovo orario nel pannello; appena c'è un
  // orario in memoria (scelto con "Modifica" o "Scegli un nuovo orario") la schermata è "da confermare".
  return (
    <SchermataPrenotazione
      variante={p.variante}
      profilo={stato.profilo}
      slot={p.slot}
      confermando={p.confermando}
      onConferma={p.onConferma}
      onModifica={p.onModifica}
      onScegliNuovo={p.onScegliNuovo}
      onMenu={onMenu}
      sovrapposti={
        <>
          <PannelloSceltaOrario
            aperto={p.pannello.aperto}
            motivo={p.pannello.motivo}
            orari={p.orari}
            scheda={p.scheda}
            scelta={p.scelta}
            onScheda={p.onScheda}
            onOrario={p.onOrario}
            onConferma={p.onConfermaOrario}
            onAnnulla={p.onChiudiPannello}
            onRiprova={p.onRiprovaOrari}
            onEmailSupporto={onEmailSupporto}
            onTelefonoSupporto={onTelefonoSupporto}
          />
          {sovrapposti}
          {p.avviso ? <NotificaInBasso key={p.avviso.chiave} tipo="errore" testo={p.avviso.testo} onScomparsa={p.nascondiAvviso} onRiprova={p.onConferma} /> : null}
        </>
      }
    />
  );
}
