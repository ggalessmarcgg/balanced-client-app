import { useState } from 'react';

import { DIARIO_VUOTO, type Diario } from '@/core/diario/modello';
import { SchermataRiepilogo } from '@/ui/schermate/SchermataRiepilogo';

// Riepilogo "Modifica e invia" di Racconta con dati finti (Figma 747:7517 e Tutorial · 6 758:7773): nessuna rete, le
// modifiche cambiano lo stato locale, "Invia" mostra il caricamento e poi la Notifica breve d'errore (prova del caso).

export type ScenarioRiepilogo = 'figma' | 'compilato' | 'tutorial' | 'tastiera' | 'riposo' | 'vuoto' | 'erroreInvio';

/** Il diario del disegno: pasti vuoti, energia Buona, sazietà 7, 2 L, camminata 30 min – 1 ora, il commento. */
const DIARIO_FIGMA: Diario = {
  ...DIARIO_VUOTO,
  energy_level: 3,
  satiety_level: 7,
  hydration_level: 3,
  sport_type: 'camminata',
  sport_duration: '30m-1h',
  day_comment: 'Giornata tranquilla, un po’ stanca la sera.',
};

/** Un diario compilato da un racconto vero (caso del collaudo): pasti scritti, valori e commento. */
const DIARIO_COMPILATO: Diario = {
  ...DIARIO_FIGMA,
  breakfast: 'yogurt greco con i frutti di bosco e un caffè',
  lunch: 'pasta al pomodoro con un’insalata',
  dinner: 'pollo e verdure',
  snacks: '',
  energy_level: 3,
  satiety_level: null,
  hydration_level: 3,
  day_comment: 'L’energia oggi è stata buona, soprattutto la mattina. Nel weekend sono fuori a cena.',
};

function diarioIniziale(scenario: ScenarioRiepilogo): Diario {
  switch (scenario) {
    case 'figma':
    case 'tutorial':
      return DIARIO_FIGMA;
    case 'riposo':
      return { ...DIARIO_COMPILATO, sport_type: null, sport_duration: null, riposo: true };
    case 'vuoto':
      return DIARIO_VUOTO;
    default:
      return DIARIO_COMPILATO;
  }
}

export function RiepilogoSviluppo({ scenario }: { scenario: ScenarioRiepilogo }) {
  const [diario, setDiario] = useState(() => diarioIniziale(scenario));
  const [tutorial, setTutorial] = useState(scenario === 'tutorial');
  const [inviando, setInviando] = useState(false);
  const [errore, setErrore] = useState(scenario === 'erroreInvio');
  const condividi = () => {
    setInviando(true);
    setTimeout(() => {
      setInviando(false);
      setErrore(true);
    }, 1500);
  };
  return (
    <SchermataRiepilogo
      diario={diario}
      inviando={inviando}
      tutorial={tutorial}
      onAggiorna={setDiario}
      onCondividi={condividi}
      onChiudi={() => {}}
      onHoCapito={() => setTutorial(false)}
      commentoAFuoco={scenario === 'tastiera'}
      notifica={errore ? { tipo: 'errore', testo: 'Sei offline: le modifiche sono salvate sul telefono.', onRiprova: () => setErrore(false) } : undefined}
    />
  );
}
