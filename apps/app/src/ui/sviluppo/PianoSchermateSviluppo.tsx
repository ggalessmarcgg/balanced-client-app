import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';

import { componiPiano } from '@/core/piano/composizione';
import type { GiornoServer, IndicazioneServer, PastoServer, PianoServer, RigaServer, SezioneServer } from '@/core/piano/tipi';
import type { StatoPannello } from '@/core/sostituzione/pannello';
import { usePiano } from '@/servizi/usePiano';
import type { PassoTutorialPiano } from '@/servizi/sostituzione';
import { useRicette } from '@/servizi/useRicette';
import { useSostituzione, useTutorialPiano, type AzioniSostituzione } from '@/servizi/useSostituzione';
import { SchermataIndicazioni } from '@/ui/schermate/SchermataIndicazioni';
import { SchermataPiano, type FasePiano, type SostituzionePiano } from '@/ui/schermate/SchermataPiano';
import { useClientIdSviluppo } from '@/ui/sviluppo/PianoSviluppo';
import { contestoDi, useRicetteSviluppo, type VarianteRicetteSviluppo } from '@/ui/sviluppo/RicetteSviluppo';

// Piani sintetici per la pagina degli stati (step 8, lotto 2): i testi del fisso e del variabile sono quelli dei
// disegni Figma 527:2947 e 527:3070, le indicazioni quelle di 775:7878.
const nulla = () => {};
const riga = (position: number, name: string, practical_quantity: string | null = null, parte: Partial<RigaServer> = {}): RigaServer => ({ id: `${position}-${name}`, position, name, quantity_type: 'libero', quantity: null, measure_type: null, practical_quantity, ...parte });
const aPiacere = (position: number, name: string): RigaServer => riga(position, name, null, { quantity_type: 'a_piacere' });
const sezione = (position: number, category: SezioneServer['category'], rows: RigaServer[]): SezioneServer => ({ position, category, rows });
const pasto = (position: number, name: string, sections: SezioneServer[]): PastoServer => ({ id: `${position}-${name}`, position, name, sections });
const GIORNI = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
const AGGIORNATO = '2026-10-12T10:00:00+00:00';

const INDICAZIONI: IndicazioneServer[] = [
  { position: 1, title: 'Acqua e caffè', body: 'Bevi almeno un litro e mezzo d’acqua al giorno, distribuendola tra i pasti: tieni una bottiglia sulla scrivania e riempila due volte. Il caffè va bene fino a tre al giorno, senza zucchero o con poco; l’ultimo entro metà pomeriggio, per non disturbare il sonno.' },
  { position: 2, title: 'Il pasto libero', body: 'Una volta a settimana puoi concederti un pasto libero, senza pesare nulla. Goditelo con calma, seduta a tavola, e riprendi il piano dal pasto successivo, senza compensare saltando il pasto dopo.' },
  { position: 3, title: 'Il pasto da portare via', body: 'Nei giorni in ufficio prepara il pranzo la sera prima: una porzione di cereali, una di proteine e verdure abbondanti in un unico contenitore. Condisci con l’olio al momento di mangiare, così le verdure restano croccanti.' },
];

function pastiFigma(nomi: [string, string, string, string, string] = ['Colazione', 'Spuntino', 'Pranzo', 'Spuntino', 'Cena']): PastoServer[] {
  return [
    pasto(1, nomi[0], [sezione(1, 'proteine', [riga(1, 'Yogurt greco bianco', '150 g')]), sezione(2, 'carboidrati', [riga(1, "Fiocchi d'avena", '3 cucchiai')]), sezione(3, 'fibre', [aPiacere(1, 'Frutti di bosco')])]),
    pasto(2, nomi[1], [sezione(1, 'zuccheri', [riga(1, 'Mela', '1 frutto')])]),
    pasto(3, nomi[2], [sezione(1, 'carboidrati', [riga(1, 'Riso basmati', '70 g')]), sezione(2, 'proteine', [riga(1, 'Petto di pollo', '120 g')]), sezione(3, 'fibre', [aPiacere(1, 'Zucchine')]), sezione(4, 'grassi', [riga(1, 'Olio EVO', '1 cucchiaio')])]),
    pasto(4, nomi[3], [sezione(1, 'zuccheri', [riga(1, 'Mela', '1 frutto')])]),
    pasto(5, nomi[4], [sezione(1, 'proteine', [riga(1, 'Salmone', '150 g')]), sezione(2, 'carboidrati', [riga(1, 'Patate', '200 g')]), sezione(3, 'fibre', [aPiacere(1, 'Insalata mista')]), sezione(4, 'grassi', [riga(1, 'Olio EVO', '1 cucchiaio')])]),
  ];
}

