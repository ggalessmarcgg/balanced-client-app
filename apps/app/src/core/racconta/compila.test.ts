import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { DIARIO_VUOTO, type Diario } from '../diario/modello.ts';
import { bozzaPerServer, corpoCompilazione, diarioDalServer, erroreCompilazioneApp, interpretaRispostaCompilazione, testiErroreCompilazione } from './compila.ts';

const BOZZA: Diario = { ...DIARIO_VUOTO, breakfast: ' Caffè ', sport_type: 'camminata', sport_duration: '30m-1h' };

describe('compila: bozza per il server', () => {
  it('nomi dei campi del server, testi puliti, vuoti a null', () => {
    assert.deepEqual(bozzaPerServer(BOZZA), {
      colazione: 'Caffè',
      pranzo: null,
      cena: null,
      spuntini: null,
      commento: null,
      energia: null,
      sazieta: null,
      idratazione: null,
      sport_tipo: 'camminata',
      sport_durata: '30m-1h',
      riposo: false,
    });
  });

  it('"corpo-libero" del database diventa "corpo_libero"; lo sport senza durata si manda lo stesso', () => {
    const b = bozzaPerServer({ ...DIARIO_VUOTO, sport_type: 'corpo-libero' });
    assert.equal(b?.sport_tipo, 'corpo_libero');
    assert.equal(b?.sport_durata, null);
  });

  it('"oggi riposo" va al server (nel database non esiste) e svuota lo sport', () => {
    const b = bozzaPerServer({ ...DIARIO_VUOTO, riposo: true, sport_type: 'corsa', sport_duration: '<30m' });
    assert.equal(b?.riposo, true);
    assert.equal(b?.sport_tipo, null);
    assert.equal(b?.sport_durata, null);
  });

  it('la durata storica "<20m" non è tra quelle del server: vuota', () => {
    assert.equal(bozzaPerServer({ ...DIARIO_VUOTO, sport_type: 'corsa', sport_duration: '<20m' })?.sport_durata, null);
  });

  it('una bozza senza nulla vale null; senza diario in memoria la bozza è null', () => {
    assert.equal(bozzaPerServer(DIARIO_VUOTO), null);
    assert.equal(bozzaPerServer({ ...DIARIO_VUOTO, breakfast: '   ' }), null);
    assert.deepEqual(corpoCompilazione('2026-10-23', 'Oggi ho corso', null), { data: '2026-10-23', racconto: 'Oggi ho corso', bozza: null });
  });

  it('il racconto non supera i 10 000 caratteri del server', () => {
    assert.equal(corpoCompilazione('2026-10-23', 'a'.repeat(12_000), null).racconto.length, 10_000);
  });
});

describe('compila: diario restituito', () => {
  const RISPOSTA = {
    colazione: 'caffè e 2 biscotti',
    pranzo: 'insalata con 120 g di pollo',
    cena: null,
    spuntini: null,
    commento: null,
    energia: null,
    sazieta: 8,
    idratazione: 3,
    sport_tipo: 'corsa',
    sport_durata: '<30m',
    riposo: false,
  };

  it('nel modello dell\'app, vuoti come stringhe vuote', () => {
    assert.deepEqual(diarioDalServer(RISPOSTA), {
      breakfast: 'caffè e 2 biscotti',
      lunch: 'insalata con 120 g di pollo',
      dinner: '',
      snacks: '',
      day_comment: '',
      energy_level: null,
      satiety_level: 8,
      hydration_level: 3,
      sport_type: 'corsa',
      sport_duration: '<30m',
      riposo: false,
    });
  });

  it('"corpo_libero" torna "corpo-libero" (il formato del database)', () => {
    assert.equal(diarioDalServer({ ...RISPOSTA, sport_tipo: 'corpo_libero' })?.sport_type, 'corpo-libero');
  });

  it('valori fuori formato diventano vuoti (mai un valore che CRM e trigger non conoscono)', () => {
    const d = diarioDalServer({ ...RISPOSTA, energia: 7, sazieta: 0, idratazione: 2.5, sport_tipo: 'yoga', sport_durata: '2h', colazione: 42 });
    assert.equal(d?.energy_level, null);
    assert.equal(d?.satiety_level, null);
    assert.equal(d?.hydration_level, null);
    assert.equal(d?.sport_type, null);
    assert.equal(d?.sport_duration, null);
    assert.equal(d?.breakfast, '');
  });

  it('con "riposo" lo sport resta vuoto', () => {
    const d = diarioDalServer({ ...RISPOSTA, riposo: true });
    assert.equal(d?.riposo, true);
    assert.equal(d?.sport_type, null);
    assert.equal(d?.sport_duration, null);
  });

  it('il solo tipo senza durata si tiene (il cliente la completa nel riepilogo)', () => {
    const d = diarioDalServer({ ...RISPOSTA, sport_durata: null });
    assert.equal(d?.sport_type, 'corsa');
    assert.equal(d?.sport_duration, null);
  });
});

describe('compila: risposta del server', () => {
  it('200 diario → diario; 200 non_ho_capito → nonHoCapito', () => {
    const ok = interpretaRispostaCompilazione(200, { esito: 'diario', diario: { colazione: 'yogurt', riposo: false } }, 'r');
    assert.equal(ok.tipo, 'diario');
    assert.equal(ok.tipo === 'diario' && ok.diario.breakfast, 'yogurt');
    assert.deepEqual(interpretaRispostaCompilazione(200, { esito: 'non_ho_capito', diario: null }, 'r'), { tipo: 'nonHoCapito' });
  });

  it('200 senza diario riconoscibile → errore riprovabile', () => {
    const e = interpretaRispostaCompilazione(200, { esito: 'diario', diario: null }, 'r');
    assert.equal(e.tipo === 'errore' && e.errore.esito, 'riprovabile');
    assert.equal(e.tipo === 'errore' && e.errore.codice, 'risposta_non_valida');
  });

  it('502/504 riprovabili; 401 sessione; 403 percorso non attivo; 400 definitivo', () => {
    const esito = (status: number, codice: string) => {
      const e = interpretaRispostaCompilazione(status, { errore: { codice, messaggio: 'm' } }, 'r');
      return e.tipo === 'errore' ? e.errore.esito : null;
    };
    assert.equal(esito(502, 'compilazione_fallita'), 'riprovabile');
    assert.equal(esito(504, 'compilazione_timeout'), 'riprovabile');
    assert.equal(esito(401, 'token_non_valido'), 'sessione');
    assert.equal(esito(403, 'abbonamento_non_attivo'), 'nonDisponibile');
    assert.equal(esito(400, 'bozza_non_valida'), 'definitivo');
    assert.equal(esito(503, 'sconosciuto'), 'riprovabile');
  });

  it('testi della 12: "Riprova" solo con gli errori riprovabili o senza rete', () => {
    assert.equal(testiErroreCompilazione(erroreCompilazioneApp('tempo_scaduto', 'r')).messaggio, 'Qualcosa non ha funzionato nel preparare il diario. Il tuo racconto è salvato.');
    assert.equal(testiErroreCompilazione(erroreCompilazioneApp('tempo_scaduto', 'r')).riprova, true);
    assert.equal(testiErroreCompilazione(erroreCompilazioneApp('rete', null)).riprova, true);
    assert.equal(testiErroreCompilazione(erroreCompilazioneApp('gia_condiviso', null)).riprova, false);
    assert.equal(testiErroreCompilazione(erroreCompilazioneApp('sessione_assente', 'r')).riprova, false);
  });
});
