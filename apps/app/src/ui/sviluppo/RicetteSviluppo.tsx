import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';

import type { ContestoRicetta } from '@/core/ricette/contesto';
import type { StatoPannello } from '@/core/ricette/pannello';
import type { RicettaSalvata } from '@/core/ricette/salvate';
import type { Idea, Ricetta, Stima } from '@/core/ricette/server';
import type { AzioniRicette } from '@/servizi/useRicette';
import type { NotificaPiano } from '@/servizi/useSostituzione';
import { SchermataRicetta } from '@/ui/schermate/SchermataRicetta';
import { SchermataRicetteSalvate } from '@/ui/schermate/SchermataRicetteSalvate';
import type { RicettePiano } from '@/ui/schermate/SchermataPiano';

// Dati sintetici delle ricette per la pagina degli stati (step 9, lotto 3): i testi dei disegni Figma 536:3448 … 818:8193
// (pannello), 539:3500 / 818:7834 / 818:7907 (ricetta) e 539:3724 / 539:3777 / 818:7983 (Le tue ricette). Nessun server.
const nulla = () => {};

const PASTI_FIGMA = [
  { id: 'colazione', nome: 'Colazione' },
  { id: 'spuntino-1', nome: 'Spuntino' },
  { id: 'pranzo', nome: 'Pranzo' },
  { id: 'spuntino-2', nome: 'Spuntino' },
  { id: 'cena', nome: 'Cena' },
];
const PRANZO = PASTI_FIGMA[2]!;
export const CONTESTO_FISSO: ContestoRicetta = { tipo: 'fisso', pianoId: 'fisso-sviluppo', giorno: { indice: 4, nome: 'Giovedì' }, pasti: PASTI_FIGMA };
export const CONTESTO_VARIABILE: ContestoRicetta = { tipo: 'variabile', pianoId: 'variabile-sviluppo', pasto: { id: 'pranzo', nome: 'Pranzo' } };

const STIMA: Stima = { kcal: 620, carboidrati: 70, proteine: 40, grassi: 18, fonte: 'catalogo' };
const idea = (titolo: string, descrizione: string, tipo: Idea['tipo'] = 'individuale'): Idea => ({ titolo, descrizione, tipo, allergeni: [], regime: null });
const IDEE_FIGMA: Idea[] = [
  idea('Bowl di farro, salmone e zucchine', 'Ciotola tiepida con verdure di stagione e salmone al forno.'),
  idea('Riso venere con gamberi e piselli', 'Piatto unico saporito, pronto in meno di mezz’ora.'),
  idea('Insalata tiepida di pollo e quinoa', 'Insalata completa e leggera, buona anche da portare via.'),
];
const FRASE_INGREDIENTI = 'Il cioccolato non si abbina a un pranzo a base di pesce: le idee partono dal salmone.';
const ERRORE_RETE = { esito: 'rete' as const, codice: 'rete', messaggio: 'Nessuna connessione', richiestaId: null, httpStatus: null };
const ERRORE_SESSIONE = { esito: 'sessione' as const, codice: 'token_non_valido', messaggio: 'Token non valido', richiestaId: 'app-x', httpStatus: 401 };

const base = { contesto: CONTESTO_FISSO, pasto: PRANZO, campo: '' };
const dati = (scelta: number | null, fraseIngredienti: string | null = null) => ({ richiestaId: '12345678-1234-4123-8123-123456789012', stima: STIMA, idee: IDEE_FIGMA, fraseIngredienti, versioneIstruzioni: 'v0.4 (28/10/2026)', scelta });

export type VarianteRicetteSviluppo = 'avvio-fisso' | 'avvio-fisso-scelto' | 'avvio-variabile' | 'ricerca' | 'idee' | 'idee-selezionata' | 'idee-frase' | 'attesa' | 'attesa-oltre' | 'nessuna' | 'errore' | 'errore-ricetta' | 'errore-sessione';

