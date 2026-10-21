import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { appuntamenti, DURATA_VISITA_MINUTI, etichettaOrario, etichettaPassato, etichettaQuando, etichettaVideochiamata, fasciaOraria, oraPiuMinuti, type RigaAppuntamenti } from './appuntamenti.ts';

// Giovedì 15 ottobre 2026, 12:00 a Roma (ora legale).
const ADESSO = new Date('2026-10-15T10:00:00.000Z');
const prima = (id: string, data: string, inizio: string, fine: string, status = 'scheduled', meeting_url: string | null = 'https://meet.google.com/abc') => ({ id, appointment_date: data, start_time: inizio, end_time: fine, status, meeting_url });
const controllo = (id: string, data: string, inizio: string, fine: string, status = 'scheduled', is_initial = false, meeting_url: string | null = null) => ({ id, scheduled_date: data, start_time: inizio, end_time: fine, status, is_initial, meeting_url });
const riga = (appointments: RigaAppuntamenti['appointments'], control_visits: RigaAppuntamenti['control_visits']): RigaAppuntamenti => ({ id: 'c', appointments, control_visits });

describe('appuntamenti', () => {
  it('prossimo = la scheduled più vicina non ancora finita, tra prime visite e controlli; passati dalla più recente', () => {
    const a = appuntamenti(
      riga([prima('p', '2026-07-02', '10:00:00', '11:00:00', 'completed')], [controllo('c1', '2026-10-15', '18:30:00', '18:50:00'), controllo('c2', '2026-09-24', '09:00:00', '09:20:00', 'completed'), controllo('c3', '2026-11-26', '09:00:00', '09:20:00'), controllo('c4', '2026-07-30', '09:00:00', '09:20:00', 'no_show')]),
      ADESSO,
    );
    assert.equal(a.prossimo?.id, 'c1');
    assert.equal(a.prossimo?.tipo, 'controllo');
    assert.equal(a.prossimo?.durataMinuti, 20);
    assert.deepEqual(
      a.passati.map((v) => v.id),
      ['c2', 'c4', 'p'],
    );
  });
  it('una scheduled già finita (mai chiusa nel CRM) va tra i passati; le cancellate non si mostrano; is_initial = prima visita', () => {
    const a = appuntamenti(riga([], [controllo('vecchia', '2026-10-14', '09:00:00', '09:20:00'), controllo('ann', '2026-10-20', '09:00:00', '09:20:00', 'cancelled'), controllo('iniziale', '2026-06-01', '09:00:00', '10:00:00', 'completed', true)]), ADESSO);
    assert.equal(a.prossimo, null);
    assert.deepEqual(
      a.passati.map((v) => [v.id, v.tipo]),
      [
        ['vecchia', 'controllo'],
        ['iniziale', 'prima'],
      ],
    );
  });
  it('una visita in corso (iniziata ma non finita) resta il prossimo appuntamento', () => {
    const a = appuntamenti(riga([], [controllo('ora', '2026-10-15', '11:50:00', '12:10:00')]), ADESSO);
    assert.equal(a.prossimo?.id, 'ora');
  });
  it('etichette: "Oggi" se è oggi in ora italiana, altrimenti giorno per esteso; fascia e durata della visita (40 minuti per la prima, non il blocco di 60); riga del passato', () => {
    const a = appuntamenti(riga([prima('p', '2026-10-15', '18:30:00', '19:30:00')], [controllo('c', '2026-10-22', '18:30:00', '19:00:00'), controllo('v', '2026-09-24', '09:00:00', '09:20:00', 'completed')]), ADESSO);
    assert.equal(a.prossimo && etichettaQuando(a.prossimo, ADESSO), 'Oggi');
    assert.equal(a.prossimo && etichettaOrario(a.prossimo), '18:30 – 19:10');
    assert.equal(a.prossimo && etichettaVideochiamata(a.prossimo), 'Videochiamata, 40 minuti');
    assert.equal(a.prossimo?.fine, '19:10');
    const settimanaProssima = appuntamenti(riga([], [controllo('c', '2026-10-22', '18:30:00', '19:00:00')]), ADESSO);
    assert.equal(settimanaProssima.prossimo && etichettaQuando(settimanaProssima.prossimo, ADESSO), 'Giovedì 22 ottobre');
    assert.equal(a.passati[0] && etichettaPassato(a.passati[0]), 'Visita di controllo · 24 set');
  });
  it('a cavallo di mezzanotte conta l\'ora italiana, non UTC: alle 23:30 UTC del 14 ottobre è già il 15 a Roma', () => {
    const a = appuntamenti(riga([], [controllo('c', '2026-10-15', '02:30:00', '02:50:00')]), new Date('2026-10-14T23:30:00.000Z'));
    assert.equal(a.prossimo && etichettaQuando(a.prossimo, new Date('2026-10-14T23:30:00.000Z')), 'Oggi');
  });
  it('senza riga o con orari non validi non si rompe', () => {
    assert.deepEqual(appuntamenti(null, ADESSO), { prossimo: null, passati: [] });
    assert.deepEqual(appuntamenti(riga([prima('x', 'non-data', '10:00:00', '11:00:00')], null), ADESSO), { prossimo: null, passati: [] });
  });
});

describe('durate e fasce (decisione del 22/10/2026)', () => {
  it('prima visita 40 minuti, controllo 20: la fascia è inizio – inizio + durata, qualunque sia end_time', () => {
    assert.deepEqual(DURATA_VISITA_MINUTI, { prima: 40, controllo: 20 });
    assert.equal(fasciaOraria('18:30', 40), '18:30 – 19:10');
    assert.equal(fasciaOraria('09:00:00', 20), '09:00 – 09:20');
    const a = appuntamenti(riga([], [controllo('c', '2026-10-22', '18:30:00', '19:30:00')]), ADESSO);
    assert.equal(a.prossimo?.durataMinuti, 20);
    assert.equal(a.prossimo && etichettaOrario(a.prossimo), '18:30 – 18:50');
    // La fine reale del blocco decide ancora se la visita è in corso: alle 12:00 una visita 11:00–12:30 è il prossimo appuntamento.
    const inCorso = appuntamenti(riga([prima('p', '2026-10-15', '11:00:00', '12:30:00')], []), ADESSO);
    assert.equal(inCorso.prossimo?.id, 'p');
  });
  it('oraPiuMinuti: resta nel giorno e lascia invariato un formato non valido', () => {
    assert.equal(oraPiuMinuti('23:50', 20), '00:10');
    assert.equal(oraPiuMinuti('08:05:00', 55), '09:00');
    assert.equal(oraPiuMinuti('x', 10), 'x');
  });
});
