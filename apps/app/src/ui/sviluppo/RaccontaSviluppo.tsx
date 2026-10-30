import { useEffect, useState } from 'react';

import { INTERVALLO_LETTURA_MS, SOGLIA_ARRESTO_MS } from '@/core/racconta/audio';
import type { StatoRacconta } from '@/core/racconta/flusso';
import type { ErroreTrascrizione } from '@/core/racconta/server';
import type { PuntoTutorial } from '@/servizi/racconta';
import type { AzioniRacconta } from '@/servizi/useRacconta';
import { PannelloConsensoAI } from '@/ui/consenso/ConsensoAI';
import { SchermataRacconta } from '@/ui/schermate/SchermataRacconta';

// "Racconta" con dati finti per i confronti con Figma (sezione 3.1 · Diario vocale: 459:643, 459:681, 459:719, 459:779,
// 459:856, 459:922, 459:1629, 459:1669, 459:1712) e per i casi senza disegno. Nessun registratore, nessuna rete: la
// registrazione finta fa avanzare timer e livello voce, gli altri stati sono fermi; i pulsanti cambiano lo stato locale.

export type ScenarioRacconta =
  | 'permesso'
  | 'permessoInRichiesta'
  | 'microfonoDisattivato'
  | 'pronto'
  | 'registrazione'
  | 'registrazioneAnimata'
  | 'registrazionePausa'
  | 'registrazioneLimite'
  | 'terminata'
  | 'tutorialPronto'
  | 'tutorialTerminata'
  | 'tutorialRacconto'
  | 'trascrizione'
  | 'racconto'
  | 'raccontoTastiera'
  | 'senzaConnessione'
  | 'nonHoCapito'
  | 'registrazioneNonRiuscita'
  | 'errore'
  | 'erroreNonDisponibile'
  | 'erroreSessione'
  | 'erroreTroppoLungo'
  | 'compilazione'
  | 'erroreCompilazione'
  | 'erroreCompilazioneRete'
  | 'erroreCompilazioneSessione'
  | 'erroreCompilazioneCondiviso';

const AUDIO = { uri: 'file:///finto/racconto-2026-10-09.m4a', durataMs: 88_000, data: '2026-10-09' };
const RACCONTO =
  'A colazione ho preso uno yogurt greco con i frutti di bosco e un caffè, a pranzo pasta al pomodoro con un’insalata. L’energia oggi è stata buona, soprattutto la mattina. Ho bevuto circa due litri d’acqua e la sera ho fatto mezz’ora di camminata. A cena pollo e verdure. Volevo dire a Margherita che nel weekend sono fuori a cena.';
const TESTO = { testo: RACCONTO, durataMs: AUDIO.durataMs, data: AUDIO.data };
const errore = (esito: ErroreTrascrizione['esito'], codice: string, httpStatus: number): ErroreTrascrizione => ({ esito, codice, messaggio: 'm', richiestaId: 'app-mh1x2y-0a1b2c3d', httpStatus });

function statoIniziale(scenario: ScenarioRacconta): StatoRacconta {
  switch (scenario) {
    case 'permesso':
      return { tipo: 'permesso', inRichiesta: false };
    case 'permessoInRichiesta':
      return { tipo: 'permesso', inRichiesta: true };
    case 'microfonoDisattivato':
      return { tipo: 'microfonoDisattivato' };
    case 'pronto':
    case 'tutorialPronto':
      return { tipo: 'pronto', avviso: 'nessuno' };
    case 'terminata':
    case 'tutorialTerminata':
      return { tipo: 'terminata', audio: AUDIO };
    case 'nonHoCapito':
      return { tipo: 'pronto', avviso: 'nonHoCapito' };
    case 'registrazioneNonRiuscita':
      return { tipo: 'pronto', avviso: 'registrazioneNonRiuscita' };
    case 'registrazione':
      return { tipo: 'registrazione', durataMs: 42_000, inPausa: false, fermando: false, livello: 0.6 };
    case 'registrazioneAnimata':
      return { tipo: 'registrazione', durataMs: 0, inPausa: false, fermando: false, livello: 0 };
    case 'registrazionePausa':
      return { tipo: 'registrazione', durataMs: 42_000, inPausa: true, fermando: false, livello: 0 };
    case 'registrazioneLimite':
      return { tipo: 'registrazione', durataMs: SOGLIA_ARRESTO_MS - 5_000, inPausa: false, fermando: false, livello: 0.6 };
    case 'trascrizione':
      return { tipo: 'trascrizione', audio: AUDIO };
    case 'racconto':
    case 'raccontoTastiera':
    case 'tutorialRacconto':
      return { tipo: 'racconto', testo: RACCONTO, durataMs: AUDIO.durataMs, data: AUDIO.data };
    case 'senzaConnessione':
      return { tipo: 'senzaConnessione', audio: AUDIO, inRiprova: false };
    case 'errore':
      return { tipo: 'errore', audio: AUDIO, errore: errore('riprovabile', 'trascrizione_fallita', 502) };
    case 'erroreNonDisponibile':
      return { tipo: 'errore', audio: null, errore: errore('nonDisponibile', 'abbonamento_non_attivo', 403) };
    case 'erroreSessione':
      return { tipo: 'errore', audio: null, errore: errore('sessione', 'token_non_valido', 401) };
    case 'erroreTroppoLungo':
      return { tipo: 'errore', audio: null, errore: errore('definitivo', 'audio_troppo_lungo', 400) };
    case 'compilazione':
      return { tipo: 'compilazione', racconto: TESTO };
    case 'erroreCompilazione':
      return { tipo: 'erroreCompilazione', racconto: TESTO, errore: errore('riprovabile', 'compilazione_timeout', 504) };
    case 'erroreCompilazioneRete':
      return { tipo: 'erroreCompilazione', racconto: TESTO, errore: { ...errore('rete', 'rete', 0), httpStatus: null, richiestaId: null } };
    case 'erroreCompilazioneSessione':
      return { tipo: 'erroreCompilazione', racconto: TESTO, errore: errore('sessione', 'token_non_valido', 401) };
    case 'erroreCompilazioneCondiviso':
      return { tipo: 'erroreCompilazione', racconto: TESTO, errore: { ...errore('definitivo', 'gia_condiviso', 0), httpStatus: null, richiestaId: null } };
  }
}