export const STATI_RICETTE: Record<VarianteRicetteSviluppo, StatoPannello> = {
  'avvio-fisso': { tipo: 'avvio', contesto: CONTESTO_FISSO, pasto: null, campo: '' },
  'avvio-fisso-scelto': { tipo: 'avvio', ...base },
  'avvio-variabile': { tipo: 'avvio', contesto: CONTESTO_VARIABILE, pasto: CONTESTO_VARIABILE.tipo === 'variabile' ? CONTESTO_VARIABILE.pasto : null, campo: '' },
  ricerca: { tipo: 'ricerca', richiesta: 1, ...base },
  idee: { tipo: 'idee', ...base, dati: dati(null) },
  'idee-selezionata': { tipo: 'idee', ...base, dati: dati(0) },
  'idee-frase': { tipo: 'idee', ...base, campo: 'cioccolato, salmone', dati: dati(null, FRASE_INGREDIENTI) },
  attesa: { tipo: 'attesaRicetta', richiesta: 2, ...base, dati: dati(0) as ReturnType<typeof dati> & { scelta: number } },
  'attesa-oltre': { tipo: 'attesaRicetta', richiesta: 2, ...base, dati: dati(0) as ReturnType<typeof dati> & { scelta: number } },
  nessuna: { tipo: 'nessunaIdea', ...base },
  errore: { tipo: 'errore', ...base, errore: ERRORE_RETE, riprovabile: true, fase: 'idee', dati: null },
  'errore-ricetta': { tipo: 'errore', ...base, errore: { ...ERRORE_RETE, esito: 'riprovabile', codice: 'ricette_timeout' }, riprovabile: true, fase: 'ricetta', dati: dati(0) },
  'errore-sessione': { tipo: 'errore', ...base, errore: ERRORE_SESSIONE, riprovabile: false, fase: 'idee', dati: null },
};

/** Il contesto giusto per il piano sintetico della variante (variabile solo per 5.1). */
export function contestoDi(variante: VarianteRicetteSviluppo): 'fisso' | 'variabile' {
  return variante === 'avvio-variabile' ? 'variabile' : 'fisso';
}

/** Pannello "Ricetta" di sviluppo: lo stato richiesto con dati sintetici; si chiude e si riapre dall'avvio da "Ricetta", senza server. */
export function useRicetteSviluppo(iniziale: VarianteRicetteSviluppo | null = null): RicettePiano {
  const [stato, setStato] = useState<StatoPannello>(() => (iniziale ? STATI_RICETTE[iniziale] : { tipo: 'chiuso' }));
  const azioni = useMemo<AzioniRicette>(
    () => ({
      apri: (contesto) => setStato({ tipo: 'avvio', contesto, pasto: contesto.tipo === 'variabile' ? contesto.pasto : null, campo: '' }),
      chiudi: () => setStato({ tipo: 'chiuso' }),
      scegliPasto: (pasto) => setStato((s) => (s.tipo === 'avvio' ? { ...s, pasto } : s)),
      scrivi: (testo) => setStato((s) => (s.tipo === 'avvio' ? { ...s, campo: testo } : s)),
      trova: () => setStato((s) => (s.tipo === 'avvio' && s.pasto ? { tipo: 'ricerca', richiesta: 1, contesto: s.contesto, pasto: s.pasto, campo: s.campo } : s)),
      scegliIdea: (indice) => setStato((s) => (s.tipo === 'idee' ? { ...s, dati: { ...s.dati, scelta: indice } } : s)),
      vediRicetta: () => setStato((s) => (s.tipo === 'idee' && s.dati.scelta !== null ? { tipo: 'attesaRicetta', richiesta: 2, contesto: s.contesto, pasto: s.pasto, campo: s.campo, dati: { ...s.dati, scelta: s.dati.scelta } } : s)),
      riprova: () => setStato((s) => (s.tipo === 'errore' ? { tipo: 'ricerca', richiesta: 1, contesto: s.contesto, pasto: s.pasto, campo: s.campo } : s)),
    }),
    [],
  );
  // 5.3.1: la barra ferma al 60 % (212 / 353 nel disegno) con "Circa 10 secondi"; oltre i 10 s: quasi piena con "Ancora qualche secondo…".
  return { stato, azioni, onNutrizionista: azioni.chiudi, attesaTrascorsa: iniziale === 'attesa-oltre' ? 10_000 : iniziale === 'attesa' ? 6_000 : undefined, attesaFerma: iniziale === 'attesa' };
}

