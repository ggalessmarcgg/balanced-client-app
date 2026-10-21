import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { aggiornaCopieInAttesa, ATTESA_VUOTA, bozzePrecedenti, copieInAttesaValide, haCopieInAttesa, unisciConCache, type CopieInAttesa } from './attesa.ts';
import { diarioLocaleIniziale, type DiarioLocale } from './bozza.ts';
import type { GiornataLocale } from './giornata.ts';
import { campiDaSalvare, DIARIO_VUOTO } from './modello.ts';

const bozza = (data: string, inAttesa: boolean, clientId = 'c1'): DiarioLocale => ({ ...diarioLocaleIniziale(clientId, data, { ...DIARIO_VUOTO, breakfast: 'Caffè' }, { tipo: 'assente' }), inAttesa, modificatoAlle: '2026-10-21T08:00:00Z' });
const giornata = (data: string, inAttesa: boolean): GiornataLocale => ({ id: data, data, diario: DIARIO_VUOTO, salvato: campiDaSalvare(DIARIO_VUOTO), updatedAt: null, inAttesa, errore: null, modificatoAlle: null });

describe('copie in attesa', () => {
  it('la bozza in attesa entra nel file; una volta confermata esce; i giorni assenti dalla memoria restano', () => {
    const salvate: CopieInAttesa = { bozze: { '2026-10-20': bozza('2026-10-20', true) }, giornate: { '2026-10-15': giornata('2026-10-15', true) }, lettureInAttesa: ['x'] };
    const dopo = aggiornaCopieInAttesa(salvate, { locale: bozza('2026-10-21', true), giornate: { '2026-10-16': giornata('2026-10-16', true) }, lettureInAttesa: ['x', 'y'] });
    assert.deepEqual(Object.keys(dopo.bozze).sort(), ['2026-10-20', '2026-10-21']);
    assert.deepEqual(Object.keys(dopo.giornate).sort(), ['2026-10-15', '2026-10-16']);
    assert.deepEqual(dopo.lettureInAttesa, ['x', 'y']);
    const confermata = aggiornaCopieInAttesa(dopo, { locale: bozza('2026-10-21', false), giornate: { '2026-10-16': giornata('2026-10-16', false) }, lettureInAttesa: [] });
    assert.deepEqual(Object.keys(confermata.bozze), ['2026-10-20']);
    assert.deepEqual(Object.keys(confermata.giornate), ['2026-10-15']);
    assert.deepEqual(confermata.lettureInAttesa, []);
  });
  it('vuote quando non c\'è nulla da proteggere', () => {
    assert.equal(haCopieInAttesa(ATTESA_VUOTA), false);
    assert.equal(haCopieInAttesa({ ...ATTESA_VUOTA, lettureInAttesa: ['x'] }), true);
    assert.equal(haCopieInAttesa(aggiornaCopieInAttesa(ATTESA_VUOTA, { locale: bozza('2026-10-21', false), giornate: {}, lettureInAttesa: [] })), false);
  });
  it('dal disco si tengono solo le voci del cliente, coerenti con la chiave e davvero in attesa', () => {
    const grezzo = {
      bozze: { '2026-10-21': bozza('2026-10-21', true), '2026-10-20': bozza('2026-10-20', true, 'altro'), '2026-10-19': bozza('2026-10-18', true), '2026-10-17': bozza('2026-10-17', false) },
      giornate: { '2026-10-15': giornata('2026-10-15', true), '2026-10-14': giornata('2026-10-13', true), '2026-10-12': giornata('2026-10-12', false) },
      lettureInAttesa: ['a', 3, null],
    };
    const c = copieInAttesaValide(grezzo, 'c1');
    assert.deepEqual(Object.keys(c.bozze), ['2026-10-21']);
    assert.deepEqual(Object.keys(c.giornate), ['2026-10-15']);
    assert.deepEqual(c.lettureInAttesa, ['a']);
    assert.deepEqual(copieInAttesaValide(null, 'c1'), ATTESA_VUOTA);
    assert.deepEqual(copieInAttesaValide('testo', 'c1'), ATTESA_VUOTA);
  });
  it('le bozze dei giorni passati si elencano in ordine di data, oggi esclusa', () => {
    const c: CopieInAttesa = { ...ATTESA_VUOTA, bozze: { '2026-10-21': bozza('2026-10-21', true), '2026-10-19': bozza('2026-10-19', true), '2026-10-20': bozza('2026-10-20', true) } };
    assert.deepEqual(
      bozzePrecedenti(c, '2026-10-21').map((b) => b.data),
      ['2026-10-19', '2026-10-20'],
    );
  });
  it('alla ripartenza la bozza di oggi in attesa vince sulla cache; le giornate in attesa vincono sulle copie in cache', () => {
    const cache = { locale: bozza('2026-10-21', false), giornate: { '2026-10-15': giornata('2026-10-15', false), '2026-10-14': giornata('2026-10-14', false) } };
    const attesa: CopieInAttesa = { ...ATTESA_VUOTA, bozze: { '2026-10-21': bozza('2026-10-21', true) }, giornate: { '2026-10-15': giornata('2026-10-15', true) } };
    const u = unisciConCache(cache, attesa, '2026-10-21');
    assert.equal(u.locale?.inAttesa, true);
    assert.equal(u.giornate['2026-10-15']?.inAttesa, true);
    assert.equal(u.giornate['2026-10-14']?.inAttesa, false);
    assert.equal(unisciConCache(null, ATTESA_VUOTA, '2026-10-21').locale, null);
    assert.equal(unisciConCache(null, attesa, '2026-10-22').locale, null);
  });
});
