import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { andamentoSettimana, ETICHETTE_ASSE, gradinoDurata, gradinoLivello, type RigaPerAndamento } from './andamento.ts';
import { DIARIO_VUOTO, type Diario } from './modello.ts';

const riga = (submission_date: string, status: string, valori: Partial<Pick<RigaPerAndamento, 'energy_level' | 'hydration_level' | 'sport_type' | 'sport_duration'>> = {}): RigaPerAndamento => ({
  submission_date,
  status,
  energy_level: null,
  hydration_level: null,
  sport_type: null,
  sport_duration: null,
  ...valori,
});
const descrivi = (g: { iniziale: string; colonna: { tipo: string; gradino?: number } }) => `${g.iniziale}:${g.colonna.tipo}${'gradino' in g.colonna ? g.colonna.gradino : ''}`;

describe('gradini delle tre categorie', () => {
  it('energia e idratazione 1–4 → gradino uguale al livello; fuori intervallo → nessuno', () => {
    assert.equal(gradinoLivello(1), 1);
    assert.equal(gradinoLivello(4), 4);
    assert.equal(gradinoLivello(0), null);
    assert.equal(gradinoLivello(5), null);
    assert.equal(gradinoLivello(null), null);
  });
  it('sport: "<20m" (storico) e "<30m" sul primo gradino, poi 30m-1h, 1h-1.5h, >1.5h; altro → nessuno', () => {
    assert.equal(gradinoDurata('<20m'), 1);
    assert.equal(gradinoDurata('<30m'), 1);
    assert.equal(gradinoDurata('30m-1h'), 2);
    assert.equal(gradinoDurata('1h-1.5h'), 3);
    assert.equal(gradinoDurata('>1.5h'), 4);
    assert.equal(gradinoDurata('45 min'), null);
    assert.equal(gradinoDurata(null), null);
  });
  it('quattro etichette dell\'asse per categoria, dal gradino più alto al più basso', () => {
    assert.deepEqual([...ETICHETTE_ASSE.energia], ['4', '3', '2', '1']);
    assert.deepEqual([...ETICHETTE_ASSE.idratazione], ['+2,5L', '2L', '1,5L', '<1L']);
    assert.deepEqual([...ETICHETTE_ASSE.sport], ['>1,5h', '1–1,5h', "30'–1h", "<30'"]);
  });
});

