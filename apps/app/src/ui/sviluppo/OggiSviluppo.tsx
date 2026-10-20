import { useCallback, useEffect, useState } from 'react';

import { aggiornaDiario, diarioLocaleIniziale, dopoCondivisione, type DiarioLocale, type StatoRiga } from '@/core/diario/bozza';
import { aggiornaGiornata, type GiornataLocale } from '@/core/diario/giornata';
import type { RigaSettimana } from '@/core/diario/letture';
import { BLOCCHI, bloccoSuccessivo, campiDaSalvare, DIARIO_VUOTO, type Blocco, type Diario, type Pasto } from '@/core/diario/modello';
import { giorniSettimana } from '@/core/diario/settimana';
import type { StatoPannello } from '@/servizi/useDiario';
import type { NotificaBreveProps } from '@/ui/NotificaBreve';
import { SchermataOggi } from '@/ui/schermate/SchermataOggi';

// Pagina Oggi con dati finti per i confronti con Figma (sezioni "3 · Oggi e diario" e "3.2 · Giornate e storico"):
// venerdì 9 ottobre 2026 come nei disegni, settimana L M condivisi, M non condiviso, G condiviso, V oggi, S D futuri.
// Interattiva, nessuna scrittura.

const OGGI = '2026-10-09';
const CLIENT = 'finto';
const COMMENTO = 'Ottima giornata Giulia! Bene la colazione proteica e la camminata serale. A cena prova ad aggiungere una porzione di cereali integrali, così arrivi più sazia al mattino.';
const riga = (data: string, status: string, commento: string | null = null, letto: boolean | null = null): RigaSettimana => ({
  id: data,
  submission_date: data,
  status,
  updated_at: null,
  energy_level: null,
  satiety_level: null,
  hydration_level: null,
  sport_type: null,
  sport_duration: null,
  nutritionist_comment: commento,
  comment_author_id: commento ? 'autrice' : null,
  comment_acknowledged: letto,
});
const SETTIMANA: RigaSettimana[] = [riga('2026-10-05', 'submitted'), riga('2026-10-06', 'submitted'), riga('2026-10-08', 'submitted')];
/** Giornate · 1 (474:1328): lunedì con commento letto, giovedì con commento da leggere. */
const SETTIMANA_COMMENTI: RigaSettimana[] = [riga('2026-10-05', 'submitted', COMMENTO, true), riga('2026-10-06', 'submitted'), riga('2026-10-08', 'submitted', COMMENTO, false)];

/** Diario della schermata Oggi · 2: colazione, pranzo e spuntini compilati, cena da scrivere. */
const DIARIO_PASTI: Diario = { ...DIARIO_VUOTO, breakfast: 'Yogurt greco, fiocchi d’avena e mirtilli', lunch: 'Insalata di farro con ceci e verdure', snacks: 'Una mela e qualche mandorla' };
/** Diario delle schermate Oggi · 3 e 4: energia Buona, sazietà 7, idratazione 2 L, camminata 30 min. */
const DIARIO_VALORI: Diario = { ...DIARIO_PASTI, dinner: 'Pesce al forno con patate', energy_level: 3, satiety_level: 7, hydration_level: 3, sport_type: 'camminata', sport_duration: '30 min' };
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
  sport_duration: '30 min',
};
const AUTRICE = { nome: 'Margherita', foto: null, iniziali: 'MC' };

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
  | 'pannelloErrore';

// Scenario "avanzamento": i blocchi cambiano da soli ogni 3 s (avanti e poi indietro) per verificare l'indicatore.
const CICLO_BLOCCHI: Blocco[] = ['pasti', 'valori', 'sport', 'commento', 'sport', 'valori', 'pasti'];
const PASSO_CICLO_MS = 3000;

function giornata(data: string, diario: Diario): GiornataLocale {
  return { id: data, data, diario, salvato: campiDaSalvare(diario), updatedAt: null, inAttesa: false, errore: null, modificatoAlle: null };
}

type Iniziale = { locale: DiarioLocale; blocco: Blocco | null; pasto: Pasto | null; settimana: RigaSettimana[]; pannello: StatoPannello | null; schermoPieno?: boolean };

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

/** Pannello finto: la giornata si apre dalla settimana con i dati di Figma (commento da leggere su giovedì, letto su lunedì). */
function pannelloFinto(data: string, righe: RigaSettimana[]): StatoPannello {
  const r = righe.find((x) => x.submission_date === data);
  const commento = r?.nutritionist_comment ? { testo: r.nutritionist_comment, nuovo: r.comment_acknowledged !== true, autore: AUTRICE } : null;
  return { data, fase: { tipo: 'pronto', giornata: giornata(data, data === '2026-10-08' ? GIORNATA_COMPLETA : GIORNATA_BREVE), commento }, modifica: null };
}

export function OggiSviluppo({ scenario }: { scenario: ScenarioOggi }) {
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
