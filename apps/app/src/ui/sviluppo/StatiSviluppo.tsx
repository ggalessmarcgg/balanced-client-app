import { useState } from 'react';

import type { Visita } from '@/core/appuntamenti/appuntamenti';
import { TESTI_CONFERMA, type MotivoPannello } from '@/core/prenotazione/conferma';
import { alternaScelta, type OrarioDisponibile, type StatoOrari } from '@/core/prenotazione/orari';
import type { Profilo } from '@/core/stato/stato';
import { PannelloSceltaOrario } from '@/ui/prenotazione/PannelloSceltaOrario';
import { NotificaInBasso } from '@/ui/schermate/NotificaInBasso';
import { SchermataConsulenzaConfermata } from '@/ui/schermate/SchermataConsulenzaConfermata';
import { SchermataPrenotato } from '@/ui/schermate/SchermataPrenotato';
import { SchermataPrenotazione } from '@/ui/schermate/SchermataPrenotazione';

// Stati prima dell'abbonamento (step 12) con dati finti per i confronti con Figma (sezione "8 · Stati dell'account":
// 550:3636, 550:3694, 550:3754, 556:3756, 556:3897, 556:4038, 738:7520, 550:3890) e per i casi limite. Nessuna lettura,
// nessuna scrittura: il pannello è interattivo (schede e orari) ma "Conferma orario" non chiama nulla.

const nulla = () => {};
const ADESSO = new Date('2026-10-15T10:00:00.000Z'); // giovedì 15 ottobre 2026, 12:00 a Roma

export const PROFILO_PRENOTAZIONE: Profilo = {
  clientId: 'finto',
  nome: 'Giulia',
  nomeCompleto: 'Alessandro Rossi',
  genere: 'female',
  telefono: '333 1234567',
  nutrizionista: { id: 'finta', nome: 'Dott.ssa Ludovica Damiani', foto: null, specializzazione: 'Biologa nutrizionista', numeroAlbo: 'PLV_A4044' },
  account: { email: 'alessandro@email.it', giornateCondivise: 0, promemoria: { diario: true, weekend: true }, conStripe: false },
};
const SLOT = { data: '2026-10-22', ora: '18:30' };
const LINK = 'https://meet.google.com/abc-defg-hij';
const VISITA: Visita = { id: 'a1', tipo: 'prima', data: '2026-10-22', inizio: '18:30', fine: '19:10', durataMinuti: 40, linkVideochiamata: LINK, istanteInizio: new Date('2026-10-22T16:30:00.000Z'), istanteFine: new Date('2026-10-22T17:30:00.000Z') };
const NUTRIZIONISTA_CARD = { nome: 'Dott.ssa Ludovica Damiani', foto: null, iniziali: 'LD' };

// Griglia del componente Figma 555:422: lun 20.07 … ven 24.07 (mercoledì senza orari), ven 16:00 scelto; qualche orario nella seconda scheda.
const ORARI_FIGMA: OrarioDisponibile[] = [
  ...['09:00', '11:00'].map((time) => ({ date: '2026-07-20', time })),
  ...['11:00', '12:00'].map((time) => ({ date: '2026-07-21', time })),
  ...['15:00', '16:00', '17:00', '18:00'].map((time) => ({ date: '2026-07-23', time })),
  ...['15:00', '16:00', '17:00', '18:00'].map((time) => ({ date: '2026-07-24', time })),
  { date: '2026-07-27', time: '10:00' },
  { date: '2026-07-29', time: '09:00' },
  { date: '2026-07-31', time: '09:00' },
];
const SCELTA_FIGMA: OrarioDisponibile = { date: '2026-07-24', time: '16:00' };
// Caso limite senza disegno: tutte le ore dalle 8 alle 19 in ogni giorno della prima settimana, così il foglio tocca il
// massimo e la griglia scorre sotto le azioni fisse.
const ORE_PIENE = Array.from({ length: 12 }, (_, i) => `${String(8 + i).padStart(2, '0')}:00`);
const ORARI_MOLTI: OrarioDisponibile[] = ['2026-07-20', '2026-07-21', '2026-07-22', '2026-07-23', '2026-07-24'].flatMap((date) => ORE_PIENE.map((time) => ({ date, time })));

export type ScenarioStati =
  | 'daConfermare'
  | 'daConfermareCaricamento'
  | 'daConfermareErrore'
  | 'prima'
  | 'primaLinkInArrivo'
  | 'primaSenzaAppuntamento'
  | 'orarioPassato'
  | 'orarioAssente'
  | 'pannelloOrarioPassato'
  | 'pannelloSettimanaSuccessiva'
  | 'pannelloNonDisponibile'
  | 'pannelloModifica'
  | 'pannelloMoltiOrari'
  | 'pannelloNessunOrario'
  | 'pannelloCaricamento'
  | 'pannelloErrore'
  | 'confermata';

