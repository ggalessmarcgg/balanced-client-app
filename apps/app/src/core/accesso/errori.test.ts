import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { classificaErrore, emailValida, messaggioLinkInviato, normalizzaEmail } from './errori.ts';

describe('classificaErrore', () => {
  it('legge error.code di GoTrue', () => {
    assert.equal(classificaErrore({ code: 'invalid_credentials', status: 400, message: 'Invalid login credentials' }), 'credenzialiErrate');
    assert.equal(classificaErrore({ code: 'email_not_confirmed', status: 400, message: 'Email not confirmed' }), 'emailNonConfermata');
    assert.equal(classificaErrore({ code: 'over_email_send_rate_limit', status: 429 }), 'limiteInvio');
    assert.equal(classificaErrore({ status: 429, message: 'Too many requests' }), 'limiteInvio');
  });
  it('riconosce gli errori di rete di fetch e di supabase-js', () => {
    assert.equal(classificaErrore({ name: 'AuthRetryableFetchError', status: 0, message: 'Network request failed' }), 'rete');
    assert.equal(classificaErrore(new TypeError('Network request failed')), 'rete');
  });
  it('tutto il resto è sconosciuto', () => {
    assert.equal(classificaErrore({ code: 'unexpected_failure', status: 500 }), 'sconosciuto');
    assert.equal(classificaErrore(null), 'sconosciuto');
    assert.equal(classificaErrore('boh'), 'sconosciuto');
  });
});

describe('email', () => {
  it('normalizza e valida', () => {
    assert.equal(normalizzaEmail('  Giulia.Rossi@Email.it '), 'giulia.rossi@email.it');
    assert.equal(emailValida('giulia.rossi@email.it'), true);
    assert.equal(emailValida('aless.marchetto6+test@gmail.com'), true);
    assert.equal(emailValida('giulia'), false);
    assert.equal(emailValida('giulia@email'), false);
    assert.equal(emailValida(''), false);
  });
  it('messaggio link inviato con l email', () => {
    assert.match(messaggioLinkInviato('giulia.rossi@email.it'), /nuovo link a giulia\.rossi@email\.it\./);
  });
});
