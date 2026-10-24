import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { GiornoPiano } from './composizione.ts';
import { fasciaOraria, giornoPreselezionato, giornoSettimanaRoma, pastoPreselezionato } from './preselezione.ts';

const giorno = (indice: number): GiornoPiano => ({ indice, nome: '', iniziale: '', pasti: [] });
// Ora italiana → istante: in ottobre 2026 fino al 25 vige l'ora legale (UTC+2).
const roma = (ora: string) => new Date(`2026-10-22T${ora}:00+02:00`);

describe('fasce orarie', () => {
  it('confini: il confine appartiene alla fascia che inizia', () => {
    assert.equal(fasciaOraria('00:00'), 'colazione');
    assert.equal(fasciaOraria('10:29'), 'colazione');
    assert.equal(fasciaOraria('10:30'), 'pranzo');
    assert.equal(fasciaOraria('14:59'), 'pranzo');
    assert.equal(fasciaOraria('15:00'), 'spuntin');
    assert.equal(fasciaOraria('18:29'), 'spuntin');
    assert.equal(fasciaOraria('18:30'), 'cena');
    assert.equal(fasciaOraria('23:59'), 'cena');
  });
  it('pasto preselezionato sui nomi predefiniti, senza maiuscole e spazi ai lati; altrimenti il primo', () => {
    const pasti = [{ nome: ' colazione salata ' }, { nome: 'Pranzo (mensa nei giorni in ufficio)' }, { nome: 'Spuntino delle 17' }, { nome: 'CENA' }];
    assert.equal(pastoPreselezionato(pasti, roma('08:00'))?.nome, ' colazione salata ');
    assert.equal(pastoPreselezionato(pasti, roma('10:30'))?.nome, 'Pranzo (mensa nei giorni in ufficio)');
    assert.equal(pastoPreselezionato(pasti, roma('16:00'))?.nome, 'Spuntino delle 17');
    assert.equal(pastoPreselezionato(pasti, roma('21:00'))?.nome, 'CENA');
    // "Spuntini" al plurale corrisponde (prefisso "spuntin"); "Merenda" no → primo pasto.
    assert.equal(pastoPreselezionato([{ nome: 'Colazione' }, { nome: 'Spuntini' }], roma('17:00'))?.nome, 'Spuntini');
    assert.equal(pastoPreselezionato([{ nome: 'Colazione' }, { nome: 'Merenda' }], roma('17:00'))?.nome, 'Colazione');
    // Due pasti nella stessa fascia: il primo in ordine.
    assert.equal(pastoPreselezionato([{ nome: 'Spuntino mattina' }, { nome: 'Spuntino pomeriggio' }], roma('16:00'))?.nome, 'Spuntino mattina');
    assert.equal(pastoPreselezionato([], roma('16:00')), null);
  });
  it('la fascia si calcola in ora italiana, non in UTC', () => {
    // 09:00 UTC = 11:00 a Roma (ora legale) → pranzo.
    assert.equal(pastoPreselezionato([{ nome: 'Colazione' }, { nome: 'Pranzo' }], new Date('2026-10-22T09:00:00Z'))?.nome, 'Pranzo');
  });
});

describe('giorno preselezionato del fisso', () => {
  it('oggi in ora italiana con lunedì = 1', () => {
    assert.equal(giornoSettimanaRoma(new Date('2026-10-19T10:00:00Z')), 1); // lunedì
    assert.equal(giornoSettimanaRoma(new Date('2026-10-25T10:00:00Z')), 7); // domenica
    // Sabato 24/10 alle 23:30 a Roma è ancora sabato, in UTC sono le 21:30.
    assert.equal(giornoSettimanaRoma(new Date('2026-10-24T21:30:00Z')), 6);
    // Domenica 25/10 alle 00:30 a Roma = sabato 24/10 22:30 UTC.
    assert.equal(giornoSettimanaRoma(new Date('2026-10-24T22:30:00Z')), 7);
  });
  it('oggi se visibile, altrimenti il primo visibile; null senza giorni', () => {
    const giorni = [giorno(1), giorno(3), giorno(6)];
    assert.equal(giornoPreselezionato(giorni, new Date('2026-10-21T10:00:00Z'))?.indice, 3); // mercoledì
    assert.equal(giornoPreselezionato(giorni, new Date('2026-10-22T10:00:00Z'))?.indice, 1); // giovedì assente
    assert.equal(giornoPreselezionato([], new Date()), null);
  });
});