function fisso(pasti: () => PastoServer[], opzioni: { giornoVuoto?: number; indicazioni?: IndicazioneServer[] } = {}): PianoServer {
  const days: GiornoServer[] = GIORNI.map((name, i) => ({ day_index: i + 1, name, meals: opzioni.giornoVuoto === i + 1 ? [pasto(1, 'Colazione', [sezione(1, 'carboidrati', [])])] : pasti() }));
  return { id: 'fisso-sviluppo', plan_type: 'fisso', sent_at: AGGIORNATO, updated_at: AGGIORNATO, days, indications: opzioni.indicazioni ?? INDICAZIONI };
}

function variabile(nomi: [string, string, string, string] = ['Colazione', 'Pranzo', 'Cena', 'Spuntini']): PianoServer {
  const meals = [
    pasto(1, nomi[0], [sezione(1, 'carboidrati', [riga(1, 'Pane integrale', '2 fette'), riga(2, "Fiocchi d'avena", '40 g')]), sezione(2, 'proteine', [riga(1, 'Yogurt greco', '150 g')]), sezione(3, 'zuccheri', [riga(1, 'Miele', '1 cucchiaino')])]),
    pasto(2, nomi[1], [
      sezione(1, 'carboidrati', [riga(1, 'Pasta o riso integrale', '70 g'), riga(2, 'Pane integrale', '2 fette'), riga(3, 'Gnocchi di patate', '150 g')]),
      sezione(2, 'proteine', [riga(1, 'Legumi', '120 g'), riga(2, 'Carne bianca', '120 g'), riga(3, 'Pesce', '150 g'), riga(4, 'Uova', null, { quantity_type: 'precisa', quantity: 2 })]),
      sezione(3, 'grassi', [riga(1, "Olio extravergine d'oliva", '1 cucchiaio')]),
      sezione(4, 'fibre', [aPiacere(1, 'Verdure di stagione')]),
      sezione(5, 'zuccheri', [riga(1, 'Frutta fresca', '1 frutto')]),
    ]),
    pasto(3, nomi[2], [sezione(1, 'proteine', [riga(1, 'Pesce', '150 g'), riga(2, 'Uova', null, { quantity_type: 'precisa', quantity: 2 })]), sezione(2, 'carboidrati', [riga(1, 'Pane integrale', '50 g')]), sezione(3, 'grassi', [riga(1, "Olio extravergine d'oliva", '1 cucchiaio')]), sezione(4, 'fibre', [aPiacere(1, 'Verdure di stagione')])]),
    pasto(4, nomi[3], [sezione(1, 'zuccheri', [riga(1, 'Frutta fresca', '1 frutto')]), sezione(2, 'proteine', [riga(1, 'Yogurt bianco', '125 g')])]),
  ];
  return { id: 'variabile-sviluppo', plan_type: 'variabile', sent_at: AGGIORNATO, updated_at: AGGIORNATO, days: [{ day_index: 1, name: 'Giornata tipo', meals }], indications: INDICAZIONI };
}

const NOMI_LUNGHI_FISSO: [string, string, string, string, string] = ['Colazione (salata o dolce semplice, più sostanziosa nei giorni di allenamento)', 'Spuntino di metà mattina', 'Pranzo (mensa nei giorni in ufficio)', 'Spuntino delle 17 (pre-allenamento nei giorni di palestra)', 'Cena'];
const NOMI_LUNGHI_VARIABILE: [string, string, string, string] = ['colazione (salata o dolce, a scelta)', 'Pranzo (mensa nei giorni in ufficio)', "Cena (leggera nei giorni di riposo)", "Spuntino pomeridiano prima dell'allenamento"];

export type VariantePianoSviluppo = 'fisso' | 'fisso-nomi-lunghi' | 'fisso-giorno-vuoto' | 'senza-indicazioni' | 'variabile' | 'variabile-nomi-lunghi' | 'in-elaborazione' | 'caricamento' | 'errore' | 'senza-rete' | 'senza-rete-copia' | 'indicazioni' | 'tutorial' | 'tutorial-2';