const nulla = () => {};
const PASSO_MS = INTERVALLO_LETTURA_MS;

const TUTORIAL_PER_SCENARIO: Partial<Record<ScenarioRacconta, PuntoTutorial>> = { tutorialPronto: 'pronto', tutorialTerminata: 'terminata', tutorialRacconto: 'racconto' };

/** `consensoAI`: il pannello del consenso alle funzioni AI al primo uso sopra la schermata (step 6), senza scritture. */
export function RaccontaSviluppo({ scenario, consensoAI = false }: { scenario: ScenarioRacconta; consensoAI?: boolean }) {
  const [stato, setStato] = useState<StatoRacconta>(() => statoIniziale(scenario));
  const [tutorial, setTutorial] = useState<PuntoTutorial | null>(TUTORIAL_PER_SCENARIO[scenario] ?? null);

  // Registrazione finta: il timer avanza e il livello voce finge il parlato; a 3 minuti si ferma e passa a "terminata".
  // Nello scenario "registrazione" il timer resta a 0:42 con le barrette ferme del disegno (confronto a schermo).
  const registrando = stato.tipo === 'registrazione' && !stato.inPausa && !stato.fermando && scenario !== 'registrazione';
  useEffect(() => {
    if (!registrando) return;
    const timer = setInterval(() => {
      setStato((s) => {
        if (s.tipo !== 'registrazione') return s;
        const durataMs = s.durataMs + PASSO_MS;
        if (durataMs >= SOGLIA_ARRESTO_MS) return { tipo: 'terminata', audio: { ...AUDIO, durataMs } };
        // Parlato finto: frasi di ~2 s con pause di ~1 s.
        const parla = Math.sin(durataMs / 480) > -0.3;
        return { ...s, durataMs, livello: parla ? 0.35 + 0.65 * Math.abs(Math.sin(durataMs / 170)) : 0.02 };
      });
    }, PASSO_MS);
    return () => clearInterval(timer);
  }, [registrando, scenario]);

  const azioni: AzioniRacconta = {
    consenti: () => setStato({ tipo: 'permesso', inRichiesta: true }),
    apriImpostazioni: nulla,
    avvia: () => setStato({ tipo: 'registrazione', durataMs: 0, inPausa: false, fermando: false, livello: 0 }),
    ferma: () => setStato((s) => (s.tipo === 'registrazione' ? { tipo: 'terminata', audio: { ...AUDIO, durataMs: s.durataMs } } : s)),
    invia: () => setStato((s) => (s.tipo === 'terminata' ? { tipo: 'racconto', testo: RACCONTO, durataMs: s.audio.durataMs, data: AUDIO.data } : s)),
    riprova: () =>
      setStato((s) => (s.tipo === 'errore' && s.audio ? { tipo: 'trascrizione', audio: s.audio } : s.tipo === 'erroreCompilazione' ? { tipo: 'compilazione', racconto: s.racconto } : s)),
    ricomincia: () => setStato({ tipo: 'pronto', avviso: 'nessuno' }),
    modificaTesto: (testo) => setStato((s) => (s.tipo === 'racconto' ? { ...s, testo } : s)),
    // Compilazione finta: "Preparando il tuo diario" resta a schermo (il riepilogo ha i suoi stati).
    creaDiario: () => setStato((s) => (s.tipo === 'racconto' ? { tipo: 'compilazione', racconto: { testo: s.testo, durataMs: s.durataMs, data: s.data } } : s)),
    hoCapito: () => setTutorial(null),
  };

  return (
    <SchermataRacconta
      stato={stato}
      azioni={azioni}
      tutorial={tutorial}
      onIndietro={nulla}
      onScrivi={nulla}
      onCreaDiario={azioni.creaDiario}
      raccontoAFuoco={scenario === 'raccontoTastiera'}
      livelloVoceFermo={scenario === 'registrazione' || scenario === 'registrazionePausa'}
      sovrapposti={consensoAI ? <PannelloConsensoAI aperto funzione="racconta" titolo="Racconta la tua giornata" onAccetto={nulla} onNonOra={nulla} onInformativa={nulla} /> : undefined}
    />
  );
}
