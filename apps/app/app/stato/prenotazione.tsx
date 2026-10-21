import { Redirect, useRouter } from 'expo-router';
import { useCallback } from 'react';

import { statoCorrente } from '@/servizi/statoCliente';
import { useAzioniStato } from '@/servizi/useAzioniStato';
import { usePrenotazione, type StatoPrenotazione } from '@/servizi/usePrenotazione';
import { PannelloSceltaOrario } from '@/ui/prenotazione/PannelloSceltaOrario';
import { NotificaInBasso } from '@/ui/schermate/NotificaInBasso';
import { SchermataPrenotazione } from '@/ui/schermate/SchermataPrenotazione';

/**
 * Stati C (consulenza da confermare) e D (orario passato senza conferma), step 12: conferma con
 * confirm_initial_appointment, cambio dell'orario dal pannello di scelta (orari da get_nutritionist_available_slots_v2).
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
  // In D (orario passato o assente) la card è barrata; in C si mostra l'orario del lead o quello scelto con "Modifica".
  const variante = stato.codice === 'C' ? 'daConfermare' : 'orarioPassato';
  return (
    <SchermataPrenotazione
      variante={variante}
      profilo={stato.profilo}
      slot={p.slot}
      confermando={p.confermando && !p.pannello.aperto}
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
            confermando={p.confermando}
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