// ---- Ricetta a pagina intera (5.4, 5.5, 5.6, 7.2) ------------------------------------------------------------------------

const RICETTA_FIGMA: Ricetta = {
  titolo: 'Bowl di farro, salmone e zucchine',
  tempoMinuti: 20,
  riposoMinuti: null,
  tipo: 'individuale',
  ingredienti: [
    { nome: 'Farro perlato', quantita: '75 g' },
    { nome: 'Filetto di salmone', quantita: '120 g' },
    { nome: 'Zucchina', quantita: '1' },
    { nome: 'Pomodorini', quantita: '5' },
    { nome: 'Olio extravergine d’oliva', quantita: '1 cucchiaio' },
    { nome: 'Limone, basilico, sale e pepe', quantita: 'q.b.' },
  ],
  porzioni: null,
  preparazione: [
    'Cuoci il farro in acqua salata per circa 20 minuti, poi scolalo e lascialo intiepidire.',
    'Taglia la zucchina a rondelle e saltala in padella con metà dell’olio per 5 minuti.',
    'Cuoci il salmone in padella antiaderente, 3–4 minuti per lato, poi sfaldalo con una forchetta.',
    'Componi la bowl con farro, zucchina, salmone e pomodorini tagliati a metà; condisci con l’olio rimasto, limone, basilico, sale e pepe.',
  ],
  spiegazione: 'Farro e salmone rendono questo pranzo completo e saziante, con le verdure che aggiungono volume e freschezza.',
  grezza: {},
};
const CHEESECAKE_FIGMA: Ricetta = {
  titolo: 'Cheesecake proteica ai frutti di bosco',
  tempoMinuti: 50,
  riposoMinuti: null,
  tipo: 'piu_porzioni',
  ingredienti: [
    { nome: 'Biscotti secchi integrali', quantita: '120 g' },
    { nome: 'Yogurt greco 0%', quantita: '500 g' },
    { nome: 'Ricotta', quantita: '250 g' },
    { nome: 'Uova', quantita: '2' },
    { nome: 'Frutti di bosco', quantita: '200 g' },
    { nome: 'Miele, vaniglia e scorza di limone', quantita: 'q.b.' },
  ],
  porzioni: { numero: 8, laTuaPorzione: 'una fetta, circa 110 g' },
  preparazione: [
    'Trita i biscotti e pressali sul fondo di uno stampo da 22 cm foderato con carta forno.',
    'Mescola yogurt, ricotta, uova, un cucchiaio di miele, vaniglia e scorza di limone fino a ottenere una crema liscia.',
    'Versa la crema sulla base e cuoci a 170 °C per circa 40 minuti, poi lascia raffreddare nel forno spento.',
    'Copri con i frutti di bosco e lascia riposare in frigorifero almeno 2 ore prima di servire.',
  ],
  spiegazione: 'Yogurt greco e ricotta rendono questa fetta uno spuntino ricco di proteine, con i frutti di bosco per freschezza.',
  grezza: {},
};

export type VariantePaginaRicettaSviluppo = 'ricetta' | 'porzioni' | 'riposo' | 'salvata' | 'errore-salvataggio' | 'dettaglio';

