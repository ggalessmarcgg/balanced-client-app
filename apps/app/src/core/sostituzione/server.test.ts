import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { corpoAlternative, erroreSostituzioneApp, frase, inCasaPerServer, interpretaRispostaAlternative, paragrafiSpiegazione } from './server.ts';

describe('corpo della richiesta', () => {
  it('riga_id e in_casa pulito: spazi tolti, vuoto → null, mai oltre 200 caratteri', () => {
    assert.deepEqual(corpoAlternative('r1', '  skyr, biscotti '), { riga_id: 'r1', in_casa: 'skyr, biscotti' });
    assert.deepEqual(corpoAlternative('r1', '   '), { riga_id: 'r1', in_casa: null });
    assert.equal(inCasaPerServer('a'.repeat(250))?.length, 200);
    assert.equal(inCasaPerServer('è'.repeat(201))?.length, 200);
  });
});

describe('risposta del server', () => {
  const risposta = {
    esito: 'alternative',
    partenza: { testo: 'Riso basmati · 70 g' },
    alternative: [
      { nome: 'Pasta integrale', quantita: 'Pasta integrale · 70 g', a_piacere: false, fuori_catalogo: false },
      { nome: 'Pane integrale', quantita: 'Pane integrale · 105 g · 3,5 fette', a_piacere: false, fuori_catalogo: true },
      { nome: 'Patate', quantita: 'Patate · 305 g', a_piacere: false },
      { nome: 'Quarta', quantita: 'Quarta · 1 g' },
    ],
    spiegazione: 'Sono fonti di carboidrati adatte a un pranzo con pollo e zucchine.',
    in_casa: [{ testo: 'pollo', esito: 'non_adatta', motivo: 'Il pollo è una fonte di proteine, non di carboidrati.' }, { esito: 'boh' }],
  };
  it('alternative: al massimo tre, fuori catalogo ignorato, in_casa letto', () => {
    const e = interpretaRispostaAlternative(200, risposta, 'id');
    assert.ok(e.tipo === 'ok' && e.risposta.esito === 'alternative');
    assert.equal(e.risposta.alternative.length, 3);
    assert.deepEqual(e.risposta.alternative[1], { nome: 'Pane integrale', quantita: 'Pane integrale · 105 g · 3,5 fette', aPiacere: false });
    assert.equal(e.risposta.inCasa.length, 1);
    assert.equal(e.risposta.inCasa[0]?.esito, 'non_adatta');
  });
  it('alternative vuote valgono come nessuna alternativa; non_riconosciuto; forma sconosciuta → errore riprovabile', () => {
    assert.deepEqual(interpretaRispostaAlternative(200, { esito: 'alternative', alternative: [], spiegazione: 'x' }, 'id'), { tipo: 'ok', risposta: { esito: 'nessuna_alternativa', spiegazione: 'x' } });
    assert.deepEqual(interpretaRispostaAlternative(200, { esito: 'nessuna_alternativa', spiegazione: 'Perché.' }, 'id'), { tipo: 'ok', risposta: { esito: 'nessuna_alternativa', spiegazione: 'Perché.' } });
    assert.deepEqual(interpretaRispostaAlternative(200, { esito: 'non_riconosciuto', spiegazione: null }, 'id'), { tipo: 'ok', risposta: { esito: 'non_riconosciuto' } });
    const e = interpretaRispostaAlternative(200, { esito: 'altro' }, 'id');
    assert.ok(e.tipo === 'errore' && e.errore.esito === 'riprovabile' && e.errore.codice === 'risposta_non_valida');
    const senzaCorpo = interpretaRispostaAlternative(200, null, 'id');
    assert.ok(senzaCorpo.tipo === 'errore');
  });
  it('errori: la tabella del server → stati del pannello', () => {
    const esito = (status: number, codice?: string) => {
      const e = interpretaRispostaAlternative(status, codice ? { errore: { codice, messaggio: 'm' } } : null, 'id');
      return e.tipo === 'errore' ? e.errore.esito : 'ok';
    };
    assert.equal(esito(404, 'riga_non_disponibile'), 'rigaNonDisponibile');
    assert.equal(esito(400, 'in_casa_troppo_lungo'), 'inCasaTroppoLungo');
    assert.equal(esito(502, 'sostituzione_fallita'), 'riprovabile');
    assert.equal(esito(504, 'sostituzione_timeout'), 'riprovabile');
    assert.equal(esito(503, 'catalogo_non_disponibile'), 'riprovabile');
    assert.equal(esito(503, 'piano_non_leggibile'), 'riprovabile');
    assert.equal(esito(500, 'errore_interno'), 'riprovabile');
    assert.equal(esito(401, 'token_non_valido'), 'sessione');
    assert.equal(esito(401, 'token_mancante'), 'sessione');
    assert.equal(esito(403, 'abbonamento_non_attivo'), 'nonDisponibile');
    assert.equal(esito(404, 'cliente_non_trovato'), 'nonDisponibile');
    assert.equal(esito(400, 'riga_non_valida'), 'definitivo');
    assert.equal(esito(413, 'corpo_troppo_grande'), 'definitivo');
    // Senza codice: dallo stato HTTP.
    assert.equal(esito(503), 'riprovabile');
    assert.equal(esito(401), 'sessione');
    assert.equal(esito(418), 'definitivo');
    const e = interpretaRispostaAlternative(503, { errore: { codice: 'piano_non_leggibile', messaggio: 'm' } }, 'rid');
    assert.ok(e.tipo === 'errore');
    assert.equal(e.errore.richiestaId, 'rid');
    assert.equal(e.errore.httpStatus, 503);
  });
  it('errori dell\'app: rete e tempo scaduto → Riprova, sessione assente → sessione', () => {
    assert.equal(erroreSostituzioneApp('rete', null).esito, 'rete');
    assert.equal(erroreSostituzioneApp('tempo_scaduto', 'id').esito, 'riprovabile');
    assert.equal(erroreSostituzioneApp('sessione_assente', 'id').esito, 'sessione');
  });
});

