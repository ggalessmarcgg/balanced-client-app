import { useEffect, useState } from 'react';

import { aggiungiLivello, SOGLIA_ARRESTO_MS } from '@/core/racconta/audio';
import type { StatoRacconta } from '@/core/racconta/flusso';
import type { ErroreTrascrizione } from '@/core/racconta/server';
import type { AzioniRacconta } from '@/servizi/useRacconta';
import { NotificaInBasso } from '@/ui/schermate/NotificaInBasso';
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
  | 'registrazionePausa'
  | 'registrazioneLimite'
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
  | 'creaDiarioNotifica';

const AUDIO = { uri: 'file:///finto/racconto-2026-10-09.m4a', durataMs: 88_000, data: '2026-10-09' };
const RACCONTO =
  'A colazione ho preso uno yogurt greco con i frutti di bosco e un caffè, a pranzo pasta al pomodoro con un’insalata. L’energia oggi è stata buona, soprattutto la mattina. Ho bevuto circa due litri d’acqua e la sera ho fatto mezz’ora di camminata. A cena pollo e verdure. Volevo dire a Margherita che nel weekend sono fuori a cena.';
/** Altezze del "Livello voce" di Figma (6, 12, 16, 8, 5, 11, 14, 7) espresse come livelli 0–1. */
const LIVELLI_FIGMA = [6, 12, 16, 8, 5, 11, 14, 7].map((h) => (h - 4) / 12);
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
      return { tipo: 'pronto', avviso: 'nessuno' };
    case 'nonHoCapito':
      return { tipo: 'pronto', avviso: 'nonHoCapito' };
    case 'registrazioneNonRiuscita':
      return { tipo: 'pronto', avviso: 'registrazioneNonRiuscita' };
    case 'registrazione':
      return { tipo: 'registrazione', durataMs: 42_000, inPausa: false, fermando: false, livelli: LIVELLI_FIGMA };
    case 'registrazionePausa':
      return { tipo: 'registrazione', durataMs: 42_000, inPausa: true, fermando: false, livelli: LIVELLI_FIGMA };
    case 'registrazioneLimite':
      return { tipo: 'registrazione', durataMs: SOGLIA_ARRESTO_MS - 5_000, inPausa: false, fermando: false, livelli: LIVELLI_FIGMA };
    case 'trascrizione':
      return { tipo: 'trascrizione', audio: AUDIO };
    case 'racconto':
    case 'raccontoTastiera':
    case 'creaDiarioNotifica':
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
  }
}

const nulla = () => {};
const PASSO_MS = 250;

export function RaccontaSviluppo({ scenario }: { scenario: ScenarioRacconta }) {
  const [stato, setStato] = useState<StatoRacconta>(() => statoIniziale(scenario));
  const [notifica, setNotifica] = useState(scenario === 'creaDiarioNotifica' ? 1 : 0);

  // Registrazione finta: il timer avanza e il livello voce cambia; a 3 minuti si ferma e passa alla trascrizione.
  // Nello scenario "registrazione" il timer resta a 0:42 con le barrette di Figma (confronto a schermo); negli altri avanza.
  const registrando = stato.tipo === 'registrazione' && !stato.inPausa && !stato.fermando && scenario !== 'registrazione';
  useEffect(() => {
    if (!registrando) return;
    const timer = setInterval(() => {
      setStato((s) => {
        if (s.tipo !== 'registrazione') return s;
        const durataMs = s.durataMs + PASSO_MS;
        if (durataMs >= SOGLIA_ARRESTO_MS) return { tipo: 'trascrizione', audio: { ...AUDIO, durataMs } };
        return { ...s, durataMs, livelli: aggiungiLivello(s.livelli, 0.2 + 0.8 * Math.abs(Math.sin(durataMs / 300))) };
      });
    }, PASSO_MS);
    return () => clearInterval(timer);
  }, [registrando, scenario]);

  const azioni: AzioniRacconta = {
    consenti: () => setStato({ tipo: 'permesso', inRichiesta: true }),
    apriImpostazioni: nulla,
    avvia: () => setStato({ tipo: 'registrazione', durataMs: 0, inPausa: false, fermando: false, livelli: [] }),
    ferma: () => setStato((s) => (s.tipo === 'registrazione' ? { tipo: 'racconto', testo: RACCONTO, durataMs: s.durataMs, data: AUDIO.data } : s)),
    riprova: () => setStato((s) => (s.tipo === 'errore' && s.audio ? { tipo: 'trascrizione', audio: s.audio } : s)),
    ricomincia: () => setStato({ tipo: 'pronto', avviso: 'nessuno' }),
    modificaTesto: (testo) => setStato((s) => (s.tipo === 'racconto' ? { ...s, testo } : s)),
  };

  return (
    <SchermataRacconta
      stato={stato}
      azioni={azioni}
      onIndietro={nulla}
      onScrivi={nulla}
      onCreaDiario={() => setNotifica((n) => n + 1)}
      raccontoAFuoco={scenario === 'raccontoTastiera'}
      sovrapposti={notifica > 0 ? <NotificaInBasso key={notifica} tipo="conferma" testo="La creazione del diario dal racconto arriva a breve." onScomparsa={() => setNotifica(0)} /> : undefined}
    />
  );
}
