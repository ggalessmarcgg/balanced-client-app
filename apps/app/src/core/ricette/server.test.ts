import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { campoPerServer, corpoIdee, corpoRicetta, erroreRicetteApp, interpretaRispostaIdee, interpretaRispostaRicetta, leggiRicetta } from './server.ts';

const idea = { titolo: 'Bowl di riso, salmone e zucchine', descrizione: 'Riso con salmone scottato.', tipo: 'individuale', allergeni: ['pesce'], regime: 'pescetariano' };
const stima = { kcal: 770, carboidrati: 87.2, proteine: 57.9, grassi: 19.6, fonte: 'catalogo' };

describe('corpi delle richieste', () => {
  it('idee: pasto_id e campo pulito (spazi tolti, vuoto → null, mai oltre 200 caratteri)', () => {
    assert.deepEqual(corpoIdee('p1', '  salmone, zucchine '), { pasto_id: 'p1', campo: 'salmone, zucchine' });
    assert.deepEqual(corpoIdee('p1', '   '), { pasto_id: 'p1', campo: null });
    assert.equal(campoPerServer('a'.repeat(250))?.length, 200);
    assert.equal(campoPerServer('è'.repeat(201))?.length, 200);
  });
  it('ricetta: identificativo, stima e idea rimandati tali e quali', () => {
    const corpo = corpoRicetta('p1', 'r-1', stima, { ...idea, tipo: 'individuale' }, '');
    assert.deepEqual(corpo, { pasto_id: 'p1', richiesta_id: 'r-1', stima, idea: { ...idea, tipo: 'individuale' }, campo: null });
  });
});

describe('risposta delle idee', () => {
  const risposta = { esito: 'idee', richiesta_id: '12345678-1234-4123-8123-123456789012', stima, idee: [idea, { ...idea, titolo: 'Seconda', tipo: 'piu_porzioni' }, { ...idea, titolo: 'Terza' }, { ...idea, titolo: 'Quarta' }], frase_ingredienti: null, versione_istruzioni: 'v0.4 (28/10/2026)' };
  it('al massimo tre idee, stima e identificativo letti, frase e versione', () => {
    const e = interpretaRispostaIdee(200, risposta, 'app-1');
    assert.ok(e.tipo === 'ok' && e.risposta.esito === 'idee');
    assert.equal(e.risposta.idee.length, 3);
    assert.equal(e.risposta.idee[1]?.tipo, 'piu_porzioni');
    assert.equal(e.risposta.richiestaId, '12345678-1234-4123-8123-123456789012');
    assert.deepEqual(e.risposta.stima, stima);
    assert.equal(e.risposta.fraseIngredienti, null);
    assert.equal(e.risposta.versioneIstruzioni, 'v0.4 (28/10/2026)');
    const conFrase = interpretaRispostaIdee(200, { ...risposta, frase_ingredienti: ' Non abbiamo usato il pane. ' }, 'app-1');
    assert.ok(conFrase.tipo === 'ok' && conFrase.risposta.esito === 'idee' && conFrase.risposta.fraseIngredienti === 'Non abbiamo usato il pane.');
  });
  it('idee vuote valgono come nessuna idea; tipo sconosciuto → individuale; senza stima o identificativo → errore riprovabile', () => {
    assert.deepEqual(interpretaRispostaIdee(200, { ...risposta, idee: [] }, 'id'), { tipo: 'ok', risposta: { esito: 'nessuna_idea' } });
    assert.deepEqual(interpretaRispostaIdee(200, { esito: 'nessuna_idea', idee: [] }, 'id'), { tipo: 'ok', risposta: { esito: 'nessuna_idea' } });
    const strano = interpretaRispostaIdee(200, { ...risposta, idee: [{ ...idea, tipo: 'altro' }] }, 'id');
    assert.ok(strano.tipo === 'ok' && strano.risposta.esito === 'idee' && strano.risposta.idee[0]?.tipo === 'individuale');
    const senzaStima = interpretaRispostaIdee(200, { ...risposta, stima: null }, 'id');
    assert.ok(senzaStima.tipo === 'errore' && senzaStima.errore.codice === 'risposta_non_valida' && senzaStima.errore.esito === 'riprovabile');
    assert.ok(interpretaRispostaIdee(200, { esito: 'altro' }, 'id').tipo === 'errore');
    assert.ok(interpretaRispostaIdee(200, null, 'id').tipo === 'errore');
  });
});