describe('paragrafi della spiegazione', () => {
  const inCasa = [
    { testo: 'pollo', esito: 'non_adatta' as const, motivo: 'Il pollo è una fonte di proteine, non di carboidrati.' },
    { testo: 'ceci', esito: 'non_adatta' as const, motivo: 'Il pollo è una fonte di proteine, non di carboidrati.' },
    { testo: 'skyr', esito: 'inserita' as const, motivo: null },
    { testo: 'xyz', esito: 'non_riconosciuta' as const, motivo: null },
  ];
  it('secondo paragrafo solo se il cliente ha scritto qualcosa, con i motivi senza doppioni', () => {
    assert.deepEqual(paragrafiSpiegazione(' Spiegazione. ', inCasa, true), { primo: 'Spiegazione.', secondo: 'Il pollo è una fonte di proteine, non di carboidrati.' });
    assert.deepEqual(paragrafiSpiegazione('Spiegazione.', inCasa, false), { primo: 'Spiegazione.', secondo: null });
    assert.deepEqual(paragrafiSpiegazione('Spiegazione.', [], true), { primo: 'Spiegazione.', secondo: null });
  });
  it('i motivi del server (minuscoli, senza punto) diventano frasi', () => {
    assert.equal(frase('il tacchino è già tra le proposte'), 'Il tacchino è già tra le proposte.');
    assert.equal(frase(' Già una frase. '), 'Già una frase.');
    assert.equal(frase(''), '');
    const voci = [
      { testo: 'tacchino', esito: 'non_adatta' as const, motivo: 'il tacchino è già tra le proposte' },
      { testo: 'yogurt', esito: 'non_adatta' as const, motivo: 'lo yogurt è un latticino' },
    ];
    assert.equal(paragrafiSpiegazione('Ok.', voci, true).secondo, 'Il tacchino è già tra le proposte. Lo yogurt è un latticino.');
  });
  it('un motivo già dentro la spiegazione non si ripete', () => {
    assert.deepEqual(paragrafiSpiegazione('Vanno bene. Il pollo è una fonte di proteine, non di carboidrati.', inCasa, true), { primo: 'Vanno bene. Il pollo è una fonte di proteine, non di carboidrati.', secondo: null });
  });
});
