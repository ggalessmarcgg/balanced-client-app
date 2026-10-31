import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { corpoEliminazione, erroreEliminazioneApp, interpretaRispostaEliminazione, MESSAGGI_ELIMINAZIONE, presentaErrore, type ErroreEliminazione } from './eliminazione.ts';

const errore = (esito: ErroreEliminazione['esito'], codice = esito): ErroreEliminazione => ({ esito, codice, messaggio: 'm', richiestaId: 'app-1', httpStatus: null });

describe('corpoEliminazione', () => {
  it('password, versione e piattaforma così come sono', () => {
    assert.deepEqual(corpoEliminazione('segreta', '0.1.0', 'android'), { password: 'segreta', versione_app: '0.1.0', piattaforma: 'android' });
    assert.deepEqual(corpoEliminazione('segreta', null, 'ios'), { password: 'segreta', versione_app: null, piattaforma: 'ios' });
  });
});

describe('interpretaRispostaEliminazione', () => {
  it('200 registrata con identificativo e scadenza', () => {
    assert.deepEqual(interpretaRispostaEliminazione(200, { esito: 'registrata', richiesta_id: 'r1', scadenza: '2026-11-30T14:05:12.000Z', giorni: 30 }, 'app-1'), {
      tipo: 'registrata',
      richiestaId: 'r1',
      scadenza: '2026-11-30T14:05:12.000Z',
      giaRegistrata: false,
    });
  });
  it('200 senza esito riconosciuto → riprovabile', () => {
    const e = interpretaRispostaEliminazione(200, { ok: true }, 'app-1');
    assert.equal(e.tipo, 'errore');
    if (e.tipo === 'errore') assert.deepEqual([e.errore.esito, e.errore.codice], ['riprovabile', 'risposta_non_valida']);
  });
  it('409 gia_registrata vale come registrata (nessuna seconda richiesta, stessa conferma)', () => {
    assert.deepEqual(interpretaRispostaEliminazione(409, { errore: { codice: 'gia_registrata', messaggio: 'già registrata il 2026-10-20' } }, 'app-1'), { tipo: 'registrata', richiestaId: null, scadenza: null, giaRegistrata: true });
  });
  it('codici stabili del server → esiti del pannello', () => {
    const casi: [number, string, ErroreEliminazione['esito']][] = [
      [403, 'password_errata', 'passwordErrata'],
      [429, 'troppi_tentativi', 'troppiTentativi'],
      [401, 'token_non_valido', 'sessione'],
      [401, 'token_mancante', 'sessione'],
      [403, 'cliente_non_trovato', 'nonDisponibile'],
      [503, 'servizio_non_disponibile', 'riprovabile'],
      [503, 'identita_non_verificabile', 'riprovabile'],
      [504, 'eliminazione_timeout', 'riprovabile'],
      [500, 'errore_interno', 'riprovabile'],
      [400, 'password_mancante', 'definitivo'],
      [400, 'richiesta_non_valida', 'definitivo'],
    ];
    for (const [status, codice, esito] of casi) {
      const e = interpretaRispostaEliminazione(status, { errore: { codice, messaggio: 'x' } }, 'app-1');
      assert.equal(e.tipo, 'errore', codice);
      if (e.tipo === 'errore') {
        assert.equal(e.errore.esito, esito, codice);
        assert.equal(e.errore.codice, codice);
        assert.equal(e.errore.httpStatus, status);
        assert.equal(e.errore.richiestaId, 'app-1');
      }
    }
  });
  it('codice sconosciuto: dallo stato HTTP (401 sessione, 429 troppi tentativi, 5xx riprovabile, altri definitivo); corpo non JSON', () => {
    const esito = (status: number, corpo: unknown = null) => {
      const e = interpretaRispostaEliminazione(status, corpo, null);
      return e.tipo === 'errore' ? [e.errore.esito, e.errore.codice] : ['registrata'];
    };
    assert.deepEqual(esito(401), ['sessione', 'http_401']);
    assert.deepEqual(esito(429), ['troppiTentativi', 'http_429']);
    assert.deepEqual(esito(502, 'bad gateway'), ['riprovabile', 'http_502']);
    assert.deepEqual(esito(418, { errore: { codice: 'teiera' } }), ['definitivo', 'teiera']);
    // Un 409 con un altro codice non è "già registrata".
    assert.deepEqual(esito(409, { errore: { codice: 'altro' } }), ['definitivo', 'altro']);
  });
});

describe('erroreEliminazioneApp e presentaErrore', () => {
  it("errori nati nell'app", () => {
    assert.equal(erroreEliminazioneApp('rete', 'app-1').esito, 'rete');
    assert.equal(erroreEliminazioneApp('tempo_scaduto', 'app-1').esito, 'riprovabile');
    assert.equal(erroreEliminazioneApp('sessione_assente', null).esito, 'sessione');
  });
  it('password errata e troppi tentativi restano nel campo; rete e servizio in notifica con Riprova; il resto in notifica senza Riprova', () => {
    assert.deepEqual(presentaErrore(errore('passwordErrata')), { dove: 'campo', testo: MESSAGGI_ELIMINAZIONE.passwordErrata });
    assert.deepEqual(presentaErrore(errore('troppiTentativi')), { dove: 'campo', testo: MESSAGGI_ELIMINAZIONE.troppiTentativi });
    assert.deepEqual(presentaErrore(errore('rete')), { dove: 'notifica', testo: MESSAGGI_ELIMINAZIONE.rete, riprova: true });
    assert.deepEqual(presentaErrore(errore('riprovabile')), { dove: 'notifica', testo: MESSAGGI_ELIMINAZIONE.riprovabile, riprova: true });
    assert.deepEqual(presentaErrore(errore('sessione')), { dove: 'notifica', testo: MESSAGGI_ELIMINAZIONE.sessione, riprova: false });
    assert.deepEqual(presentaErrore(errore('nonDisponibile')), { dove: 'notifica', testo: MESSAGGI_ELIMINAZIONE.nonDisponibile, riprova: false });
    assert.deepEqual(presentaErrore(errore('definitivo')), { dove: 'notifica', testo: MESSAGGI_ELIMINAZIONE.definitivo, riprova: false });
  });
});
