import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { calcolaStato, primoNome, type AppuntamentoRiga, type ClienteRiga, type DatiStato } from './stato.ts';

// 19 ottobre 2026, 12:00 a Roma (ora legale, UTC+2).
const ADESSO = new Date('2026-10-19T10:00:00.000Z');

const CLIENTE: ClienteRiga = {
  id: 'c1',
  status: 'booked',
  full_name: 'Giulia Rossi',
  gender: 'female',
  nutritionist_id: 'n1',
  consultation_lead_v2_id: 'l1',
};
const NUTRIZIONISTA = { id: 'n1', full_name: 'Margherita Chiadò', title: 'Dott.ssa', app_square_photo_url: 'https://x/foto.jpg' };

function dati(parziale: Partial<DatiStato> & { status?: string }): DatiStato {
  const { status, ...resto } = parziale;
  return {
    cliente: { ...CLIENTE, status: status ?? CLIENTE.status },
    lead: null,
    appuntamenti: [],
    nutrizionista: NUTRIZIONISTA,
    ...resto,
  };
}
function app(status: string, data: string, ora: string, id = 'a'): AppuntamentoRiga {
  return { id, appointment_date: data, start_time: ora, status, meeting_url: null };
}

describe('calcolaStato', () => {
  it('L: nessuna riga clients', () => {
    assert.deepEqual(calcolaStato(dati({ cliente: null }), ADESSO), { codice: 'L' });
  });

  it('profilo: primo nome, genere, nutrizionista con titolo', () => {
    const s = calcolaStato(dati({ status: 'subscribed' }), ADESSO);
    assert.equal(s.codice, 'J');
    if (s.codice !== 'J') return;
    assert.equal(s.profilo.nome, 'Giulia');
    assert.equal(s.profilo.genere, 'female');
    assert.deepEqual(s.profilo.nutrizionista, { id: 'n1', nome: 'Dott.ssa Margherita Chiadò', foto: 'https://x/foto.jpg', specializzazione: null, numeroAlbo: null });
    assert.equal(s.profilo.telefono, null);
  });

  it('profilo (step 12): telefono del cliente, specializzazione e numero d\'ordine della nutrizionista; fine del blocco dell\'appuntamento', () => {
    const s = calcolaStato(
      dati({
        status: 'booked',
        cliente: { ...CLIENTE, phone_number: ' 333 1234567 ' },
        nutrizionista: { ...NUTRIZIONISTA, expertise: 'Biologa nutrizionista', registration_number: 'PLV_A4044' },
        appuntamenti: [{ ...app('scheduled', '2026-10-22', '18:30:00'), end_time: '19:30:00' }],
      }),
      ADESSO,
    );
    assert.equal(s.codice, 'F');
    if (s.codice !== 'F') return;
    assert.equal(s.profilo.telefono, '333 1234567');
    assert.equal(s.profilo.nutrizionista?.specializzazione, 'Biologa nutrizionista');
    assert.equal(s.profilo.nutrizionista?.numeroAlbo, 'PLV_A4044');
    assert.equal(s.appuntamento?.fine, '19:30');
  });

  it('profilo: nome completo e dati dell\'Account dalla stessa riga', () => {
    const s = calcolaStato(dati({ status: 'subscribed', cliente: { ...CLIENTE, status: 'subscribed', email: 'giulia.rossi@email.it', total_submissions: 142, diary_reminder_enabled: true, diary_reminder_weekend_enabled: false, stripe_customer_id: 'cus_1' } }), ADESSO);
    assert.equal(s.codice, 'J');
    if (s.codice !== 'J') return;
    assert.equal(s.profilo.nomeCompleto, 'Giulia Rossi');
    assert.deepEqual(s.profilo.account, { email: 'giulia.rossi@email.it', giornateCondivise: 142, promemoria: { diario: true, weekend: false }, conStripe: true });
  });

  it('profilo: nutrizionista ignorata se non è quella di clients.nutritionist_id', () => {
    const s = calcolaStato(dati({ status: 'subscribed', nutrizionista: { ...NUTRIZIONISTA, id: 'altra' } }), ADESSO);
    assert.equal(s.codice === 'J' && s.profilo.nutrizionista, null);
  });

  it('C: not_confirmed con slot desiderato futuro (ora italiana)', () => {
    const s = calcolaStato(dati({ status: 'not_confirmed', lead: { desired_date: '2026-10-19', desired_start_time: '12:30:00' } }), ADESSO);
    assert.equal(s.codice, 'C');
    if (s.codice === 'C') assert.deepEqual({ data: s.slot.data, ora: s.slot.ora }, { data: '2026-10-19', ora: '12:30' });
  });

  it('D: not_confirmed con slot passato (anche di pochi minuti)', () => {
    const s = calcolaStato(dati({ status: 'not_confirmed', lead: { desired_date: '2026-10-19', desired_start_time: '11:59:00' } }), ADESSO);
    assert.equal(s.codice, 'D');
    if (s.codice === 'D') assert.equal(s.slot?.ora, '11:59');
  });

  it('D: not_confirmed senza lead o senza slot', () => {
    assert.equal(calcolaStato(dati({ status: 'not_confirmed', lead: null }), ADESSO).codice, 'D');
    const s = calcolaStato(dati({ status: 'not_confirmed', lead: { desired_date: null, desired_start_time: null } }), ADESSO);
    assert.equal(s.codice, 'D');
    if (s.codice === 'D') assert.equal(s.slot, null);
  });

  it('F: booked con consulenza futura, card del primo scheduled futuro', () => {
    const s = calcolaStato(dati({ appuntamenti: [app('scheduled', '2026-10-21', '10:00:00', 'a2'), app('scheduled', '2026-10-20', '09:00:00', 'a1')] }), ADESSO);
    assert.equal(s.codice, 'F');
    if (s.codice === 'F') assert.equal(s.appuntamento?.id, 'a1');
  });

  it('F: booked con consulenza iniziata da meno di 45 minuti (fase pre, nessuna card futura)', () => {
    const s = calcolaStato(dati({ appuntamenti: [app('scheduled', '2026-10-19', '11:30:00')] }), ADESSO);
    assert.equal(s.codice, 'F');
    if (s.codice === 'F') assert.equal(s.appuntamento, null);
  });

  it('H: booked con scheduled iniziato da 45 minuti esatti', () => {
    assert.equal(calcolaStato(dati({ appuntamenti: [app('scheduled', '2026-10-19', '11:15:00')] }), ADESSO).codice, 'H');
  });

  it('H: booked con completed', () => {
    assert.equal(calcolaStato(dati({ appuntamenti: [app('completed', '2026-07-23', '16:00:00')] }), ADESSO).codice, 'H');
  });

  it('H: più appuntamenti, la fase viene dal più vecchio scheduled|completed anche se ce n è uno futuro', () => {
    const s = calcolaStato(dati({ appuntamenti: [app('scheduled', '2026-11-02', '10:00:00', 'futuro'), app('completed', '2026-09-01', '10:00:00', 'vecchio')] }), ADESSO);
    assert.equal(s.codice, 'H');
  });

  it('I: booked con solo no_show', () => {
    assert.equal(calcolaStato(dati({ appuntamenti: [app('no_show', '2026-09-01', '10:00:00')] }), ADESSO).codice, 'I');
  });

  it('I: no_show più un cancellato resta I; no_show più uno scheduled futuro è F', () => {
    assert.equal(calcolaStato(dati({ appuntamenti: [app('no_show', '2026-09-01', '10:00:00', 'a'), app('cancelled', '2026-09-08', '10:00:00', 'b')] }), ADESSO).codice, 'I');
    assert.equal(calcolaStato(dati({ appuntamenti: [app('no_show', '2026-09-01', '10:00:00', 'a'), app('scheduled', '2026-11-08', '10:00:00', 'b')] }), ADESSO).codice, 'F');
  });

  it('F senza card: booked con sole consulenze cancellate o senza appuntamenti (come oggi)', () => {
    const s1 = calcolaStato(dati({ appuntamenti: [app('cancelled', '2026-09-01', '10:00:00')] }), ADESSO);
    assert.equal(s1.codice, 'F');
    if (s1.codice === 'F') assert.equal(s1.appuntamento, null);
    assert.equal(calcolaStato(dati({ appuntamenti: [] }), ADESSO).codice, 'F');
  });

  it('J e K', () => {
    assert.equal(calcolaStato(dati({ status: 'subscribed' }), ADESSO).codice, 'J');
    assert.equal(calcolaStato(dati({ status: 'churned' }), ADESSO).codice, 'K');
  });

  it('stato sconosciuto (impossibile per il CHECK) → L', () => {
    assert.equal(calcolaStato(dati({ status: 'altro' }), ADESSO).codice, 'L');
  });

  it('appuntamenti con data non valida vengono ignorati', () => {
    assert.equal(calcolaStato(dati({ appuntamenti: [app('completed', 'ieri', '10:00:00')] }), ADESSO).codice, 'F');
  });
});

describe('primoNome', () => {
  it('prende la prima parola', () => {
    assert.equal(primoNome('  Giulia Maria Rossi '), 'Giulia');
    assert.equal(primoNome(null), '');
    assert.equal(primoNome(''), '');
  });
});
