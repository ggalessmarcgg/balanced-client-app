import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parametriConferma } from './conferma.ts';
import { apriPannello, chiudiPannello, confermaOrario, dopoEsitoConferma, esitoRiapreIlPannello, orarioDaConfermare, orariLetti, scegliOrario, slotMostrato, STATO_PANNELLO_INIZIALE, varianteSchermata, type StatoPannello } from './pannello.ts';

const ORARIO = { date: '2026-11-04', time: '11:00' };
const ALTRO = { date: '2026-11-05', time: '15:00' };
const LEAD = { data: '2026-10-20', ora: '18:30' };

describe('pannello scelta orario: sempre due passaggi', () => {
  for (const motivo of ['modifica', 'orarioPassato', 'nonDisponibile'] as const) {
    it(`"${motivo}": Conferma orario chiude il pannello, mette l'orario nella card e non prenota`, () => {
      let s = apriPannello(STATO_PANNELLO_INIZIALE, motivo);
      assert.deepEqual(s.pannello, { aperto: true, motivo });
      s = scegliOrario(s, ORARIO);
      assert.deepEqual(s.scelta, ORARIO);
      s = confermaOrario(s);
      assert.equal(s.pannello.aperto, false);
      assert.equal(s.scelta, null);
      assert.deepEqual(s.sceltaLocale, ORARIO);
      // La card mostra l'orario scelto e la schermata torna "da confermare" anche in D: prenota solo "Conferma la consulenza".
      assert.deepEqual(slotMostrato(LEAD, s), { data: '2026-11-04', ora: '11:00' });
      assert.equal(varianteSchermata('D', s), 'daConfermare');
      assert.equal(varianteSchermata('C', s), 'daConfermare');
      assert.deepEqual(parametriConferma('c1', orarioDaConfermare(s)), { p_client_id: 'c1', p_date: '2026-11-04', p_start_time: '11:00:00' });
    });
  }

  it('senza scelta Conferma orario non fa nulla', () => {
    const s = apriPannello(STATO_PANNELLO_INIZIALE, 'orarioPassato');
    assert.equal(confermaOrario(s), s);
  });

  it('selezione singola: il secondo tocco deseleziona, un altro orario sostituisce', () => {
    let s = scegliOrario(apriPannello(STATO_PANNELLO_INIZIALE, 'modifica'), ORARIO);
    s = scegliOrario(s, ALTRO);
    assert.deepEqual(s.scelta, ALTRO);
    s = scegliOrario(s, ALTRO);
    assert.equal(s.scelta, null);
  });

  it('Annulla, Chiudi e velo chiudono il pannello e azzerano la scelta in corso, non l\'orario già nella card', () => {
    const conOrario = confermaOrario(scegliOrario(apriPannello(STATO_PANNELLO_INIZIALE, 'modifica'), ORARIO));
    let s = scegliOrario(apriPannello(conOrario, 'modifica'), ALTRO);
    s = chiudiPannello(s);
    assert.equal(s.pannello.aperto, false);
    assert.equal(s.scelta, null);
    assert.deepEqual(s.sceltaLocale, ORARIO);
    assert.deepEqual(slotMostrato(LEAD, s), { data: '2026-11-04', ora: '11:00' });
  });

  it('dopo la rilettura degli orari la scelta resta solo se è ancora nell\'elenco', () => {
    const s = scegliOrario(apriPannello(STATO_PANNELLO_INIZIALE, 'modifica'), ORARIO);
    assert.deepEqual(orariLetti(s, [ALTRO, ORARIO]).scelta, ORARIO);
    assert.equal(orariLetti(s, [ALTRO]).scelta, null);
  });

  it('senza orario in memoria: C mostra il lead da confermare, D la card barrata', () => {
    assert.equal(varianteSchermata('C', STATO_PANNELLO_INIZIALE), 'daConfermare');
    assert.equal(varianteSchermata('D', STATO_PANNELLO_INIZIALE), 'orarioPassato');
    assert.deepEqual(slotMostrato(LEAD, STATO_PANNELLO_INIZIALE), LEAD);
    assert.equal(slotMostrato(null, STATO_PANNELLO_INIZIALE), null);
    assert.deepEqual(parametriConferma('c1', orarioDaConfermare(STATO_PANNELLO_INIZIALE)), { p_client_id: 'c1' });
  });

  it('slot_taken/day_full: orario in memoria azzerato, pannello "non più disponibile", orari da rileggere', () => {
    const conOrario = confermaOrario(scegliOrario(apriPannello(STATO_PANNELLO_INIZIALE, 'modifica'), ORARIO));
    const s = dopoEsitoConferma(conOrario, { tipo: 'nonDisponibile' });
    assert.deepEqual(s.pannello, { aperto: true, motivo: 'nonDisponibile' });
    assert.equal(s.scelta, null);
    assert.equal(s.sceltaLocale, null);
    assert.deepEqual(slotMostrato(LEAD, s), LEAD);
    assert.equal(varianteSchermata('C', s), 'daConfermare');
    assert.ok(esitoRiapreIlPannello({ tipo: 'nonDisponibile' }));
  });

  it('slot_in_past/no_desired_slot: pannello "orario passato" e card barrata finché non si sceglie un nuovo orario', () => {
    for (const esito of [{ tipo: 'orarioPassato' }, { tipo: 'senzaOrario' }] as const) {
      const s = dopoEsitoConferma(STATO_PANNELLO_INIZIALE, esito);
      assert.deepEqual(s.pannello, { aperto: true, motivo: 'orarioPassato' });
      assert.equal(varianteSchermata('C', s), 'orarioPassato');
      assert.ok(esitoRiapreIlPannello(esito));
      const nuovo = confermaOrario(scegliOrario(s, ALTRO));
      assert.equal(nuovo.orarioNonValido, false);
      assert.equal(varianteSchermata('C', nuovo), 'daConfermare');
    }
  });

  it('gli altri esiti non toccano il pannello', () => {
    const s: StatoPannello = { ...STATO_PANNELLO_INIZIALE, sceltaLocale: ORARIO };
    for (const esito of [{ tipo: 'giaConfermata' }, { tipo: 'statoNonValido' }, { tipo: 'errore', codice: 'x' }] as const) {
      assert.equal(dopoEsitoConferma(s, esito), s);
      assert.equal(esitoRiapreIlPannello(esito), false);
    }
  });
});
