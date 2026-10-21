import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { andamentoSettimana } from '@/core/diario/andamento';
import { aggiornaDiario, diarioLocaleIniziale, dopoCondivisione, type DiarioLocale, type StatoRiga } from '@/core/diario/bozza';
import { aggiornaGiornata, type GiornataLocale } from '@/core/diario/giornata';
import type { RigaSettimana } from '@/core/diario/letture';
import { BLOCCHI, bloccoSuccessivo, campiDaSalvare, DIARIO_VUOTO, type Blocco, type Diario, type Pasto } from '@/core/diario/modello';
import { giorniSettimana } from '@/core/diario/settimana';
import type { StatoPannello } from '@/servizi/usePannelloGiornata';
import type { NotificaBreveProps } from '@/ui/NotificaBreve';
import { SchermataOggi } from '@/ui/schermate/SchermataOggi';

// Pagina Oggi con dati finti per i confronti con Figma (sezioni "3 · Oggi e diario" e "3.2 · Giornate e storico"):
// venerdì 9 ottobre 2026 come nei disegni, settimana L M condivisi, M non condiviso, G condiviso, V oggi, S D futuri.
// Interattiva, nessuna scrittura.

const OGGI = '2026-10-09';
const CLIENT = 'finto';
const COMMENTO = 'Ottima giornata Giulia! Bene la colazione proteica e la camminata serale. A cena prova ad aggiungere una porzione di cereali integrali, così arrivi più sazia al mattino.';
type ValoriRiga = Partial<Pick<RigaSettimana, 'energy_level' | 'hydration_level' | 'sport_type' | 'sport_duration'>>;
const riga = (data: string, status: string, commento: string | null = null, letto: boolean | null = null, review_status: string | null = 'positive', valori: ValoriRiga = {}): RigaSettimana => ({
  id: data,
  submission_date: data,
  status,
  updated_at: null,
  energy_level: null,
  satiety_level: null,
  hydration_level: null,
  sport_type: null,
  sport_duration: null,
  ...valori,
  nutritionist_comment: commento,
  comment_author_id: commento ? 'autrice' : null,
  comment_acknowledged: letto,
  review_status,
});
/** Valutazioni: L approvata, M da rivedere con commento da leggere, M in attesa con commento letto, G in attesa, V oggi da rivedere con commento letto. */
const SETTIMANA_VALUTAZIONI: RigaSettimana[] = [
  riga('2026-10-05', 'submitted', null, null, 'positive'),
  riga('2026-10-06', 'submitted', COMMENTO, false, 'needs_review'),
  riga('2026-10-07', 'submitted', COMMENTO, true, null),
  riga('2026-10-08', 'submitted', null, null, null),
  riga('2026-10-09', 'submitted', COMMENTO, true, 'needs_review'),
];
const SETTIMANA: RigaSettimana[] = [riga('2026-10-05', 'submitted'), riga('2026-10-06', 'submitted'), riga('2026-10-08', 'submitted')];
/**
 * Andamento · 1 (479:1908): energia L 3, M 4, G 3; idratazione L 2 L, M 2 L, G +2,5 L; sport L riposo, M 30 min – 1 ora,
 * G meno di 30 min; mercoledì non condiviso; venerdì (oggi) in bozza con energia 4, idratazione +2,5 L e sport più di 1,5 ore.
 */
const SETTIMANA_ANDAMENTO: RigaSettimana[] = [
  riga('2026-10-05', 'submitted', null, null, 'positive', { energy_level: 3, hydration_level: 3 }),
  riga('2026-10-06', 'submitted', null, null, 'positive', { energy_level: 4, hydration_level: 3, sport_type: 'camminata', sport_duration: '30m-1h' }),
  riga('2026-10-08', 'submitted', null, null, 'positive', { energy_level: 3, hydration_level: 4, sport_type: 'corsa', sport_duration: '<30m' }),
];
const DIARIO_ANDAMENTO: Diario = { ...DIARIO_VUOTO, energy_level: 4, hydration_level: 4, sport_type: 'pesi', sport_duration: '>1.5h' };
/**
 * Casi limite dell'andamento: L con la sola energia (idratazione vuota, sport riposo), M con la durata storica "<20m"
 * (primo gradino) e idratazione <1 L, M condiviso con una durata non riconosciuta ("45 min": nessuna colonna),
 * G in bozza non condivisa (trattino), oggi con "Oggi riposo" in bozza e sola idratazione.
 */