/** Stati del pannello "Sostituisci" con dati sintetici (testi dei disegni Figma 531:3086 … 789:7865), sul fisso con "G" selezionato. */
export type VarianteSostituzioneSviluppo = 'avvio' | 'ricerca' | 'tre' | 'una' | 'in-casa' | 'nessuna' | 'non-riconosciuto' | 'errore' | 'errore-sessione';
const RIGA_FIGMA = { id: 'riso', testo: 'Riso basmati · 70 g' };
const ALTERNATIVE_FIGMA = [
  { nome: 'Farro', quantita: 'Farro · 70 g', aPiacere: false },
  { nome: 'Pane integrale', quantita: 'Pane integrale · 105 g · 3,5 fette', aPiacere: false },
  { nome: 'Patate', quantita: 'Patate · 305 g', aPiacere: false },
];
const SPIEGAZIONE_FIGMA = 'Farro, pane integrale e patate danno la stessa energia del riso e stanno bene con pollo e zucchine.';
const ERRORE_RETE = { esito: 'rete' as const, codice: 'rete', messaggio: 'Nessuna connessione', richiestaId: null, httpStatus: null };
const ERRORE_SESSIONE = { esito: 'sessione' as const, codice: 'token_non_valido', messaggio: 'Token non valido', richiestaId: 'app-x', httpStatus: 401 };
const STATI_SOSTITUZIONE: Record<VarianteSostituzioneSviluppo, StatoPannello> = {
  avvio: { tipo: 'avvio', riga: RIGA_FIGMA, inCasa: '' },
  ricerca: { tipo: 'ricerca', richiesta: 1, riga: RIGA_FIGMA, inCasa: '' },
  tre: { tipo: 'alternative', riga: RIGA_FIGMA, inCasa: '', alternative: ALTERNATIVE_FIGMA, spiegazione: { primo: SPIEGAZIONE_FIGMA, secondo: null } },
  una: { tipo: 'alternative', riga: RIGA_FIGMA, inCasa: '', alternative: ALTERNATIVE_FIGMA.slice(0, 1), spiegazione: { primo: 'Il farro dà la stessa energia del riso e sta bene con pollo e zucchine.', secondo: null } },
  'in-casa': { tipo: 'alternative', riga: RIGA_FIGMA, inCasa: 'pollo, ceci', alternative: ALTERNATIVE_FIGMA, spiegazione: { primo: SPIEGAZIONE_FIGMA, secondo: 'Il pollo è una fonte di proteine, non di carboidrati.' } },
  nessuna: { tipo: 'nessunaAlternativa', riga: RIGA_FIGMA, inCasa: '' },
  'non-riconosciuto': { tipo: 'nonRiconosciuto', riga: { id: 'gnocchi', testo: 'Gnocchi alla romana · 200 g' }, inCasa: '' },
  errore: { tipo: 'errore', riga: RIGA_FIGMA, inCasa: '', errore: ERRORE_RETE, riprovabile: true },
  'errore-sessione': { tipo: 'errore', riga: RIGA_FIGMA, inCasa: '', errore: ERRORE_SESSIONE, riprovabile: false },
};

const PIANI: Record<string, () => PianoServer> = {
  fisso: () => fisso(() => pastiFigma()),
  'fisso-nomi-lunghi': () => fisso(() => pastiFigma(NOMI_LUNGHI_FISSO)),
  'fisso-giorno-vuoto': () => fisso(() => pastiFigma(), { giornoVuoto: 3 }),
  'senza-indicazioni': () => fisso(() => pastiFigma(), { indicazioni: [] }),
  variabile: () => variabile(),
  'variabile-nomi-lunghi': () => variabile(NOMI_LUNGHI_VARIABILE),
  'senza-rete-copia': () => fisso(() => pastiFigma()),
};
/** Pagina iniziale come nei disegni: "G" nel fisso, "Pranzo" nel variabile. */
const INDICE_FIGMA: Partial<Record<VariantePianoSviluppo, number>> = { fisso: 3, 'senza-indicazioni': 3, 'senza-rete-copia': 3, tutorial: 3, 'tutorial-2': 3, variabile: 1 };