function PannelloFinto({ motivo, orari, scheda: schedaIniziale = 0, scelta: sceltaIniziale = SCELTA_FIGMA }: { motivo: MotivoPannello; orari: StatoOrari; scheda?: number; scelta?: OrarioDisponibile | null }) {
  const [scheda, setScheda] = useState(schedaIniziale);
  const [scelta, setScelta] = useState<OrarioDisponibile | null>(sceltaIniziale);
  return (
    <PannelloSceltaOrario aperto motivo={motivo} orari={orari} scheda={scheda} scelta={scelta} onScheda={setScheda} onOrario={(o) => setScelta((s) => alternaScelta(s, o))} onConferma={nulla} onAnnulla={nulla} onRiprova={nulla} onEmailSupporto={nulla} onTelefonoSupporto={nulla} />
  );
}

const PRONTI: StatoOrari = { tipo: 'pronto', orari: ORARI_FIGMA };

export function StatiSviluppo({ scenario }: { scenario: ScenarioStati }) {
  const C = (extra: Partial<Parameters<typeof SchermataPrenotazione>[0]> = {}) => <SchermataPrenotazione variante="daConfermare" profilo={PROFILO_PRENOTAZIONE} slot={SLOT} onConferma={nulla} onModifica={nulla} onMenu={nulla} {...extra} />;
  const D = (extra: Partial<Parameters<typeof SchermataPrenotazione>[0]> = {}) => <SchermataPrenotazione variante="orarioPassato" profilo={PROFILO_PRENOTAZIONE} slot={SLOT} onScegliNuovo={nulla} onMenu={nulla} {...extra} />;
  switch (scenario) {
    case 'daConfermare':
      return C();
    case 'daConfermareCaricamento':
      return C({ confermando: true });
    case 'daConfermareErrore':
      return C({ sovrapposti: <NotificaInBasso tipo="errore" testo={TESTI_CONFERMA.errore} onRiprova={nulla} /> });
    case 'prima':
      return <SchermataPrenotato profilo={PROFILO_PRENOTAZIONE} visita={VISITA} adesso={ADESSO} nutrizionista={NUTRIZIONISTA_CARD} onEntra={nulla} onGestisci={nulla} onNutrizionista={nulla} onMenu={nulla} />;
    case 'primaLinkInArrivo':
      return <SchermataPrenotato profilo={PROFILO_PRENOTAZIONE} visita={{ ...VISITA, linkVideochiamata: null }} adesso={ADESSO} nutrizionista={NUTRIZIONISTA_CARD} onGestisci={nulla} onNutrizionista={nulla} onMenu={nulla} />;
    case 'primaSenzaAppuntamento':
      return <SchermataPrenotato profilo={PROFILO_PRENOTAZIONE} visita={null} adesso={ADESSO} nutrizionista={NUTRIZIONISTA_CARD} onGestisci={nulla} onNutrizionista={nulla} onMenu={nulla} />;
    case 'orarioPassato':
      return D();
    case 'orarioAssente':
      return D({ slot: null });
    case 'pannelloOrarioPassato':
      return D({ sovrapposti: <PannelloFinto motivo="orarioPassato" orari={PRONTI} /> });
    case 'pannelloSettimanaSuccessiva':
      return D({ sovrapposti: <PannelloFinto motivo="orarioPassato" orari={PRONTI} scheda={1} scelta={null} /> });
    case 'pannelloNonDisponibile':
      return C({ sovrapposti: <PannelloFinto motivo="nonDisponibile" orari={PRONTI} /> });
    case 'pannelloModifica':
      return C({ sovrapposti: <PannelloFinto motivo="modifica" orari={PRONTI} /> });
    case 'pannelloMoltiOrari':
      return D({ sovrapposti: <PannelloFinto motivo="orarioPassato" orari={{ tipo: 'pronto', orari: ORARI_MOLTI }} scelta={{ date: '2026-07-22', time: '18:00' }} /> });
    case 'pannelloNessunOrario':
      return D({ sovrapposti: <PannelloFinto motivo="orarioPassato" orari={{ tipo: 'pronto', orari: [] }} scelta={null} /> });
    case 'pannelloCaricamento':
      return D({ sovrapposti: <PannelloFinto motivo="orarioPassato" orari={{ tipo: 'caricamento' }} scelta={null} /> });
    case 'pannelloErrore':
      return D({ sovrapposti: <PannelloFinto motivo="orarioPassato" orari={{ tipo: 'errore' }} scelta={null} /> });
    case 'confermata':
      return <SchermataConsulenzaConfermata onTornaAllaHome={nulla} />;
  }
}