const SETTIMANA_ANDAMENTO_CASI: RigaSettimana[] = [
  riga('2026-10-05', 'submitted', null, null, 'positive', { energy_level: 2 }),
  riga('2026-10-06', 'submitted', null, null, 'positive', { energy_level: 1, hydration_level: 1, sport_type: 'bici', sport_duration: '<20m' }),
  riga('2026-10-07', 'submitted', null, null, 'positive', { energy_level: 3, hydration_level: 2, sport_type: 'corsa', sport_duration: '45 min' }),
  riga('2026-10-08', 'draft', null, null, null, { energy_level: 4, hydration_level: 4 }),
];
const DIARIO_ANDAMENTO_CASI: Diario = { ...DIARIO_VUOTO, hydration_level: 2, riposo: true };
/** Giornate · 1 (474:1328): lunedì con commento letto, giovedì con commento da leggere. */
const SETTIMANA_COMMENTI: RigaSettimana[] = [riga('2026-10-05', 'submitted', COMMENTO, true), riga('2026-10-06', 'submitted'), riga('2026-10-08', 'submitted', COMMENTO, false)];

/** Diario della schermata Oggi · 2: colazione, pranzo e spuntini compilati, cena da scrivere. */
const DIARIO_PASTI: Diario = { ...DIARIO_VUOTO, breakfast: 'Yogurt greco, fiocchi d’avena e mirtilli', lunch: 'Insalata di farro con ceci e verdure', snacks: 'Una mela e qualche mandorla' };
/** Diario delle schermate Oggi · 3 e 4: energia Buona, sazietà 7, idratazione 2 L, camminata 30 min – 1 ora. */
const DIARIO_VALORI: Diario = { ...DIARIO_PASTI, dinner: 'Pesce al forno con patate', energy_level: 3, satiety_level: 7, hydration_level: 3, sport_type: 'camminata', sport_duration: '30m-1h' };
/** Giornata di giovedì 8 ottobre nelle schermate Giornate · 2 e 4 (solo colazione e pranzo) e · 3 (completa). */
const GIORNATA_BREVE: Diario = { ...DIARIO_VUOTO, breakfast: 'Yogurt greco con frutti di bosco e un caffè', lunch: 'Pasta al pomodoro e insalata mista' };
const GIORNATA_COMPLETA: Diario = {
  ...GIORNATA_BREVE,
  dinner: 'Pollo alla griglia con verdure',
  snacks: 'Una mela a metà pomeriggio',
  day_comment: 'Sabato sono a cena fuori con amici.',
  energy_level: 3,
  satiety_level: 7,
  hydration_level: 3,
  sport_type: 'camminata',
  sport_duration: '30m-1h',
};
const AUTRICE = { nome: 'Margherita', foto: null, iniziali: 'MC', fotoPronta: false };

export type ScenarioOggi =
  | 'daIniziare'
  | 'pasti'
  | 'valori'
  | 'sport'
  | 'sportRiposo'
  | 'commento'
  | 'bozza'
  | 'condiviso'
  | 'erroreSalvataggio'
  | 'condivisoNotifica'
  | 'avanzamento'
  | 'valoriVuoti'
  | 'settimanaCommento'
  | 'pannelloDaLeggere'
  | 'pannelloPienoLetto'
  | 'pannelloSenzaCommento'
  | 'pannelloModifica'
  | 'pannelloCaricamento'
  | 'pannelloErrore'
  | 'pastiSpuntini'
  | 'commentoTastiera'
  | 'oggiCommentoDaLeggere'
  | 'oggiCommentoLetto'
  | 'valutazioni'
  | 'andamento'
  | 'andamentoPochiDati'
  | 'andamentoCasi'
  | 'andamentoOggiCondiviso';

// Scenario "avanzamento": i blocchi cambiano da soli ogni 3 s (avanti e poi indietro) per verificare l'indicatore.
const CICLO_BLOCCHI: Blocco[] = ['pasti', 'valori', 'sport', 'commento', 'sport', 'valori', 'pasti'];
const PASSO_CICLO_MS = 3000;

function giornata(data: string, diario: Diario): GiornataLocale {
  return { id: data, data, diario, salvato: campiDaSalvare(diario), updatedAt: null, inAttesa: false, errore: null, modificatoAlle: null };
}

type Iniziale = {
  locale: DiarioLocale;
  blocco: Blocco | null;
  pasto: Pasto | null;
  settimana: RigaSettimana[];
  pannello: StatoPannello | null;
  schermoPieno?: boolean;
  commentoAFuoco?: boolean;
};

