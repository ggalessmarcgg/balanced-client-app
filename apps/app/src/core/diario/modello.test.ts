import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { bloccoSuccessivo, campiDaSalvare, DIARIO_VUOTO, diarioDaCampi, DURATA_STORICA, DURATE_SPORT, ETICHETTE_DURATA, haContenuto, normalizzaTesto, TIPI_SPORT } from './modello.ts';

describe('formati dei campi', () => {
  it('testi: stringa vuota o solo spazi → null, altrimenti il testo ripulito', () => {
    assert.equal(normalizzaTesto(''), null);
    assert.equal(normalizzaTesto('   '), null);
    assert.equal(normalizzaTesto(' Yogurt e frutta '), 'Yogurt e frutta');
  });
  it('i valori di sport sono quelli della web app; le durate sono le quattro del formato storico con "<30m" al posto di "<20m"', () => {
    assert.deepEqual([...TIPI_SPORT], ['corsa', 'camminata', 'pesi', 'bici', 'nuoto', 'corpo-libero', 'danza', 'altro']);
    assert.deepEqual([...DURATE_SPORT], ['<30m', '30m-1h', '1h-1.5h', '>1.5h']);
    assert.equal((DURATE_SPORT as readonly string[]).includes(DURATA_STORICA), false);
    assert.deepEqual(DURATE_SPORT.map((d) => ETICHETTE_DURATA[d]), ['Meno di 30 min', '30 min – 1 ora', '1 – 1,5 ore', 'Più di 1,5 ore']);
    assert.equal(ETICHETTE_DURATA[DURATA_STORICA], 'Meno di 20 min');
  });
  it('sport_type e sport_duration si scrivono sempre insieme', () => {
    const soloTipo = campiDaSalvare({ ...DIARIO_VUOTO, sport_type: 'corsa' });
    assert.equal(soloTipo.sport_type, null);
    assert.equal(soloTipo.sport_duration, null);
    const soloDurata = campiDaSalvare({ ...DIARIO_VUOTO, sport_duration: '30m-1h' });
    assert.equal(soloDurata.sport_type, null);
    assert.equal(soloDurata.sport_duration, null);
    const completo = campiDaSalvare({ ...DIARIO_VUOTO, sport_type: 'corsa', sport_duration: '>1.5h' });
    assert.equal(completo.sport_type, 'corsa');
    assert.equal(completo.sport_duration, '>1.5h');
  });
  it('la durata storica "<20m" di una giornata della web app si riscrive tale quale (nessuna traduzione)', () => {
    const storico = campiDaSalvare({ ...DIARIO_VUOTO, sport_type: 'camminata', sport_duration: '<20m' });
    assert.equal(storico.sport_type, 'camminata');
    assert.equal(storico.sport_duration, '<20m');
  });
  it('"Oggi riposo" = entrambi null, anche se prima era stato scelto uno sport', () => {
    const c = campiDaSalvare({ ...DIARIO_VUOTO, sport_type: 'pesi', sport_duration: '1h-1.5h', riposo: true });
    assert.equal(c.sport_type, null);
    assert.equal(c.sport_duration, null);
  });
  it('energia e idratazione 1–4, sazietà 1–10: fuori intervallo → null', () => {
    const c = campiDaSalvare({ ...DIARIO_VUOTO, energy_level: 3, satiety_level: 11, hydration_level: 4 });
    assert.equal(c.energy_level, 3);
    assert.equal(c.satiety_level, null);
    assert.equal(c.hydration_level, 4);
    assert.equal(campiDaSalvare({ ...DIARIO_VUOTO, satiety_level: 7 }).satiety_level, 7);
  });
  it('i campi scritti sono solo i dieci del contenuto: mai status, submission_number, review_id, client_id', () => {
    const chiavi = Object.keys(campiDaSalvare(DIARIO_VUOTO)).sort();
    assert.deepEqual(chiavi, ['breakfast', 'day_comment', 'dinner', 'energy_level', 'hydration_level', 'lunch', 'satiety_level', 'snacks', 'sport_duration', 'sport_type']);
  });
});

describe('haContenuto', () => {
  it('un diario vuoto o con soli spazi non ha contenuto', () => {
    assert.equal(haContenuto(DIARIO_VUOTO), false);
    assert.equal(haContenuto({ ...DIARIO_VUOTO, breakfast: '   ' }), false);
  });
  it('"Oggi riposo" da solo non è un contenuto (nel database sarebbe una riga tutta null)', () => {
    assert.equal(haContenuto({ ...DIARIO_VUOTO, riposo: true }), false);
  });
  it('uno sport senza durata non è ancora un contenuto', () => {
    assert.equal(haContenuto({ ...DIARIO_VUOTO, sport_type: 'bici' }), false);
  });
  it('basta un valore o un testo', () => {
    assert.equal(haContenuto({ ...DIARIO_VUOTO, energy_level: 2 }), true);
    assert.equal(haContenuto({ ...DIARIO_VUOTO, dinner: 'Pasta' }), true);
  });
});

describe('diarioDaCampi', () => {
  it('legge una riga del database: durate attuali e storica "<20m" conservate, durata non riconosciuta → null', () => {
    const d = diarioDaCampi({ breakfast: 'Caffè', lunch: null, energy_level: 3, satiety_level: 8, hydration_level: 2, sport_type: 'camminata', sport_duration: '30m-1h' });
    assert.equal(d.breakfast, 'Caffè');
    assert.equal(d.lunch, '');
    assert.equal(d.energy_level, 3);
    assert.equal(d.sport_type, 'camminata');
    assert.equal(d.sport_duration, '30m-1h');
    assert.equal(d.riposo, false);
    assert.equal(diarioDaCampi({ sport_type: 'corsa', sport_duration: '<20m' }).sport_duration, '<20m');
    const nonRiconosciuta = diarioDaCampi({ sport_type: 'corsa', sport_duration: '45 min' });
    assert.equal(nonRiconosciuta.sport_type, 'corsa');
    assert.equal(nonRiconosciuta.sport_duration, null);
  });
  it('un tipo di sport sconosciuto viene ignorato insieme alla durata', () => {
    const d = diarioDaCampi({ sport_type: 'yoga', sport_duration: '30m-1h' });
    assert.equal(d.sport_type, null);
    assert.equal(d.sport_duration, null);
  });
});

describe('blocchi', () => {
  it('pasti → valori → sport → commento → fine', () => {
    assert.equal(bloccoSuccessivo('pasti'), 'valori');
    assert.equal(bloccoSuccessivo('sport'), 'commento');
    assert.equal(bloccoSuccessivo('commento'), null);
  });
});
