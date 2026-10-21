import type { Visita } from '@/core/appuntamenti/appuntamenti';
import { appuntamenti } from '@/core/appuntamenti/appuntamenti';
import { profiloNutrizionista, type Ferie, type ProfiloNutrizionista } from '@/core/nutrizionista/profilo';
import { Dialogo } from '@/ui/Dialogo';
import { SchermataAppuntamenti } from '@/ui/schermate/SchermataAppuntamenti';
import { SchermataMenu } from '@/ui/schermate/SchermataMenu';
import { SchermataNutrizionista } from '@/ui/schermate/SchermataNutrizionista';

// Schermate del menu con dati finti per i confronti con Figma (sezione "6 · Menu": 508:2614, 514:2530, 515:2957,
// 596:5846, 517:2616, 517:2680, 517:2741) e per i casi limite. Nessuna lettura, nessuna scrittura.

const nulla = () => {};
const ADESSO = new Date('2026-10-15T10:00:00.000Z'); // giovedì 15 ottobre 2026, 12:00 a Roma

const PROFILO: ProfiloNutrizionista = profiloNutrizionista({
  id: 'n',
  title: 'Dott.ssa',
  full_name: 'Ludovica Damiani',
  expertise: 'Biologa Nutrizionista',
  registration_number: 'AA_088614',
  app_photo_url: null,
  app_square_photo_url: null,
  who_are_you: 'Mi occupo di educazione alimentare e di percorsi per costruire abitudini sostenibili nel tempo. Credo in un approccio senza divieti, in cui il cibo torna a essere un piacere e non una fonte di ansia.',
  competences: ['Ricomposizione corporea', 'Alimentazione sportiva', 'Fame emotiva', 'Gravidanza'],
  certifications: ['Laurea magistrale in Biologia della nutrizione', 'Master in nutrizione sportiva', 'Corso di alimentazione intuitiva'],
  working_hours: { Lun: '09:00 - 18:00', Mar: '09:00 - 18:00', Mer: '14:00 - 20:00', Gio: '09:00 - 18:00', Ven: '09:00 - 13:00' },
  phone: '+39 333 123 4567',
});
const FERIE: Ferie = {
  dal: '2026-10-12',
  al: '2026-10-20',
  etichetta: 'Dott.ssa Ludovica Damiani è assente dal 12.10 al 20.10.',
  sostituta: { nome: 'Dott.ssa Veronica Gritti', cognomeConTitolo: 'Dott.ssa Gritti', foto: null, iniziali: 'VG', telefono: { formattato: '+39 347 765 4321', cifre: '393477654321' } },
};
const NUTRIZIONISTA = { nome: 'Dott.ssa Ludovica Damiani', foto: null, iniziali: 'LD' };

const PASSATI = [
  { id: 'c2', scheduled_date: '2026-09-24', start_time: '09:00:00', end_time: '09:20:00', status: 'completed', is_initial: false, meeting_url: null },
  { id: 'c3', scheduled_date: '2026-07-30', start_time: '09:00:00', end_time: '09:20:00', status: 'completed', is_initial: false, meeting_url: null },
];
const PRIMA_PASSATA = { id: 'p', appointment_date: '2026-07-02', start_time: '10:00:00', end_time: '11:00:00', status: 'completed', meeting_url: null };
const LINK = 'https://meet.google.com/abc-defg-hij';

function dati(prossima: Visita | null, passatiPresenti = true) {
  const riga = {
    id: 'c',
    appointments: [PRIMA_PASSATA, ...(prossima?.tipo === 'prima' ? [{ id: prossima.id, appointment_date: prossima.data, start_time: `${prossima.inizio}:00`, end_time: `${prossima.fine}:00`, status: 'scheduled', meeting_url: prossima.linkVideochiamata }] : [])],
    control_visits: [...PASSATI, ...(prossima?.tipo === 'controllo' ? [{ id: prossima.id, scheduled_date: prossima.data, start_time: `${prossima.inizio}:00`, end_time: `${prossima.fine}:00`, status: 'scheduled', is_initial: false, meeting_url: prossima.linkVideochiamata }] : [])],
  };
  const a = appuntamenti(passatiPresenti ? riga : { ...riga, appointments: [], control_visits: riga.control_visits.filter((c) => c.status === 'scheduled') }, ADESSO);
  return { tipo: 'pronto' as const, prossimo: a.prossimo, passati: a.passati, adesso: ADESSO };
}
const controllo = (data: string, link: string | null = LINK): Visita => ({ id: 'c1', tipo: 'controllo', data, inizio: '18:30', fine: '19:00', durataMinuti: 30, linkVideochiamata: link, istanteInizio: ADESSO, istanteFine: ADESSO });

