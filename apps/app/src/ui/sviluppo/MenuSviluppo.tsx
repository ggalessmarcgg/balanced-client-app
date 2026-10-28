import type { Visita } from '@/core/appuntamenti/appuntamenti';
import { appuntamenti } from '@/core/appuntamenti/appuntamenti';
import { elencoContenuti, type RigaContenuto } from '@/core/contenuti/contenuti';
import { datiMisure } from '@/core/misure/misure';
import { profiloNutrizionista, type Ferie, type ProfiloNutrizionista } from '@/core/nutrizionista/profilo';
import { Dialogo } from '@/ui/Dialogo';
import { SchermataAppuntamenti } from '@/ui/schermate/SchermataAppuntamenti';
import { SchermataContenuti } from '@/ui/schermate/SchermataContenuti';
import { SchermataContenuto } from '@/ui/schermate/SchermataContenuto';
import { SchermataMenu } from '@/ui/schermate/SchermataMenu';
import { SchermataNutrizionista } from '@/ui/schermate/SchermataNutrizionista';
import { SchermataPesoMisure } from '@/ui/schermate/SchermataPesoMisure';

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
  competences: ['overweight-obesity', 'sports-nutrition', 'nutrition-education-counseling', 'pregnancy-breastfeeding', 'insulin-resistance-metabolic'],
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
const controllo = (data: string, link: string | null = LINK): Visita => ({ id: 'c1', tipo: 'controllo', data, inizio: '18:30', fine: '18:50', durataMinuti: 20, linkVideochiamata: link, istanteInizio: ADESSO, istanteFine: ADESSO });

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
      return <SchermataMenu voci={['nutrizionista', 'appuntamenti', 'pesoEMisure', 'ricette', 'contenuti']} versione="1.0.0" onVoce={nulla} onChiudi={nulla} onEsci={nulla} />;
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
      return <SchermataAppuntamenti fase={dati({ ...controllo('2026-10-15'), id: 'p1', tipo: 'prima', fine: '19:10', durataMinuti: 40 })} nutrizionista={NUTRIZIONISTA} onIndietro={nulla} onEntra={nulla} onGestisci={nulla} />;
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

// ---- Lotto 2: Peso e misure, Contenuti -------------------------------------------------------------------------

const MISURE_COMPLETE = datiMisure({
  height: 165,
  weight_logs: [
    { log_date: '2026-10-02', weight: 69.2 },
    { log_date: '2026-09-04', weight: 69.9 },
    { log_date: '2026-08-07', weight: 70.6 },
    { log_date: '2026-07-10', weight: 71.0 },
    { log_date: '2026-06-05', weight: 71.8 },
    { log_date: '2026-05-03', weight: 72.4 },
  ],
  measurements: [
    { measurement_date: '2026-10-02', waist: 78, hips: 99, abdomen: 85, arm: 29, wrist: 16, thigh: 56 },
    { measurement_date: '2026-05-03', waist: 82, hips: 102, abdomen: 90, arm: 30, wrist: 16, thigh: 58 },
  ],
});

const CONTENUTI_FINTI: RigaContenuto[] = [
  ['Capire perchè il peso oscilla', 'Imparando la nutrizione'],
  ['Comporre un piatto in autonomia', 'Imparando la nutrizione'],
  ['Esiste davvero una dieta perfetta?', 'Imparando la nutrizione'],
  ["Guida pratica all'organizzazione", 'Imparando la nutrizione'],
  ['La qualità degli alimenti', 'Imparando la nutrizione'],
  ["Come l'idratazione impatta sul corpo\n", 'Integrando nuove abitudini'],
  ['Strategie pratiche per bere di più', 'Integrando nuove abitudini'],
  ["Il movimento oltre l'allenamento", 'Integrando nuove abitudini'],
  ["I benefici di un'attività fisica", 'Integrando nuove abitudini'],
  ["Difficoltà nel creare un'abitudine", 'Integrando nuove abitudini'],
  ['Come costruire nuove abitudini', 'Integrando nuove abitudini'],
  ['Ritmi quotidiani e sonno', 'Integrando nuove abitudini'],
  ["Regolazione dell'appetito", 'Integrando nuove abitudini'],
  ['Inserisci nuovi alimenti', 'Scelte più consapevoli'],
  ["Sapere gestire l'eccezione", 'Scelte più consapevoli'],
  ['Sto effettivamente cambiando?', 'Scelte più consapevoli'],
].map(([step_name, category], i) => ({ id: `c${i + 1}`, order_index: i + 1, step_name: step_name as string, category: category as string, reading_time: 3, content_body: '' }));

