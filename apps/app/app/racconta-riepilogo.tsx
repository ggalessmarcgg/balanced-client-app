import { Redirect, useRouter } from 'expo-router';
import { useCallback } from 'react';

import { statoCorrente } from '@/servizi/statoCliente';
import { useRiepilogo } from '@/servizi/useRiepilogo';
import { SchermataRiepilogo } from '@/ui/schermate/SchermataRiepilogo';

/**
 * Riepilogo "Modifica e invia" di Racconta (Racconta · 8, Figma 747:7517): prende il posto di Racconta quando il
 * diario è compilato, così "Chiudi", la freccia e il gesto indietro tornano a Oggi con la bozza salvata e "Continua".
 */
export default function RottaRiepilogo() {
  const stato = statoCorrente();
  if (stato?.codice !== 'J') return <Redirect href="/" />;
  return <Riepilogo />;
}

function Riepilogo() {
  const router = useRouter();
  const esci = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/abbonato');
  }, [router]);
  const { locale, inviando, tutorial, notifica, azioni } = useRiepilogo(esci);
  // Senza un diario di oggi in memoria (memoria svuotata all'uscita) si torna a Oggi. Dopo "Invia" la riga diventa
  // condivisa e la schermata resta com'è il tempo di tornare indietro.
  if (!locale) return <Redirect href="/abbonato" />;
  return (
    <SchermataRiepilogo
      diario={locale.diario}
      inviando={inviando}
      tutorial={tutorial}
      onAggiorna={azioni.aggiorna}
      onCondividi={azioni.condividi}
      onChiudi={azioni.chiudi}
      onHoCapito={azioni.hoCapito}
      notifica={
        notifica
          ? {
              chiave: notifica.testo,
              tipo: notifica.tipo,
              testo: notifica.testo,
              onRiprova: notifica.tipo === 'errore' && notifica.riprova ? azioni.condividi : undefined,
              onScomparsa: notifica.tipo === 'conferma' ? azioni.nascondiNotifica : undefined,
            }
          : undefined
      }
    />
  );
}