function iniziale(scenario: ScenarioOggi): Iniziale {
  const bozza = (diario: Diario): StatoRiga => ({ tipo: 'bozza', id: 'riga-finta', salvato: campiDaSalvare(diario) });
  const daIniziare = diarioLocaleIniziale(CLIENT, OGGI, DIARIO_VUOTO, { tipo: 'assente' });
  const base = { blocco: null, pasto: null, settimana: SETTIMANA, pannello: null };
  switch (scenario) {
    case 'daIniziare':
      return { ...base, locale: daIniziare };
    case 'valoriVuoti':
      return { ...base, locale: daIniziare, blocco: 'valori' };
    case 'avanzamento':
      return { ...base, locale: diarioLocaleIniziale(CLIENT, OGGI, DIARIO_VALORI, bozza(DIARIO_VALORI)), blocco: 'pasti' };
    case 'pasti':
      return { ...base, locale: diarioLocaleIniziale(CLIENT, OGGI, DIARIO_PASTI, bozza(DIARIO_PASTI)), blocco: 'pasti', pasto: 'dinner' };
    case 'pastiSpuntini':
      return { ...base, locale: diarioLocaleIniziale(CLIENT, OGGI, DIARIO_PASTI, bozza(DIARIO_PASTI)), blocco: 'pasti', pasto: 'snacks' };
    case 'commentoTastiera':
      return { ...base, locale: diarioLocaleIniziale(CLIENT, OGGI, DIARIO_VALORI, bozza(DIARIO_VALORI)), blocco: 'commento', commentoAFuoco: true };
    case 'valutazioni':
      return {
        ...base,
        locale: dopoCondivisione(diarioLocaleIniziale(CLIENT, OGGI, DIARIO_VALORI, bozza(DIARIO_VALORI)), OGGI, '2026-10-09T19:12:00.000Z'),
        settimana: SETTIMANA_VALUTAZIONI,
      };
    case 'oggiCommentoDaLeggere':
    case 'oggiCommentoLetto': {
      // Oggi condiviso e commentato: Giorno della settimana "Oggi con commento da leggere / letto" (704:436, 704:442).
      const letto = scenario === 'oggiCommentoLetto';
      return {
        ...base,
        locale: dopoCondivisione(diarioLocaleIniziale(CLIENT, OGGI, DIARIO_VALORI, bozza(DIARIO_VALORI)), OGGI, '2026-10-09T19:12:00.000Z'),
        settimana: [...SETTIMANA_COMMENTI, riga(OGGI, 'submitted', COMMENTO, letto)],
      };
    }
    case 'andamento':
      return { ...base, locale: diarioLocaleIniziale(CLIENT, OGGI, DIARIO_ANDAMENTO, bozza(DIARIO_ANDAMENTO)), settimana: SETTIMANA_ANDAMENTO };
    case 'andamentoPochiDati':
      // Andamento · 2 (479:2100): giorni condivisi senza alcun valore e nessuna bozza.
      return { ...base, locale: daIniziare };
    case 'andamentoCasi':
      return { ...base, locale: diarioLocaleIniziale(CLIENT, OGGI, DIARIO_ANDAMENTO_CASI, { tipo: 'assente' }), settimana: SETTIMANA_ANDAMENTO_CASI };
    case 'andamentoOggiCondiviso':
      // Oggi condiviso: la colonna di venerdì è piena, con i valori della riga della settimana.
      return {
        ...base,
        locale: dopoCondivisione(diarioLocaleIniziale(CLIENT, OGGI, DIARIO_ANDAMENTO, bozza(DIARIO_ANDAMENTO)), OGGI, '2026-10-09T19:12:00.000Z'),
        settimana: [...SETTIMANA_ANDAMENTO, riga(OGGI, 'submitted', null, null, null, { energy_level: 2, hydration_level: 2, sport_type: 'nuoto', sport_duration: '1h-1.5h' })],
      };
    case 'valori':
      return { ...base, locale: diarioLocaleIniziale(CLIENT, OGGI, DIARIO_VALORI, bozza(DIARIO_VALORI)), blocco: 'valori' };
    case 'sport':
      return { ...base, locale: diarioLocaleIniziale(CLIENT, OGGI, DIARIO_VALORI, bozza(DIARIO_VALORI)), blocco: 'sport' };
    case 'sportRiposo': {
      const riposo: Diario = { ...DIARIO_VALORI, riposo: true, sport_type: null, sport_duration: null };
      return { ...base, locale: diarioLocaleIniziale(CLIENT, OGGI, riposo, bozza(riposo)), blocco: 'sport' };
    }
    case 'commento':
      return { ...base, locale: diarioLocaleIniziale(CLIENT, OGGI, DIARIO_VALORI, bozza(DIARIO_VALORI)), blocco: 'commento' };
    case 'bozza':
    case 'erroreSalvataggio':
      return {
        ...base,
        locale: { ...diarioLocaleIniziale(CLIENT, OGGI, DIARIO_PASTI, bozza(DIARIO_PASTI)), inAttesa: scenario === 'erroreSalvataggio', errore: scenario === 'erroreSalvataggio' ? 'rete' : null },
      };
    case 'condiviso':
    case 'condivisoNotifica':
      return { ...base, locale: dopoCondivisione(diarioLocaleIniziale(CLIENT, OGGI, DIARIO_VALORI, bozza(DIARIO_VALORI)), 'riga-finta', '2026-10-09T19:12:00.000Z') };
    case 'settimanaCommento':
      return { ...base, locale: daIniziare, settimana: SETTIMANA_COMMENTI };
    case 'pannelloDaLeggere':
      return {
        ...base,
        locale: daIniziare,
        settimana: SETTIMANA_COMMENTI,
        pannello: { data: '2026-10-08', fase: { tipo: 'pronto', giornata: giornata('2026-10-08', GIORNATA_BREVE), commento: { testo: COMMENTO, nuovo: true, autore: AUTRICE } }, modifica: null },
      };
    case 'pannelloPienoLetto':
      return {
        ...base,
        locale: daIniziare,
        settimana: SETTIMANA_COMMENTI,
        pannello: { data: '2026-10-08', fase: { tipo: 'pronto', giornata: giornata('2026-10-08', GIORNATA_COMPLETA), commento: { testo: COMMENTO, nuovo: false, autore: AUTRICE } }, modifica: null },
        schermoPieno: true,
      };
    case 'pannelloSenzaCommento':
      return {
        ...base,
        locale: daIniziare,
        settimana: SETTIMANA_COMMENTI,
        pannello: { data: '2026-10-06', fase: { tipo: 'pronto', giornata: giornata('2026-10-06', GIORNATA_BREVE), commento: null }, modifica: null },
      };
    case 'pannelloModifica':
      return {
        ...base,
        locale: daIniziare,
        settimana: SETTIMANA_COMMENTI,
        pasto: 'dinner',
        pannello: { data: '2026-10-08', fase: { tipo: 'pronto', giornata: giornata('2026-10-08', GIORNATA_COMPLETA), commento: { testo: COMMENTO, nuovo: false, autore: AUTRICE } }, modifica: 'pasti' },
      };
    case 'pannelloCaricamento':
      return { ...base, locale: daIniziare, settimana: SETTIMANA_COMMENTI, pannello: { data: '2026-10-08', fase: { tipo: 'caricamento' }, modifica: null } };
    case 'pannelloErrore':
      return { ...base, locale: daIniziare, settimana: SETTIMANA_COMMENTI, pannello: { data: '2026-10-08', fase: { tipo: 'rete' }, modifica: null } };
  }
}