describe('risposta della ricetta', () => {
  const ricetta = {
    titolo: 'Bowl di riso basmati, salmone e zucchine',
    tempo_minuti: 25,
    riposo_minuti: null,
    tipo: 'individuale',
    ingredienti: [{ nome: 'Riso basmati', quantita: '130 g' }, { nome: 'Sale e pepe', quantita: 'q.b.' }, { nome: '' }],
    porzioni: null,
    preparazione: ['Cuoci il riso.', 'Scotta il salmone.', ''],
    spiegazione: 'Riso, salmone e zucchine insieme ti danno energia che dura.',
    allergeni: ['pesce'],
    regime: 'pescetariano',
  };
  it('ricetta letta con ingredienti e paragrafi validi; la forma grezza resta intera per il salvataggio', () => {
    const e = interpretaRispostaRicetta(200, { esito: 'ricetta', richiesta_id: 'r-1', ricetta, versione_istruzioni: 'v0.4' }, 'id');
    assert.ok(e.tipo === 'ok');
    const r = e.risposta.ricetta;
    assert.equal(r.ingredienti.length, 2);
    assert.equal(r.preparazione.length, 2);
    assert.equal(r.tempoMinuti, 25);
    assert.equal(r.riposoMinuti, null);
    assert.equal(r.porzioni, null);
    assert.deepEqual(r.grezza, ricetta);
    assert.equal(e.risposta.richiestaId, 'r-1');
  });
  it('più porzioni con la riga della porzione; tempo e riposo fuori formato → null; senza titolo → errore riprovabile', () => {
    const r = leggiRicetta({ ...ricetta, tipo: 'piu_porzioni', tempo_minuti: '30', riposo_minuti: 180, porzioni: { numero: 8, la_tua_porzione: 'una fetta, circa 110 g' } });
    assert.ok(r);
    assert.equal(r.tipo, 'piu_porzioni');
    assert.equal(r.tempoMinuti, null);
    assert.equal(r.riposoMinuti, 180);
    assert.deepEqual(r.porzioni, { numero: 8, laTuaPorzione: 'una fetta, circa 110 g' });
    assert.equal(leggiRicetta({ ...ricetta, titolo: '' }), null);
    assert.equal(leggiRicetta({ ...ricetta, ingredienti: [], preparazione: [] }), null);
    const e = interpretaRispostaRicetta(200, { esito: 'ricetta', ricetta: { titolo: '' } }, 'id');
    assert.ok(e.tipo === 'errore' && e.errore.esito === 'riprovabile');
  });
});

describe('errori: la tabella del server → esiti dell\'app', () => {
  const esito = (status: number, codice?: string) => {
    const e = interpretaRispostaRicetta(status, codice ? { errore: { codice, messaggio: 'm' } } : null, 'id');
    return e.tipo === 'errore' ? e.errore.esito : 'ok';
  };
  it('ogni codice stabile ha il suo esito', () => {
    assert.equal(esito(404, 'pasto_non_disponibile'), 'pastoNonDisponibile');
    assert.equal(esito(400, 'stima_non_plausibile'), 'ripetiIdee');
    assert.equal(esito(400, 'idea_non_ammessa'), 'ripetiIdee');
    assert.equal(esito(400, 'campo_troppo_lungo'), 'campoTroppoLungo');
    assert.equal(esito(502, 'ricetta_non_disponibile'), 'riprovabile');
    assert.equal(esito(502, 'ricette_fallita'), 'riprovabile');
    assert.equal(esito(504, 'ricette_timeout'), 'riprovabile');
    assert.equal(esito(503, 'catalogo_non_disponibile'), 'riprovabile');
    assert.equal(esito(503, 'piano_non_leggibile'), 'riprovabile');
    assert.equal(esito(500, 'errore_interno'), 'riprovabile');
    assert.equal(esito(401, 'token_non_valido'), 'sessione');
    assert.equal(esito(401, 'token_mancante'), 'sessione');
    assert.equal(esito(403, 'abbonamento_non_attivo'), 'nonDisponibile');
    assert.equal(esito(404, 'cliente_non_trovato'), 'nonDisponibile');
    assert.equal(esito(400, 'richiesta_non_valida'), 'definitivo');
    assert.equal(esito(400, 'idea_mancante'), 'definitivo');
    assert.equal(esito(413, 'corpo_troppo_grande'), 'definitivo');
  });
  it('codici ignoti: per stato HTTP; errori dell\'app', () => {
    assert.equal(esito(500, 'nuovo_codice'), 'riprovabile');
    assert.equal(esito(401, 'nuovo_codice'), 'sessione');
    assert.equal(esito(400, 'nuovo_codice'), 'definitivo');
    assert.equal(esito(502), 'riprovabile');
    assert.equal(erroreRicetteApp('rete', null).esito, 'rete');
    assert.equal(erroreRicetteApp('tempo_scaduto', null).esito, 'riprovabile');
    assert.equal(erroreRicetteApp('sessione_assente', null).esito, 'sessione');
    const idee = interpretaRispostaIdee(404, { errore: { codice: 'pasto_non_disponibile', messaggio: 'm' } }, 'id');
    assert.ok(idee.tipo === 'errore' && idee.errore.esito === 'pastoNonDisponibile' && idee.errore.httpStatus === 404);
  });
});
