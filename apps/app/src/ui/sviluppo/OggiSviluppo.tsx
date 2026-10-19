import { useCallback, useEffect, useState } from 'react';

import { aggiornaDiario, diarioLocaleIniziale, dopoCondivisione, type DiarioLocale, type StatoRiga } from '@/core/diario/bozza';
import type { RigaSettimana } from '@/core/diario/letture';
import { bloccoSuccessivo, campiDaSalvare, DIARIO_VUOTO, type Blocco, type Diario, type Pasto } from '@/core/diario/modello';
import { giorniSettimana } from '@/core/diario/settimana';
import { NotificaInBasso } from '@/ui/schermate/NotificaInBasso';
import { SchermataOggi } from '@/ui/schermate/SchermataOggi';
import { INGOMBRO_BARRA_NAVIGAZIONE } from '@/ui/schermate/SchermateTrasversali';

// Pagina Oggi con dati finti per i confronti con Figma (sezione "3 · Oggi e diario"): venerdì 9 ottobre 2026 come nei
// disegni, settimana L M condivisi, M non condiviso, G condiviso, V oggi, S D futuri. Interattiva, nessuna scrittura.

const OGGI = '2026-10-09';
const CLIENT = 'finto';
const riga = (data: string, status: string): RigaSettimana => ({ id: data, submission_date: data, status, energy_level: null, satiety_level: null, hydration_level: null, sport_type: null, sport_duration: null });
const SETTIMANA: RigaSettimana[] = [riga('2026-10-05', 'submitted'), riga('2026-10-06', 'submitted'), riga('2026-10-08', 'submitted')];

/** Diario della schermata Oggi · 2: colazione, pranzo e spuntini compilati, cena da scrivere. */
const DIARIO_PASTI: Diario = { ...DIARIO_VUOTO, breakfast: 'Yogurt greco, fiocchi d’avena e mirtilli', lunch: 'Insalata di farro con ceci e verdure', snacks: 'Una mela e qualche mandorla' };
/** Diario delle schermate Oggi · 3 e 4: energia Buona, sazietà 7, idratazione 2 L, camminata 30 min. */
const DIARIO_VALORI: Diario = { ...DIARIO_PASTI, dinner: 'Pesce al forno con patate', energy_level: 3, satiety_level: 7, hydration_level: 3, sport_type: 'camminata', sport_duration: '30 min' };

export type ScenarioOggi = 'daIniziare' | 'pasti' | 'valori' | 'sport' | 'commento' | 'bozza' | 'condiviso' | 'erroreSalvataggio' | 'condivisoNotifica' | 'avanzamento' | 'valoriVuoti';

// Scenario "avanzamento": i blocchi cambiano da soli ogni 3 s (avanti e poi indietro) per verificare l'indicatore.
const CICLO_BLOCCHI: Blocco[] = ['pasti', 'valori', 'sport', 'commento', 'sport', 'valori', 'pasti'];
const PASSO_CICLO_MS = 3000;

function iniziale(scenario: ScenarioOggi): { locale: DiarioLocale; blocco: Blocco | null; pasto: Pasto | null } {
  const bozza = (diario: Diario): StatoRiga => ({ tipo: 'bozza', id: 'riga-finta', salvato: campiDaSalvare(diario) });
  switch (scenario) {
    case 'daIniziare':
      return { locale: diarioLocaleIniziale(CLIENT, OGGI, DIARIO_VUOTO, { tipo: 'assente' }), blocco: null, pasto: null };
    case 'valoriVuoti':
      return { locale: diarioLocaleIniziale(CLIENT, OGGI, DIARIO_VUOTO, { tipo: 'assente' }), blocco: 'valori', pasto: null };
    case 'avanzamento':
      return { locale: diarioLocaleIniziale(CLIENT, OGGI, DIARIO_VALORI, bozza(DIARIO_VALORI)), blocco: 'pasti', pasto: null };
    case 'pasti':
      return { locale: diarioLocaleIniziale(CLIENT, OGGI, DIARIO_PASTI, bozza(DIARIO_PASTI)), blocco: 'pasti', pasto: 'dinner' };
    case 'valori':
      return { locale: diarioLocaleIniziale(CLIENT, OGGI, DIARIO_VALORI, bozza(DIARIO_VALORI)), blocco: 'valori', pasto: null };
    case 'sport':
      return { locale: diarioLocaleIniziale(CLIENT, OGGI, DIARIO_VALORI, bozza(DIARIO_VALORI)), blocco: 'sport', pasto: null };
    case 'commento':
      return { locale: diarioLocaleIniziale(CLIENT, OGGI, DIARIO_VALORI, bozza(DIARIO_VALORI)), blocco: 'commento', pasto: null };
    case 'bozza':
    case 'erroreSalvataggio':
      return { locale: { ...diarioLocaleIniziale(CLIENT, OGGI, DIARIO_PASTI, bozza(DIARIO_PASTI)), inAttesa: scenario === 'erroreSalvataggio', errore: scenario === 'erroreSalvataggio' ? 'rete' : null }, blocco: null, pasto: null };
    case 'condiviso':
    case 'condivisoNotifica':
      return { locale: dopoCondivisione(diarioLocaleIniziale(CLIENT, OGGI, DIARIO_VALORI, bozza(DIARIO_VALORI)), 'riga-finta', '2026-10-09T19:12:00.000Z'), blocco: null, pasto: null };
  }
}

export function OggiSviluppo({ scenario }: { scenario: ScenarioOggi }) {
  const [stato] = useState(() => iniziale(scenario));
  const [locale, setLocale] = useState(stato.locale);
  const [blocco, setBlocco] = useState<Blocco | null>(stato.blocco);
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

  const sovrapposti =
    notifica === 'errore' ? (
      <NotificaInBasso tipo="errore" testo="Sei offline: le modifiche sono salvate sul telefono." sopra={INGOMBRO_BARRA_NAVIGAZIONE} onRiprova={() => setNotifica(null)} />
    ) : notifica === 'condiviso' ? (
      <NotificaInBasso tipo="conferma" testo="Giornata condivisa con la tua nutrizionista." sopra={INGOMBRO_BARRA_NAVIGAZIONE} onScomparsa={() => setNotifica(null)} />
    ) : null;

  return (
    <SchermataOggi
      nome="Giulia"
      locale={locale}
      giorni={giorniSettimana(OGGI, SETTIMANA)}
      blocco={blocco}
      inviando={false}
      onScrivi={() => setBlocco('pasti')}
      onRacconta={() => {}}
      onChiudi={() => setBlocco(null)}
      onAvanti={() => setBlocco((b) => (b ? bloccoSuccessivo(b) : null))}
      onAggiorna={aggiorna}
      onCondividi={condividi}
      pastoApertoIniziale={stato.pasto}
      sovrapposti={sovrapposti}
    />
  );
}