export function PianoSchermataSviluppo({ variante }: { variante: VariantePianoSviluppo }) {
  const router = useRouter();
  const onIndicazioni = useCallback(() => router.push({ pathname: '/sviluppo/stati', params: { stato: 'piano-1.1-indicazioni' } }), [router]);
  const piano = useMemo(() => {
    const costruisci = PIANI[variante === 'tutorial' || variante === 'tutorial-2' ? 'fisso' : variante];
    return costruisci ? componiPiano(costruisci()) : null;
  }, [variante]);
  // Tutorial a due fumetti: "Avanti" porta dal passo 1 al 2, "Ho capito" chiude.
  const [passoTutorial, setPassoTutorial] = useState<PassoTutorialPiano | null>(variante === 'tutorial' ? 'sostituzione' : variante === 'tutorial-2' ? 'ricetta' : null);
  const sostituzione = useSostituzioneSviluppo();
  const ricette = useRicetteSviluppo();
  if (variante === 'indicazioni') return <SchermataIndicazioni indicazioni={componiPiano(fisso(() => pastiFigma()))?.indicazioni ?? []} onIndietro={() => router.back()} />;
  const fase: FasePiano =
    variante === 'caricamento' ? { tipo: 'caricamento' } : variante === 'errore' ? { tipo: 'errore', onRiprova: nulla } : variante === 'senza-rete' ? { tipo: 'rete', onRiprova: nulla } : variante === 'in-elaborazione' ? { tipo: 'pronto', piano: null, daCache: false } : { tipo: 'pronto', piano, daCache: variante === 'senza-rete-copia' };
  return (
    <SchermataPiano
      fase={fase}
      indiceIniziale={INDICE_FIGMA[variante]}
      sostituzione={sostituzione}
      ricette={ricette}
      tutorial={{ passo: passoTutorial, onAvanti: () => setPassoTutorial('ricetta'), onHoCapito: () => setPassoTutorial(null) }}
      onIndicazioni={onIndicazioni}
      onNavigazione={nulla}
      onMenu={nulla}
      onNotifiche={nulla}
    />
  );
}

/** Pannello "Sostituisci" di sviluppo: lo stato richiesto con dati sintetici; si chiude e si riapre (dall'avvio) toccando una riga, senza server. */
function useSostituzioneSviluppo(iniziale: VarianteSostituzioneSviluppo | null = null): SostituzionePiano {
  const [stato, setStato] = useState<StatoPannello>(() => (iniziale ? STATI_SOSTITUZIONE[iniziale] : { tipo: 'chiuso' }));
  const azioni = useMemo<AzioniSostituzione>(
    () => ({
      apri: (riga) => setStato({ tipo: 'avvio', riga, inCasa: '' }),
      chiudi: () => setStato({ tipo: 'chiuso' }),
      scrivi: (testo) => setStato((s) => (s.tipo === 'avvio' ? { ...s, inCasa: testo } : s)),
      trova: () => setStato((s) => (s.tipo === 'avvio' ? { tipo: 'ricerca', richiesta: 1, riga: s.riga, inCasa: s.inCasa } : s)),
      riprova: () => setStato((s) => (s.tipo === 'errore' ? { tipo: 'ricerca', richiesta: 1, riga: s.riga, inCasa: s.inCasa } : s)),
    }),
    [],
  );
  return { stato, azioni, onNutrizionista: azioni.chiudi };
}

/** Piano · 4 … 4.5 (step 9): il fisso con "G" selezionato e il pannello nello stato richiesto. */
export function SostituzioneSchermataSviluppo({ variante }: { variante: VarianteSostituzioneSviluppo }) {
  const piano = useMemo(() => componiPiano(fisso(() => pastiFigma())), []);
  const sostituzione = useSostituzioneSviluppo(variante);
  const ricette = useRicetteSviluppo();
  return <SchermataPiano fase={{ tipo: 'pronto', piano, daCache: false }} indiceIniziale={INDICE_FIGMA.fisso} sostituzione={sostituzione} ricette={ricette} onIndicazioni={nulla} onNavigazione={nulla} onMenu={nulla} onNotifiche={nulla} />;
}

/** Piano · 5 … 5.8 (step 9, lotto 3): il fisso con "G" (o il variabile con "Pranzo" per la 5.1) e il pannello "Ricetta" nello stato richiesto. */
export function RicetteSchermataSviluppo({ variante }: { variante: VarianteRicetteSviluppo }) {
  const tipo = contestoDi(variante);
  const piano = useMemo(() => componiPiano(tipo === 'variabile' ? variabile() : fisso(() => pastiFigma())), [tipo]);
  const sostituzione = useSostituzioneSviluppo();
  const ricette = useRicetteSviluppo(variante);
  return <SchermataPiano fase={{ tipo: 'pronto', piano, daCache: false }} indiceIniziale={INDICE_FIGMA[tipo]} sostituzione={sostituzione} ricette={ricette} onIndicazioni={nulla} onNavigazione={nulla} onMenu={nulla} onNotifiche={nulla} />;
}

/** Consenso alle funzioni AI al primo uso dentro i pannelli (step 6): card al posto del contenuto, nessuna scrittura. */
const CONSENSO_RICHIESTO = { richiesto: true, inCorso: false, accetta: nulla, nonOra: nulla, informativa: nulla };

