import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { erroreApp, interpretaRispostaTrascrizione, intestazioniTrascrizione, nuovoIdRichiesta, testiErrore } from './server.ts';

describe('server: richiesta di trascrizione', () => {
  it('intestazioni come da contratto (Bearer, audio/mp4, data, durata intera entro il limite, id ≤ 64)', () => {
    const h = intestazioniTrascrizione('tok', '2026-10-22', 44_970.6, 'x'.repeat(80));
    assert.equal(h.Authorization, 'Bearer tok');
    assert.equal(h['Content-Type'], 'audio/mp4');
    assert.equal(h['X-Diary-Date'], '2026-10-22');
    assert.equal(h['X-Audio-Duration-Ms'], '44971');
    assert.equal(h['X-Request-Id'].length, 64);
    assert.equal(intestazioniTrascrizione('tok', '2026-10-22', 190_000, 'id')['X-Audio-Duration-Ms'], '180000');
  });

  it("l'id della richiesta è corto e diverso a ogni chiamata", () => {
    const a = nuovoIdRichiesta(new Date(1_000), 0.5);
    const b = nuovoIdRichiesta(new Date(1_000), 0.25);
    assert.notEqual(a, b);
    assert.ok(a.length <= 64 && a.startsWith('app-'));
  });
});

describe('server: risposta di trascrizione', () => {
  it('200 con testo: ok, durata del fornitore se presente altrimenti quella dichiarata', () => {
    assert.deepEqual(interpretaRispostaTrascrizione(200, { testo: 'Ciao', durata_audio_ms: 45_000 }, 'r1', 44_970), { tipo: 'ok', testo: 'Ciao', durataMs: 45_000 });
    assert.deepEqual(interpretaRispostaTrascrizione(200, { testo: '' }, 'r1', 44_970), { tipo: 'ok', testo: '', durataMs: 44_970 });
  });

  it('200 senza testo: risposta non valida, riprovabile', () => {
    const e = interpretaRispostaTrascrizione(200, { ciao: 1 }, 'r1', 1);
    assert.equal(e.tipo, 'errore');
    if (e.tipo === 'errore') {
      assert.equal(e.errore.esito, 'riprovabile');
      assert.equal(e.errore.codice, 'risposta_non_valida');
    }
  });

  const codice = (status: number, codice: string) => {
    const e = interpretaRispostaTrascrizione(status, { errore: { codice, messaggio: 'm' } }, 'r1', 1);
    assert.equal(e.tipo, 'errore');
    return e.tipo === 'errore' ? e.errore : null;
  };

  it('traduce i codici del server negli esiti', () => {
    assert.equal(codice(401, 'token_non_valido')?.esito, 'sessione');
    assert.equal(codice(401, 'token_mancante')?.esito, 'sessione');
    assert.equal(codice(403, 'abbonamento_non_attivo')?.esito, 'nonDisponibile');
    assert.equal(codice(403, 'cliente_non_trovato')?.esito, 'nonDisponibile');
    assert.equal(codice(400, 'audio_troppo_lungo')?.esito, 'definitivo');
    assert.equal(codice(413, 'audio_troppo_grande')?.esito, 'definitivo');
    assert.equal(codice(400, 'data_non_valida')?.esito, 'definitivo');
    assert.equal(codice(502, 'trascrizione_fallita')?.esito, 'riprovabile');
    assert.equal(codice(504, 'trascrizione_timeout')?.esito, 'riprovabile');
    assert.equal(codice(503, 'identita_non_verificabile')?.esito, 'riprovabile');
    assert.equal(codice(500, 'errore_interno')?.esito, 'riprovabile');
    assert.equal(codice(502, 'codice_nuovo')?.esito, 'riprovabile');
    assert.equal(codice(418, 'codice_nuovo')?.esito, 'definitivo');
  });

  it('corpo non JSON: codice http_<stato> e riferimento conservato', () => {
    const e = interpretaRispostaTrascrizione(503, null, 'r9', 1);
    assert.equal(e.tipo, 'errore');
    if (e.tipo === 'errore') {
      assert.equal(e.errore.codice, 'http_503');
      assert.equal(e.errore.esito, 'riprovabile');
      assert.equal(e.errore.richiestaId, 'r9');
      assert.equal(e.errore.httpStatus, 503);
    }
  });

  it("errori nati nell'app", () => {
    assert.equal(erroreApp('rete', null).esito, 'rete');
    assert.equal(erroreApp('tempo_scaduto', 'r').esito, 'riprovabile');
    assert.equal(erroreApp('sessione_assente', null).esito, 'sessione');
    assert.equal(erroreApp('audio_assente', null).esito, 'definitivo');
  });

  it('testi per ogni esito, con il riferimento solo quando c’è un id', () => {
    assert.equal(testiErrore(erroreApp('rete', null)).riferimento, null);
    assert.match(testiErrore(codice(502, 'trascrizione_fallita')!).riferimento ?? '', /Riferimento: r1/);
    assert.match(testiErrore(codice(403, 'abbonamento_non_attivo')!).messaggio, /percorso attivo/);
    assert.match(testiErrore(codice(400, 'audio_troppo_lungo')!).corpo, /3 minuti/);
    assert.match(testiErrore(codice(401, 'token_mancante')!).messaggio, /sessione/i);
  });
});
