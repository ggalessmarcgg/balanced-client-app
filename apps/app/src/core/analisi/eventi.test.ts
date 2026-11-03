import assert from 'node:assert/strict';
import { test } from 'node:test';

import { DIARIO_VUOTO } from '../diario/modello.ts';
import {
  analisiAttiva,
  blocchiCompilati,
  CATALOGO,
  codiceErrore,
  esitoVocale,
  fasciaAttesaLunga,
  fasciaAudio,
  fasciaTempo,
  filtraEventoInUscita,
  NOMI_EVENTI,
  RE_NOME,
  RE_VALORE,
  tipoNotifica,
  validaProprieta,
} from './eventi.ts';

const UUID = '35fb4c5b-1234-4abc-8def-0123456789ab';
/** Nomi di proprietà che non devono mai comparire nel catalogo: identificativi, dati della persona, testi, date. */
const NOMI_VIETATI = /(^|_)(id|uuid|email|nome|cognome|telefono|testo|messaggio|racconto|data|giorno|ora|peso|client|cliente|nutrizionista|token|url|ip)(_|$)/;

test('catalogo: nomi stabili in snake_case, nessun testo libero, nessun identificativo', () => {
  assert.ok(NOMI_EVENTI.length > 0);
  for (const evento of NOMI_EVENTI) {
    assert.match(evento, RE_NOME, `nome evento: ${evento}`);
    const forma = CATALOGO[evento] as Record<string, unknown>;
    for (const [proprieta, f] of Object.entries(forma)) {
      assert.match(proprieta, RE_NOME, `nome proprietà: ${evento}.${proprieta}`);
      assert.doesNotMatch(proprieta, NOMI_VIETATI, `proprietà vietata: ${evento}.${proprieta}`);
      if (f === 'booleano') continue;
      if (Array.isArray(f)) {
        assert.ok(f.length > 0 && f.length <= 40, `elenco vuoto o troppo lungo: ${evento}.${proprieta}`);
        for (const v of f) assert.match(String(v), RE_VALORE, `valore non stabile: ${evento}.${proprieta} = ${String(v)}`);
        continue;
      }
      const intero = (f as { intero?: unknown }).intero;
      assert.ok(Array.isArray(intero) && intero.length === 2 && intero.every((n) => Number.isInteger(n)) && intero[0] <= intero[1], `forma sconosciuta: ${evento}.${proprieta}`);
      assert.ok(intero[1] - intero[0] <= 100, `intervallo troppo ampio (un numero grande diventa un identificativo): ${evento}.${proprieta}`);
    }
  }
});

test('validaProprieta: accetta solo le proprietà del catalogo con i valori ammessi', () => {
  assert.deepEqual(validaProprieta('app_aperta', { da_sfondo: true }), { da_sfondo: true });
  assert.deepEqual(validaProprieta('carosello_completato', {}), {});
  assert.deepEqual(validaProprieta('consenso_ai', { risposta: 'si', dove: 'carosello' }), { risposta: 'si', dove: 'carosello' });
  assert.deepEqual(validaProprieta('diario_condiviso', { modo: 'vocale', blocchi_compilati: 4 }), { modo: 'vocale', blocchi_compilati: 4 });
  assert.deepEqual(validaProprieta('errore_chiamata', { funzione: 'compila', codice: 'http_5xx' }), { funzione: 'compila', codice: 'http_5xx' });
});

test('validaProprieta: rifiuta eventi fuori catalogo, chiavi in più o in meno, testi liberi, identificativi, numeri fuori intervallo', () => {
  assert.equal(validaProprieta('$screen', { $screen_name: 'oggi' }), null);
  assert.equal(validaProprieta('diario_letto', {}), null);
  assert.equal(validaProprieta('app_aperta', {}), null);
  assert.equal(validaProprieta('app_aperta', { da_sfondo: true, schermata: 'oggi' }), null);
  assert.equal(validaProprieta('app_aperta', { da_sfondo: 'si' }), null);
  assert.equal(validaProprieta('carosello_completato', { note: 'ho saltato la pagina 3' }), null);
  assert.equal(validaProprieta('consenso_ai', { risposta: 'forse', dove: 'carosello' }), null);
  assert.equal(validaProprieta('consenso_ai', { risposta: 'si', dove: UUID }), null);
  assert.equal(validaProprieta('consenso_ai', { risposta: 'si', dove: 'aless.marchetto6+test4@gmail.com' }), null);
  assert.equal(validaProprieta('diario_bozza_salvata', { blocchi_compilati: 5 }), null);
  assert.equal(validaProprieta('diario_bozza_salvata', { blocchi_compilati: 1.5 }), null);
  assert.equal(validaProprieta('diario_bozza_salvata', { blocchi_compilati: '2' }), null);
  assert.equal(validaProprieta('errore_chiamata', { funzione: 'compila', codice: 'http_503' }), null); // va prima ricondotto con codiceErrore
  assert.equal(validaProprieta('app_aperta', null), null);
  assert.equal(validaProprieta('app_aperta', 'da_sfondo'), null);
});

