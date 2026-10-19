import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { dataOraRoma, istanteRoma, oraLegaleAttiva } from './orarioRoma.ts';

describe('istanteRoma', () => {
  it('in inverno Roma è UTC+1', () => {
    assert.equal(istanteRoma('2026-01-15', '10:00:00')?.toISOString(), '2026-01-15T09:00:00.000Z');
  });
  it("in estate Roma è UTC+2", () => {
    assert.equal(istanteRoma('2026-07-23', '16:00:00')?.toISOString(), '2026-07-23T14:00:00.000Z');
  });
  it('accetta anche HH:MM senza secondi', () => {
    assert.equal(istanteRoma('2026-10-19', '09:30')?.toISOString(), '2026-10-19T07:30:00.000Z');
  });
  it("il giorno del cambio d'ora (ultima domenica di ottobre 2026 = 25) a mezzogiorno è già ora solare", () => {
    assert.equal(istanteRoma('2026-10-25', '12:00:00')?.toISOString(), '2026-10-25T11:00:00.000Z');
    assert.equal(istanteRoma('2026-10-24', '12:00:00')?.toISOString(), '2026-10-24T10:00:00.000Z');
  });
  it("il giorno di inizio dell'ora legale (ultima domenica di marzo 2026 = 29) a mezzogiorno è ora legale", () => {
    assert.equal(istanteRoma('2026-03-29', '12:00:00')?.toISOString(), '2026-03-29T10:00:00.000Z');
    assert.equal(istanteRoma('2026-03-28', '12:00:00')?.toISOString(), '2026-03-28T11:00:00.000Z');
  });
  it('formati non validi o mancanti → null', () => {
    assert.equal(istanteRoma(null, '10:00'), null);
    assert.equal(istanteRoma('2026-07-23', null), null);
    assert.equal(istanteRoma('23/07/2026', '10:00'), null);
    assert.equal(istanteRoma('2026-07-23', '10'), null);
  });
});

describe('oraLegaleAttiva', () => {
  it('limiti 2026: 29 marzo 01:00 UTC → attiva, 25 ottobre 01:00 UTC → non più', () => {
    assert.equal(oraLegaleAttiva(Date.UTC(2026, 2, 29, 0, 59)), false);
    assert.equal(oraLegaleAttiva(Date.UTC(2026, 2, 29, 1, 0)), true);
    assert.equal(oraLegaleAttiva(Date.UTC(2026, 9, 25, 0, 59)), true);
    assert.equal(oraLegaleAttiva(Date.UTC(2026, 9, 25, 1, 0)), false);
  });
});

describe('dataOraRoma', () => {
  it('è l inverso di istanteRoma', () => {
    assert.deepEqual(dataOraRoma(new Date('2026-07-23T14:00:00.000Z')), { data: '2026-07-23', ora: '16:00' });
    assert.deepEqual(dataOraRoma(new Date('2026-01-15T09:05:00.000Z')), { data: '2026-01-15', ora: '10:05' });
  });
});
