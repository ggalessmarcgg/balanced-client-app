import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { dataOraRoma } from '../stato/orarioRoma.ts';
import { abbonamentoDa, cambiaPromemoria, datiAccount, etichettaPiano, etichettaRinnovo, inizialiNome, revisioniRicevute } from './account.ts';

const dataRoma = (d: Date) => dataOraRoma(d).data;

describe('inizialiNome', () => {
  it('prima e ultima parola in maiuscolo', () => {
    assert.equal(inizialiNome('Giulia Rossi'), 'GR');
    assert.equal(inizialiNome('  anna maria de luca '), 'AL');
    assert.equal(inizialiNome('Giulia'), 'G');
    assert.equal(inizialiNome(''), '');
    assert.equal(inizialiNome(null), '');
  });
});

describe('datiAccount', () => {
  it('ricava email, contatore, promemoria e presenza di Stripe dalla riga', () => {
    assert.deepEqual(datiAccount({ email: ' giulia.rossi@email.it ', total_submissions: 142, diary_reminder_enabled: true, diary_reminder_weekend_enabled: false, stripe_customer_id: 'cus_1' }), {
      email: 'giulia.rossi@email.it',
      giornateCondivise: 142,
      promemoria: { diario: true, weekend: false },
      conStripe: true,
    });
  });
  it('valori mancanti: email vuota, zero giornate, promemoria accesi (default delle colonne), senza Stripe', () => {
    assert.deepEqual(datiAccount({}), { email: '', giornateCondivise: 0, promemoria: { diario: true, weekend: true }, conStripe: false });
  });
});

describe('revisioniRicevute', () => {
  it('conta solo le revisioni inviate', () => {
    const righe = ['on_going', 'unlocked', 'draft', 'sent', 'opened', 'read', 'read'].map((status) => ({ status }));
    assert.equal(revisioniRicevute(righe), 4);
    assert.equal(revisioniRicevute([]), 0);
  });
});

describe('cambiaPromemoria', () => {
  it('spegnere il diario spegne anche il weekend, con entrambe le colonne', () => {
    assert.deepEqual(cambiaPromemoria({ diario: true, weekend: true }, 'diario', false), {
      promemoria: { diario: false, weekend: false },
      scrittura: { diary_reminder_enabled: false, diary_reminder_weekend_enabled: false },
    });
  });
  it('spegnere il diario con il weekend già spento scrive una sola colonna', () => {
    assert.deepEqual(cambiaPromemoria({ diario: true, weekend: false }, 'diario', false), { promemoria: { diario: false, weekend: false }, scrittura: { diary_reminder_enabled: false } });
  });
  it('accendere il diario non tocca il weekend', () => {
    assert.deepEqual(cambiaPromemoria({ diario: false, weekend: false }, 'diario', true), { promemoria: { diario: true, weekend: false }, scrittura: { diary_reminder_enabled: true } });
  });
  it('il weekend cambia solo con il diario acceso', () => {
    assert.deepEqual(cambiaPromemoria({ diario: true, weekend: false }, 'weekend', true), { promemoria: { diario: true, weekend: true }, scrittura: { diary_reminder_weekend_enabled: true } });
    assert.deepEqual(cambiaPromemoria({ diario: false, weekend: false }, 'weekend', true), { promemoria: { diario: false, weekend: false }, scrittura: {} });
  });
});

describe('abbonamento', () => {
  it('etichetta del piano dalla cadenza, con il nome del piano come riserva', () => {
    assert.equal(etichettaPiano('month', 6, 'Piano 6 mesi'), '6 mesi');
    assert.equal(etichettaPiano('month', 1, null), '1 mese');
    assert.equal(etichettaPiano('year', 1, null), '1 anno');
    assert.equal(etichettaPiano(null, null, 'Percorso trimestrale'), 'Percorso trimestrale');
    assert.equal(etichettaPiano(undefined, undefined, undefined), '');
  });
  it('rinnovo in ora italiana ("15 marzo 2027")', () => {
    assert.equal(etichettaRinnovo(Date.UTC(2027, 2, 15, 10) / 1000, dataRoma), '15 marzo 2027');
    // 31 dicembre 23:30 UTC è già il 1º gennaio a Roma.
    assert.equal(etichettaRinnovo(Date.UTC(2026, 11, 31, 23, 30) / 1000, dataRoma), '1 gennaio 2027');
    assert.equal(etichettaRinnovo(null, dataRoma), '');
  });
  it('card dalla risposta della function; null senza abbonamento', () => {
    assert.deepEqual(abbonamentoDa({ subscription: { interval: 'month', intervalCount: 6, status: 'active', currentPeriodEnd: Date.UTC(2027, 2, 15, 10) / 1000 } }, dataRoma), { piano: '6 mesi', stato: 'Attivo', rinnovo: '15 marzo 2027' });
    assert.equal(abbonamentoDa({ subscription: null }, dataRoma), null);
    assert.equal(abbonamentoDa(null, dataRoma), null);
  });
});