/** Piano · 5.4 (539:3500), 5.5 (818:7834), 5.6 (818:7907), Menu · 7.2 (818:7983) con i testi dei disegni. */
export function PaginaRicettaSviluppo({ variante }: { variante: VariantePaginaRicettaSviluppo }) {
  const router = useRouter();
  // ?scorri=fondo: la pagina parte scorsa in fondo (screenshot della card AI e del pulsante, sotto la piega).
  const { scorri } = useLocalSearchParams<{ scorri?: string }>();
  const [stato, setStato] = useState<'normale' | 'inCorso' | 'salvata'>(variante === 'salvata' ? 'salvata' : 'normale');
  const [notifica, setNotifica] = useState<NotificaPiano | null>(() =>
    variante === 'salvata' ? { chiave: 1, testo: 'Ricetta salvata', tipo: 'conferma' } : variante === 'errore-salvataggio' ? { chiave: 1, testo: 'Non siamo riusciti a salvare la ricetta.', tipo: 'errore' } : null,
  );
  const ricetta = variante === 'porzioni' ? CHEESECAKE_FIGMA : variante === 'riposo' ? { ...CHEESECAKE_FIGMA, tempoMinuti: 30, riposoMinuti: 180 } : RICETTA_FIGMA;
  const pasto = variante === 'porzioni' || variante === 'riposo' ? 'Spuntino' : 'Pranzo';
  const salva = () => {
    setStato('inCorso');
    setTimeout(() => {
      setStato('salvata');
      setNotifica({ chiave: Date.now(), testo: 'Ricetta salvata', tipo: 'conferma' });
    }, 800);
  };
  return (
    <SchermataRicetta
      ricetta={ricetta}
      pasto={pasto}
      azione={variante === 'dettaglio' ? { tipo: 'elimina', stato: 'normale', onPress: nulla } : { tipo: 'salva', stato, onPress: salva }}
      onIndietro={() => router.back()}
      notifica={notifica}
      onNotificaScomparsa={() => setNotifica(null)}
      onRiprovaNotifica={salva}
      scorriInFondoAllAvvio={scorri === 'fondo'}
    />
  );
}

// ---- Le tue ricette (7, 7.1) -----------------------------------------------------------------------------------------

const SALVATE_FIGMA: RicettaSalvata[] = [
  { id: '1', creataIl: '2026-10-28T10:00:00Z', pasto: 'Pranzo', giorno: 'Giovedì', ricetta: RICETTA_FIGMA },
  { id: '2', creataIl: '2026-10-27T10:00:00Z', pasto: 'Colazione', giorno: null, ricetta: { ...RICETTA_FIGMA, titolo: 'Porridge con mela e cannella', tempoMinuti: 10 } },
  { id: '3', creataIl: '2026-10-26T10:00:00Z', pasto: 'Cena', giorno: null, ricetta: { ...RICETTA_FIGMA, titolo: 'Vellutata di zucca e ceci', tempoMinuti: 30 } },
  { id: '4', creataIl: '2026-10-25T10:00:00Z', pasto: 'Spuntino', giorno: null, ricetta: CHEESECAKE_FIGMA },
];

export type VarianteRicetteSalvateSviluppo = 'elenco' | 'vuoto' | 'caricamento' | 'errore' | 'senza-rete-copia';

/** Menu · 7 (539:3724) e 7.1 (539:3777) con i testi dei disegni; il tocco apre la 7.2. */
export function RicetteSalvateSviluppo({ variante }: { variante: VarianteRicetteSalvateSviluppo }) {
  const router = useRouter();
  const fase =
    variante === 'caricamento' ? { tipo: 'caricamento' as const } : variante === 'errore' ? { tipo: 'errore' as const, onRiprova: nulla } : { tipo: 'pronto' as const, ricette: variante === 'vuoto' ? [] : SALVATE_FIGMA, daCache: variante === 'senza-rete-copia' };
  return <SchermataRicetteSalvate fase={fase} onIndietro={() => router.back()} onApri={() => router.push({ pathname: '/sviluppo/stati', params: { stato: 'menu-7.2-ricetta-salvata' } })} />;
}
