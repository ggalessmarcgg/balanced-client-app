import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { appuntamentoDaRisposta, interpretaRispostaConferma, oraPerFunzione, parametriConferma, TESTI_PANNELLO } from './conferma.ts';

const APPUNTAMENTO = { id: 'a1', date: '2026-10-22', start_time: '18:30:00', end_time: '19:30:00' };

describe('conferma della consulenza', () => {
  it('parametri: solo p_client_id senza scelta; con la scelta anche p_date e p_start_time in HH:MM:00', () => {
    assert.deepEqual(parametriConferma('c1', null), { p_client_id: 'c1' });
    assert.deepEqual(parametriConferma('c1', { date: '2026-07-24', time: '16:00' }), { p_client_id: 'c1', p_date: '2026-07-24', p_start_time: '16:00:00' });
    assert.equal(oraPerFunzione('09:00'), '09:00:00');
    assert.equal(oraPerFunzione('09:00:30'), '09:00:30');
    assert.equal(oraPerFunzione('x'), 'x');
  });

  it('confirmed → confermata con l\'appuntamento in ora italiana (fine del blocco a parte, durata mostrata altrove)', () => {
    const esito = interpretaRispostaConferma({ success: true, code: 'confirmed', appointment: APPUNTAMENTO });
    assert.equal(esito.tipo, 'confermata');
    if (esito.tipo !== 'confermata') return;
    assert.equal(esito.appuntamento.id, 'a1');
    assert.equal(esito.appuntamento.data, '2026-10-22');
    assert.equal(esito.appuntamento.ora, '18:30');
    assert.equal(esito.appuntamento.fine, '19:30');
    assert.equal(esito.appuntamento.stato, 'scheduled');
    assert.equal(esito.appuntamento.linkVideochiamata, null);
    // 18:30 a Roma il 22 ottobre (ora legale) = 16:30 UTC.
    assert.equal(esito.appuntamento.istante.toISOString(), '2026-10-22T16:30:00.000Z');
  });

  it('confirmed senza appuntamento leggibile → si rilegge lo stato come per già confermata', () => {
    assert.deepEqual(interpretaRispostaConferma({ code: 'confirmed' }), { tipo: 'giaConfermata' });
    assert.deepEqual(interpretaRispostaConferma({ code: 'confirmed', appointment: { id: 'a', date: 'x', start_time: '10:00:00', end_time: null } }), { tipo: 'giaConfermata' });
    assert.equal(appuntamentoDaRisposta(null), null);
  });

  it('gli altri codici si traducono nelle schermate decise', () => {
    assert.deepEqual(interpretaRispostaConferma({ code: 'already_confirmed', appointment: APPUNTAMENTO }), { tipo: 'giaConfermata' });
    assert.deepEqual(interpretaRispostaConferma({ code: 'slot_taken' }), { tipo: 'nonDisponibile' });
    assert.deepEqual(interpretaRispostaConferma({ code: 'day_full' }), { tipo: 'nonDisponibile' });
    assert.deepEqual(interpretaRispostaConferma({ code: 'slot_in_past' }), { tipo: 'orarioPassato' });
    assert.deepEqual(interpretaRispostaConferma({ code: 'invalid_status', status: 'booked' }), { tipo: 'statoNonValido' });
    assert.deepEqual(interpretaRispostaConferma({ code: 'no_desired_slot' }), { tipo: 'senzaOrario' });
    assert.deepEqual(interpretaRispostaConferma({ code: 'client_not_found' }), { tipo: 'errore', codice: 'client_not_found' });
    assert.deepEqual(interpretaRispostaConferma({ code: 'not_authorized' }), { tipo: 'errore', codice: 'not_authorized' });
    assert.deepEqual(interpretaRispostaConferma(null), { tipo: 'errore', codice: 'risposta_inattesa' });
    assert.deepEqual(interpretaRispostaConferma('x'), { tipo: 'errore', codice: 'risposta_inattesa' });
  });

  it('testi del pannello per motivo: avviso solo per orario passato e non disponibile', () => {
    assert.equal(TESTI_PANNELLO.modifica.avviso, null);
    assert.equal(TESTI_PANNELLO.modifica.titolo, 'Cambia orario');
    assert.match(TESTI_PANNELLO.orarioPassato.avviso ?? '', /passato/);
    assert.match(TESTI_PANNELLO.nonDisponibile.avviso ?? '', /non è più disponibile/);
  });
});