describe('andamentoSettimana (Figma Andamento · 1, 479:1908)', () => {
  // Venerdì 9 ottobre 2026: L e M condivisi con valori, M non condiviso, G condiviso, V oggi in bozza, S e D futuri.
  const righe = [
    riga('2026-10-05', 'submitted', { energy_level: 3, hydration_level: 3, sport_type: null, sport_duration: null }),
    riga('2026-10-06', 'submitted', { energy_level: 4, hydration_level: 3, sport_type: 'camminata', sport_duration: '30m-1h' }),
    riga('2026-10-07', 'draft', { energy_level: 2 }), // bozza non condivisa: non conta
    riga('2026-10-08', 'submitted', { energy_level: 3, hydration_level: 4, sport_type: 'corsa', sport_duration: '<30m' }),
    riga('2026-09-30', 'submitted', { energy_level: 1 }), // settimana scorsa: ignorata
  ];
  const bozzaOggi: Diario = { ...DIARIO_VUOTO, energy_level: 4, hydration_level: 4, sport_type: 'pesi', sport_duration: '>1.5h' };

  it('stati delle colonne: valore, non condiviso, oggi da condividere, futuri vuoti; riposo nello sport', () => {
    const a = andamentoSettimana('2026-10-09', righe, { diario: bozzaOggi, condiviso: false });
    assert.equal(a.conValori, true);
    assert.deepEqual(a.categorie.energia.map(descrivi), ['L:valore3', 'M:valore4', 'M:nonCondiviso', 'G:valore3', 'V:daCondividere4', 'S:vuoto', 'D:vuoto']);
    assert.deepEqual(a.categorie.idratazione.map(descrivi), ['L:valore3', 'M:valore3', 'M:nonCondiviso', 'G:valore4', 'V:daCondividere4', 'S:vuoto', 'D:vuoto']);
    assert.deepEqual(a.categorie.sport.map(descrivi), ['L:riposo', 'M:valore2', 'M:nonCondiviso', 'G:valore1', 'V:daCondividere4', 'S:vuoto', 'D:vuoto']);
    assert.equal(a.categorie.energia[0]?.data, '2026-10-05');
    assert.deepEqual(a.categorie.energia.map((g) => g.futuro), [false, false, false, false, false, true, true]);
    assert.deepEqual(a.durateNonRiconosciute, []);
  });

  it('oggi condiviso: colonna piena dalla riga della settimana (aggiornata dal pannello), non dalla bozza', () => {
    const conOggi = [...righe, riga('2026-10-09', 'submitted', { energy_level: 2, hydration_level: 1, sport_type: 'nuoto', sport_duration: '1h-1.5h' })];
    const a = andamentoSettimana('2026-10-09', conOggi, { diario: bozzaOggi, condiviso: true });
    assert.equal(descrivi(a.categorie.energia[4]!), 'V:valore2');
    assert.equal(descrivi(a.categorie.idratazione[4]!), 'V:valore1');
    assert.equal(descrivi(a.categorie.sport[4]!), 'V:valore3');
    // Senza la riga (condivisione appena fatta, settimana non ancora aggiornata) vale il diario locale.
    const b = andamentoSettimana('2026-10-09', righe, { diario: bozzaOggi, condiviso: true });
    assert.equal(descrivi(b.categorie.energia[4]!), 'V:valore4');
  });

  it('oggi in bozza: "Oggi riposo" → trattino da condividere; senza valori → vuoto (non "non condiviso")', () => {
    const riposo = andamentoSettimana('2026-10-09', righe, { diario: { ...DIARIO_VUOTO, riposo: true, energy_level: 2 }, condiviso: false });
    assert.equal(descrivi(riposo.categorie.sport[4]!), 'V:riposoDaCondividere');
    assert.equal(descrivi(riposo.categorie.energia[4]!), 'V:daCondividere2');
    const vuoto = andamentoSettimana('2026-10-09', righe, { diario: DIARIO_VUOTO, condiviso: false });
    assert.equal(descrivi(vuoto.categorie.energia[4]!), 'V:vuoto');
    assert.equal(descrivi(vuoto.categorie.sport[4]!), 'V:vuoto');
    const senzaDiario = andamentoSettimana('2026-10-09', righe, null);
    assert.equal(descrivi(senzaDiario.categorie.energia[4]!), 'V:vuoto');
  });

  it('uno sport con durata non riconosciuta non ha colonna e viene annotato; una durata senza tipo è riposo (come nel CRM)', () => {
    const a = andamentoSettimana('2026-10-09', [
      riga('2026-10-05', 'submitted', { sport_type: 'corsa', sport_duration: '45 min' }),
      riga('2026-10-06', 'submitted', { sport_type: null, sport_duration: '30m-1h' }),
      riga('2026-10-07', 'submitted', { sport_type: 'yoga', sport_duration: '30m-1h' }),
    ], null);
    assert.deepEqual(a.categorie.sport.slice(0, 3).map(descrivi), ['L:vuoto', 'M:riposo', 'M:riposo']);
    assert.deepEqual(a.durateNonRiconosciute, ['45 min']);
    assert.equal(a.conValori, false);
  });

  it('un giorno condiviso senza un valore per la categoria resta vuoto in quella categoria', () => {
    const a = andamentoSettimana('2026-10-09', [riga('2026-10-05', 'submitted', { energy_level: 2 })], null);
    assert.equal(descrivi(a.categorie.energia[0]!), 'L:valore2');
    assert.equal(descrivi(a.categorie.idratazione[0]!), 'L:vuoto');
    assert.equal(descrivi(a.categorie.sport[0]!), 'L:riposo');
  });
});

describe('regola di comparsa (Figma Andamento · 2, 479:2100)', () => {
  it('senza alcun valore nella settimana (anche con giorni condivisi, riposo compreso) → pochi dati', () => {
    const a = andamentoSettimana('2026-10-09', [riga('2026-10-05', 'submitted'), riga('2026-10-06', 'submitted'), riga('2026-10-08', 'submitted')], { diario: DIARIO_VUOTO, condiviso: false });
    assert.equal(a.conValori, false);
    assert.deepEqual(a.categorie.sport.slice(0, 4).map(descrivi), ['L:riposo', 'M:riposo', 'M:nonCondiviso', 'G:riposo']);
  });
  it('basta un solo valore, anche solo nella bozza di oggi, perché compaiano tutti e tre i grafici', () => {
    assert.equal(andamentoSettimana('2026-10-09', [], { diario: { ...DIARIO_VUOTO, hydration_level: 2 }, condiviso: false }).conValori, true);
    assert.equal(andamentoSettimana('2026-10-09', [riga('2026-10-05', 'submitted', { sport_type: 'bici', sport_duration: '<20m' })], null).conValori, true);
    assert.equal(andamentoSettimana('2026-10-09', [riga('2026-10-05', 'submitted', { energy_level: 1 })], null).conValori, true);
  });
  it('il grafico segue la settimana di oggi in ora italiana: lunedì ricomincia da capo', () => {
    const righe = [riga('2026-10-09', 'submitted', { energy_level: 3 })];
    assert.equal(andamentoSettimana('2026-10-11', righe, null).conValori, true); // domenica: stessa settimana
    const lunedi = andamentoSettimana('2026-10-12', righe, null);
    assert.equal(lunedi.conValori, false);
    assert.equal(lunedi.categorie.energia[0]?.data, '2026-10-12');
  });
});