export type ScenarioMenu =
  | 'menu'
  | 'menuUscita'
  | 'nutrizionistaAbbonato'
  | 'nutrizionistaPrenotato'
  | 'nutrizionistaFerie'
  | 'nutrizionistaFerieSenzaSostituta'
  | 'nutrizionistaMinima'
  | 'nutrizionistaCaricamento'
  | 'nutrizionistaErrore'
  | 'appuntamenti'
  | 'appuntamentiOggi'
  | 'appuntamentiNessuno'
  | 'appuntamentiLinkInArrivo'
  | 'appuntamentiSenzaPassati'
  | 'appuntamentiCaricamento';

export function MenuSviluppo({ scenario }: { scenario: ScenarioMenu }) {
  switch (scenario) {
    case 'menu':
      return <SchermataMenu voci={['nutrizionista', 'appuntamenti', 'pesoEMisure', 'contenuti']} versione="1.0.0" onVoce={nulla} onChiudi={nulla} onEsci={nulla} />;
    case 'menuUscita':
      return (
        <SchermataMenu
          voci={['nutrizionista', 'appuntamenti']}
          versione="1.0.0"
          onVoce={nulla}
          onChiudi={nulla}
          onEsci={nulla}
          sovrapposti={<Dialogo aperto titolo="Hai modifiche non ancora salvate" testo="Se esci ora andranno perse." annulla={{ etichetta: 'Annulla', onPress: nulla }} conferma={{ etichetta: 'Esci comunque', onPress: nulla }} />}
        />
      );
    case 'nutrizionistaAbbonato':
      return <SchermataNutrizionista fase={{ tipo: 'pronto', profilo: PROFILO, ferie: null }} contatto="visibile" onIndietro={nulla} onScrivi={nulla} />;
    case 'nutrizionistaPrenotato':
      return <SchermataNutrizionista fase={{ tipo: 'pronto', profilo: PROFILO, ferie: null }} contatto="oscurato" onIndietro={nulla} />;
    case 'nutrizionistaFerie':
      return <SchermataNutrizionista fase={{ tipo: 'pronto', profilo: PROFILO, ferie: FERIE }} contatto="visibile" onIndietro={nulla} onScrivi={nulla} />;
    case 'nutrizionistaFerieSenzaSostituta':
      return <SchermataNutrizionista fase={{ tipo: 'pronto', profilo: PROFILO, ferie: { ...FERIE, sostituta: null } }} contatto="visibile" onIndietro={nulla} />;
    case 'nutrizionistaMinima':
      return <SchermataNutrizionista fase={{ tipo: 'pronto', profilo: { ...PROFILO, specializzazione: null, numeroAlbo: null, chiSono: null, competenze: [], certificazioni: [], orari: [], telefono: null }, ferie: null }} contatto="visibile" onIndietro={nulla} />;
    case 'nutrizionistaCaricamento':
      return <SchermataNutrizionista fase={{ tipo: 'caricamento' }} contatto="visibile" onIndietro={nulla} />;
    case 'nutrizionistaErrore':
      return <SchermataNutrizionista fase={{ tipo: 'rete', onRiprova: nulla }} contatto="visibile" onIndietro={nulla} />;
    case 'appuntamenti':
      return <SchermataAppuntamenti fase={dati(controllo('2026-10-22'))} nutrizionista={NUTRIZIONISTA} onIndietro={nulla} onEntra={nulla} onGestisci={nulla} />;
    case 'appuntamentiOggi':
      return <SchermataAppuntamenti fase={dati({ ...controllo('2026-10-15'), id: 'p1', tipo: 'prima', fine: '19:30', durataMinuti: 60 })} nutrizionista={NUTRIZIONISTA} onIndietro={nulla} onEntra={nulla} onGestisci={nulla} />;
    case 'appuntamentiNessuno':
      return <SchermataAppuntamenti fase={dati(null)} nutrizionista={NUTRIZIONISTA} onIndietro={nulla} onGestisci={nulla} />;
    case 'appuntamentiLinkInArrivo':
      return <SchermataAppuntamenti fase={dati(controllo('2026-10-22', null))} nutrizionista={NUTRIZIONISTA} onIndietro={nulla} onGestisci={nulla} />;
    case 'appuntamentiSenzaPassati':
      return <SchermataAppuntamenti fase={dati(controllo('2026-10-22'), false)} nutrizionista={NUTRIZIONISTA} onIndietro={nulla} onEntra={nulla} onGestisci={nulla} />;
    case 'appuntamentiCaricamento':
      return <SchermataAppuntamenti fase={{ tipo: 'caricamento' }} nutrizionista={NUTRIZIONISTA} onIndietro={nulla} />;
  }
}