test('filtraEventoInUscita: via gli eventi fuori catalogo, le proprietà libere, il nome del telefono e le proprietà di persona', () => {
  assert.equal(filtraEventoInUscita({ event: '$screen', properties: { $screen_name: 'oggi' } }), null);
  assert.equal(filtraEventoInUscita({ event: 'Application Opened', properties: {} }), null);
  assert.equal(filtraEventoInUscita({ event: '$feature_flag_called', properties: {} }), null);
  const filtrato = filtraEventoInUscita({
    event: 'diario_condiviso',
    properties: {
      modo: 'scritto',
      blocchi_compilati: 3,
      commento: 'oggi ho mangiato pane e marmellata',
      $app_version: '1.0.0',
      $os_name: 'Android',
      $device_name: 'Pixel 9a',
      $session_id: UUID,
      $set: { email: 'x@y.it' },
    },
    $set: { email: 'x@y.it' },
    $set_once: { nome: 'A' },
  });
  assert.deepEqual(filtrato, { event: 'diario_condiviso', properties: { modo: 'scritto', blocchi_compilati: 3, $app_version: '1.0.0', $os_name: 'Android', $session_id: UUID } });
  assert.deepEqual(filtraEventoInUscita({ event: 'prova_analisi' }), { event: 'prova_analisi', properties: {} });
});

test('fasce: tempo, attesa lunga dal secondo 10, durata audio', () => {
  assert.equal(fasciaTempo(0), 'fino_a_5s');
  assert.equal(fasciaTempo(4_999), 'fino_a_5s');
  assert.equal(fasciaTempo(5_000), '5_10s');
  assert.equal(fasciaTempo(12_000), '10_20s');
  assert.equal(fasciaTempo(25_000), '20_30s');
  assert.equal(fasciaTempo(45_000), '30_60s');
  assert.equal(fasciaTempo(95_000), 'oltre_60s');
  assert.equal(fasciaAttesaLunga(9_999), null);
  assert.equal(fasciaAttesaLunga(10_000), '10_20s');
  assert.equal(fasciaAttesaLunga(70_000), 'oltre_60s');
  assert.equal(fasciaAudio(0), 'fino_a_30s');
  assert.equal(fasciaAudio(29_999), 'fino_a_30s');
  assert.equal(fasciaAudio(30_000), '30s_1min');
  assert.equal(fasciaAudio(90_000), '1_2min');
  assert.equal(fasciaAudio(180_000), '2_3min');
  assert.equal(fasciaAudio(null), 'sconosciuta');
  assert.equal(fasciaAudio(Number.NaN), 'sconosciuta');
});

test('codiceErrore, tipoNotifica, esitoVocale: tutto ricondotto agli elenchi chiusi', () => {
  assert.equal(codiceErrore('rete'), 'rete');
  assert.equal(codiceErrore('sostituzione_timeout'), 'sostituzione_timeout');
  assert.equal(codiceErrore('http_404'), 'http_4xx');
  assert.equal(codiceErrore('http_503'), 'http_5xx');
  assert.equal(codiceErrore('http_302'), 'altro');
  assert.equal(codiceErrore('codice_nuovo_del_server'), 'altro');
  assert.equal(codiceErrore(`errore ${UUID}`), 'altro');
  assert.equal(codiceErrore(undefined), 'altro');
  assert.equal(tipoNotifica('review_sent'), 'review_sent');
  assert.equal(tipoNotifica('tipo_sconosciuto'), 'altro');
  assert.equal(tipoNotifica(null), 'altro');
  assert.equal(esitoVocale('nonDisponibile'), 'non_disponibile');
  assert.equal(esitoVocale('consensoMancante'), 'consenso_mancante');
  assert.equal(esitoVocale('riprovabile'), 'riprovabile');
});

test('blocchiCompilati: quanti dei quattro blocchi hanno un valore', () => {
  assert.equal(blocchiCompilati(DIARIO_VUOTO), 0);
  assert.equal(blocchiCompilati({ ...DIARIO_VUOTO, lunch: 'pasta' }), 1);
  assert.equal(blocchiCompilati({ ...DIARIO_VUOTO, lunch: ' ', riposo: true }), 1);
  assert.equal(blocchiCompilati({ ...DIARIO_VUOTO, breakfast: 'caffè', satiety_level: 5, sport_type: 'corsa', day_comment: 'ok' }), 4);
});

test('analisiAttiva: spenta in sviluppo senza la variabile di prova e sempre senza chiave', () => {
  assert.equal(analisiAttiva({ sviluppo: true, chiave: 'phc_x', provaInSviluppo: false }), false);
  assert.equal(analisiAttiva({ sviluppo: true, chiave: 'phc_x', provaInSviluppo: true }), true);
  assert.equal(analisiAttiva({ sviluppo: false, chiave: 'phc_x', provaInSviluppo: false }), true);
  assert.equal(analisiAttiva({ sviluppo: false, chiave: undefined, provaInSviluppo: true }), false);
  assert.equal(analisiAttiva({ sviluppo: false, chiave: '', provaInSviluppo: false }), false);
});