/** Pannello finto per lo storico di sviluppo: giornata completa con commento letto (giovedì 8) o breve senza commento. */
export function pannelloDiProva(data: string): StatoPannello {
  const completa = data === '2026-10-08';
  return {
    data,
    fase: { tipo: 'pronto', giornata: giornata(data, completa ? GIORNATA_COMPLETA : GIORNATA_BREVE), commento: completa ? { testo: COMMENTO, nuovo: false, autore: AUTRICE } : null },
    modifica: null,
  };
}

/** Pannello finto: la giornata si apre dalla settimana con i dati di Figma (commento da leggere su giovedì, letto su lunedì). */
function pannelloFinto(data: string, righe: RigaSettimana[]): StatoPannello {
  const r = righe.find((x) => x.submission_date === data);
  const commento = r?.nutritionist_comment ? { testo: r.nutritionist_comment, nuovo: r.comment_acknowledged !== true, autore: AUTRICE } : null;
  return { data, fase: { tipo: 'pronto', giornata: giornata(data, data === '2026-10-08' ? GIORNATA_COMPLETA : GIORNATA_BREVE), commento }, modifica: null };
}

export function OggiSviluppo({ scenario }: { scenario: ScenarioOggi }) {
  // ?scorri=fondo: la pagina parte scorsa in fondo (screenshot delle card dell'andamento, sotto la piega).
  const { scorri } = useLocalSearchParams<{ scorri?: string }>();
  const [stato] = useState(() => iniziale(scenario));
  const [locale, setLocale] = useState(stato.locale);
  const [settimana, setSettimana] = useState(stato.settimana);
  const [blocco, setBlocco] = useState<Blocco | null>(stato.blocco);
  const [pannello, setPannello] = useState<StatoPannello | null>(stato.pannello);
  const [notifica, setNotifica] = useState<'errore' | 'condiviso' | null>(scenario === 'erroreSalvataggio' ? 'errore' : scenario === 'condivisoNotifica' ? 'condiviso' : null);

  useEffect(() => {
    if (scenario !== 'avanzamento') return;
    let i = 0;
    const timer = setInterval(() => {
      i = (i + 1) % CICLO_BLOCCHI.length;
      setBlocco(CICLO_BLOCCHI[i] ?? null);
    }, PASSO_CICLO_MS);
    return () => clearInterval(timer);
  }, [scenario]);

  const aggiorna = useCallback((diario: Diario) => setLocale((l) => aggiornaDiario(l, diario)), []);
  const condividi = useCallback(() => {
    setLocale((l) => dopoCondivisione(l, 'riga-finta', new Date().toISOString()));
    setBlocco(null);
    setNotifica('condiviso');
  }, []);

  const apriGiorno = useCallback(
    (data: string) => {
      setPannello(pannelloFinto(data, settimana));
      // Il commento si segna letto all'apertura: il pallino diventa verde subito.
      setSettimana((righe) => righe.map((r) => (r.submission_date === data && r.nutritionist_comment ? { ...r, comment_acknowledged: true } : r)));
    },
    [settimana],
  );
  const modifica = useCallback((blocco: Blocco | null) => setPannello((p) => (p ? { ...p, modifica: blocco } : p)), []);
  const aggiornaGiornataAperta = useCallback(
    (diario: Diario) => setPannello((p) => (p && p.fase.tipo === 'pronto' ? { ...p, fase: { ...p.fase, giornata: aggiornaGiornata(p.fase.giornata, diario) } } : p)),
    [],
  );

  const propsNotifica: (NotificaBreveProps & { chiave?: string }) | undefined =
    notifica === 'errore'
      ? { tipo: 'errore', testo: 'Sei offline: le modifiche sono salvate sul telefono.', onRiprova: () => setNotifica(null) }
      : notifica === 'condiviso'
        ? { tipo: 'conferma', testo: 'Giornata condivisa con la tua nutrizionista.', onScomparsa: () => setNotifica(null) }
        : undefined;

  return (
    <SchermataOggi
      nome="Giulia"
      locale={locale}
      giorni={giorniSettimana(OGGI, settimana)}
      andamento={andamentoSettimana(OGGI, settimana, { diario: locale.diario, condiviso: locale.riga.tipo === 'condiviso' })}
      blocco={blocco}
      inviando={false}
      onScrivi={() => setBlocco('pasti')}
      onRacconta={() => {}}
      onChiudi={() => setBlocco(null)}
      onAvanti={() => setBlocco((b) => (b ? bloccoSuccessivo(b) : null))}
      onIndietro={() => setBlocco((b) => (b ? (BLOCCHI[BLOCCHI.indexOf(b) - 1] ?? b) : null))}
      onVaiA={setBlocco}
      onAggiorna={aggiorna}
      onCondividi={condividi}
      pastoApertoIniziale={stato.pannello ? null : stato.pasto}
      commentoAFuoco={stato.commentoAFuoco}
      scorriInFondoAllAvvio={scorri === 'fondo'}
      notifica={propsNotifica}
      giornata={{
        pannello,
        onApriGiorno: apriGiorno,
        onChiudiPannello: () => setPannello(null),
        onRiprovaPannello: () => setPannello((p) => (p ? pannelloFinto(p.data, settimana) : p)),
        onModifica: () => modifica('pasti'),
        onChiudiModifica: () => modifica(null),
        onAvantiModifica: () => setPannello((p) => (p?.modifica ? { ...p, modifica: bloccoSuccessivo(p.modifica) ?? p.modifica } : p)),
        onIndietroModifica: () => setPannello((p) => (p?.modifica ? { ...p, modifica: BLOCCHI[BLOCCHI.indexOf(p.modifica) - 1] ?? p.modifica } : p)),
        onVaiAModifica: modifica,
        onAggiornaGiornata: aggiornaGiornataAperta,
        schermoPieno: stato.schermoPieno,
        pastoApertoIniziale: stato.pannello ? stato.pasto : null,
      }}
    />
  );
}