const CORPO_FINTO = `Siamo abituati a pensare che il successo del nostro percorso dipenda esclusivamente da quel numero che appare sulla bilancia. Ma se ci pesassimo ogni mattina, noteremmo variazioni di 500g, 1kg o persino 2kg da un giorno all'altro. È possibile aver accumulato un chilo di grasso in 24 ore? La risposta è ovviamente no. La realtà scientifica è molto diversa.

**Perché il nostro peso oscilla?**

Il peso corporeo è un dato estremamente dinamico. È importante capire che è fisicamente impossibile aver accumulato grasso reale in così poco tempo. Ciò che stiamo vedendo è la fluttuazione dei liquidi e del contenuto intestinale.

Ecco i fattori che influenzano maggiormente queste oscillazioni:

**Riserve di glicogeno e "ritenzione idrica"**

Se mangiamo un po' più di carboidrati, il corpo li stocca nei muscoli sotto forma di una molecola chiamata glicogeno e ogni grammo di glicogeno lega a sé circa 3-4 grammi d'acqua! Quindi più carboidrati non significano più grasso, ma più "riserve idriche" muscolari, che vengono utilizzate e smaltite nel giro di pochi giorni.

**Allenamento**

Se abbiamo ripreso a muoverci o abbiamo fatto una sessione di allenamento intensa, i nostri muscoli richiamano acqua per recuperare lo sforzo fatto. È un segnale positivo e non un aumento di grasso.`;

export type ScenarioLotto2 = 'misureGrafici' | 'misureTabelle' | 'misureSenzaAltezza' | 'misureUnaMisurazione' | 'misureSenzaDati' | 'misureCaricamento' | 'contenuti' | 'contenuto' | 'contenutiCaricamento';

export function Lotto2Sviluppo({ scenario }: { scenario: ScenarioLotto2 }) {
  switch (scenario) {
    case 'misureGrafici':
      return <SchermataPesoMisure fase={{ tipo: 'pronto', dati: MISURE_COMPLETE }} onIndietro={nulla} />;
    case 'misureTabelle':
      return <SchermataPesoMisure fase={{ tipo: 'pronto', dati: MISURE_COMPLETE }} onIndietro={nulla} vistaIniziale="tabella" />;
    case 'misureSenzaAltezza':
      return <SchermataPesoMisure fase={{ tipo: 'pronto', dati: { ...MISURE_COMPLETE, altezzaCm: null, bmi: null } }} onIndietro={nulla} />;
    case 'misureUnaMisurazione':
      return <SchermataPesoMisure fase={{ tipo: 'pronto', dati: { ...MISURE_COMPLETE, pesi: MISURE_COMPLETE.pesi.slice(-1), misurazioni: MISURE_COMPLETE.misurazioni.slice(0, 1) } }} onIndietro={nulla} />;
    case 'misureSenzaDati':
      return <SchermataPesoMisure fase={{ tipo: 'pronto', dati: datiMisure({ height: 165, weight_logs: [], measurements: [] }) }} onIndietro={nulla} />;
    case 'misureCaricamento':
      return <SchermataPesoMisure fase={{ tipo: 'caricamento' }} onIndietro={nulla} />;
    case 'contenuti':
      return <SchermataContenuti fase={{ tipo: 'pronto', contenuti: elencoContenuti(CONTENUTI_FINTI) }} onIndietro={nulla} onApri={nulla} />;
    case 'contenuto':
      return <SchermataContenuto contenuto={{ id: 'c1', ordine: 1, titolo: 'Oltre il numero: il peso e la veridicità della bilancia', categoria: 'Imparando la nutrizione', minutiLettura: 3 }} corpo={CORPO_FINTO} onIndietro={nulla} />;
    case 'contenutiCaricamento':
      return <SchermataContenuti fase={{ tipo: 'caricamento' }} onIndietro={nulla} onApri={nulla} />;
  }
}