/** Piano · 4.6 (831:8486): pannello "Sostituisci" con il consenso al primo uso. */
export function SostituzioneConsensoSviluppo() {
  const piano = useMemo(() => componiPiano(fisso(() => pastiFigma())), []);
  const sostituzione = useSostituzioneSviluppo('avvio');
  const ricette = useRicetteSviluppo();
  return <SchermataPiano fase={{ tipo: 'pronto', piano, daCache: false }} indiceIniziale={INDICE_FIGMA.fisso} sostituzione={{ ...sostituzione, consenso: CONSENSO_RICHIESTO }} ricette={ricette} onIndicazioni={nulla} onNavigazione={nulla} onMenu={nulla} onNotifiche={nulla} />;
}

/** Pannello "Ricetta" con il consenso al primo uso (stesso disegno di 831:8486). */
export function RicettaConsensoSviluppo() {
  const piano = useMemo(() => componiPiano(fisso(() => pastiFigma())), []);
  const sostituzione = useSostituzioneSviluppo();
  const ricette = useRicetteSviluppo('avvio-fisso');
  return <SchermataPiano fase={{ tipo: 'pronto', piano, daCache: false }} indiceIniziale={INDICE_FIGMA.fisso} sostituzione={sostituzione} ricette={{ ...ricette, consenso: CONSENSO_RICHIESTO }} onIndicazioni={nulla} onNavigazione={nulla} onMenu={nulla} onNotifiche={nulla} />;
}

/** La scheda Piano vera (o le sue Indicazioni) per l'account in sessione: stesso hook della rotta, senza il gruppo dell'abbonato. */
export function PianoRealeSviluppo({ cosa }: { cosa: 'piano' | 'indicazioni' }) {
  const clientId = useClientIdSviluppo();
  const router = useRouter();
  const onIndicazioni = useCallback(() => router.push({ pathname: '/sviluppo/stati', params: { stato: 'piano-reale-indicazioni' } }), [router]);
  if (!clientId) return <SchermataPiano fase={{ tipo: 'caricamento' }} />;
  return <PianoReale clientId={clientId} cosa={cosa} onIndicazioni={onIndicazioni} onIndietro={() => router.back()} />;
}

function PianoReale({ clientId, cosa, onIndicazioni, onIndietro }: { clientId: string; cosa: 'piano' | 'indicazioni'; onIndicazioni: () => void; onIndietro: () => void }) {
  const router = useRouter();
  const { fase, dati, ricarica } = usePiano(clientId);
  // Sostituzione e ricette vere (server degli agenti con la sessione in corso) e tutorial per account, come nella rotta.
  const sostituzione = useSostituzione(clientId, ricarica);
  const apriRicetta = useCallback(() => router.push('/ricetta'), [router]);
  const ricette = useRicette(clientId, apriRicetta, ricarica);
  const tutorial = useTutorialPiano(clientId);
  const { chiudi } = sostituzione.azioni;
  const { chiudi: chiudiRicette } = ricette.azioni;
  const onNutrizionista = useCallback(() => {
    chiudi();
    router.push('/nutrizionista');
  }, [chiudi, router]);
  const onNutrizionistaRicette = useCallback(() => {
    chiudiRicette();
    router.push('/nutrizionista');
  }, [chiudiRicette, router]);
  const { chiudiNotifica: chiudiNotificaRicette } = ricette;
  const { chiudiNotifica: chiudiNotificaSostituzione } = sostituzione;
  const chiudiNotifica = useCallback(() => {
    chiudiNotificaRicette();
    chiudiNotificaSostituzione();
  }, [chiudiNotificaRicette, chiudiNotificaSostituzione]);
  if (cosa === 'indicazioni') return <SchermataIndicazioni indicazioni={dati?.piano?.indicazioni ?? []} onIndietro={onIndietro} />;
  const faseSchermata: FasePiano =
    fase.tipo === 'pronto' && dati ? { tipo: 'pronto', piano: dati.piano, daCache: dati.daCache } : fase.tipo === 'caricamento' || fase.tipo === 'pronto' ? { tipo: 'caricamento' } : { tipo: fase.tipo, onRiprova: ricarica };
  return (
    <SchermataPiano
      fase={faseSchermata}
      sostituzione={{ stato: sostituzione.stato, azioni: sostituzione.azioni, onNutrizionista, consenso: sostituzione.consenso }}
      ricette={{ stato: ricette.stato, azioni: ricette.azioni, onNutrizionista: onNutrizionistaRicette, consenso: ricette.consenso }}
      tutorial={{ passo: tutorial.passo, onAvanti: tutorial.avanti, onHoCapito: tutorial.hoCapito }}
      notifica={ricette.notifica ?? sostituzione.notifica}
      onNotificaScomparsa={chiudiNotifica}
      onIndicazioni={onIndicazioni}
      onNavigazione={nulla}
      onMenu={nulla}
      onNotifiche={nulla}
    />
  );
}
