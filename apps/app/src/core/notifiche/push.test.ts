import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { canalePerTipo, CANALI_ANDROID, destinazioneDaDati, leggiDatiPush, rottaDestinazione, schedaDiPartenza } from './push.ts';

describe('dati della push e destinazioni (contratto §2, §6)', () => {
  it('le due categorie Android hanno gli id del server', () => {
    assert.deepEqual(
      CANALI_ANDROID.map((c) => c.id),
      ['nutrizionista', 'promemoria'],
    );
    assert.equal(canalePerTipo('diary_reminder'), 'promemoria');
    assert.equal(canalePerTipo('measurement_update'), 'promemoria');
    assert.equal(canalePerTipo('nutritionist_comment'), 'nutrizionista');
    assert.equal(canalePerTipo(null), 'nutrizionista');
  });

  it('legge i dati della push come stringhe e ignora il resto', () => {
    const dati = leggiDatiPush({ tipo: 'review_sent', riferimento: 'r1', tabella: 'client_reviews', destinazione: 'revisione', notifica_id: 'n1', categoria: 'nutrizionista', extra: 3 });
    assert.deepEqual(dati, { tipo: 'review_sent', riferimento: 'r1', tabella: 'client_reviews', destinazione: 'revisione', notificaId: 'n1', categoria: 'nutrizionista' });
    assert.deepEqual(leggiDatiPush(null), { tipo: null, riferimento: null, tabella: null, destinazione: null, notificaId: null, categoria: null });
    assert.equal(leggiDatiPush({ tipo: 7 }).tipo, null);
  });

  it('corrispondenza tipo → destinazione quando la push non porta la destinazione', () => {
    const d = (tipo: string, riferimento: string | null = 'x') => destinazioneDaDati({ ...leggiDatiPush({}), tipo, riferimento });
    assert.deepEqual(d('nutritionist_comment', 's1'), { tipo: 'giornata', submissionId: 's1' });
    assert.deepEqual(d('review_sent', 'r1'), { tipo: 'revisione', id: 'r1' });
    assert.deepEqual(d('review_unlocked'), { tipo: 'revisioni' });
    assert.deepEqual(d('holiday_replacement'), { tipo: 'nutrizionista' });
    assert.deepEqual(d('plan_sent'), { tipo: 'piano' });
    assert.deepEqual(d('diary_reminder'), { tipo: 'oggi' });
    assert.deepEqual(d('measurement_update'), { tipo: 'pesoMisure' });
    assert.equal(d('weight_update'), null);
    // Senza riferimento la giornata e la revisione non si aprono.
    assert.equal(d('nutritionist_comment', null), null);
    assert.equal(d('review_sent', null), null);
  });

  it('la destinazione esplicita della push vince sul tipo', () => {
    const dati = leggiDatiPush({ tipo: 'nutritionist_comment', riferimento: 's1', destinazione: 'peso_misure' });
    assert.deepEqual(destinazioneDaDati(dati), { tipo: 'pesoMisure' });
    assert.equal(destinazioneDaDati(leggiDatiPush({ destinazione: 'sconosciuta' })), null);
  });

  it('scheda di partenza e rotta per ogni destinazione', () => {
    assert.equal(schedaDiPartenza({ tipo: 'revisione', id: 'r' }), 'revisioni');
    assert.equal(schedaDiPartenza({ tipo: 'piano' }), 'piano');
    assert.equal(schedaDiPartenza({ tipo: 'nutrizionista' }), 'oggi');
    assert.deepEqual(rottaDestinazione({ tipo: 'giornata', submissionId: 's' }, '2026-10-30'), { scheda: 'oggi', pagina: null, parametriScheda: { giornata: '2026-10-30' } });
    assert.deepEqual(rottaDestinazione({ tipo: 'giornata', submissionId: 's' }, null), { scheda: 'oggi', pagina: null, parametriScheda: undefined });
    assert.deepEqual(rottaDestinazione({ tipo: 'revisione', id: 'r1' }), { scheda: 'revisioni', pagina: { pathname: '/revisione/[id]', params: { id: 'r1' } } });
    assert.deepEqual(rottaDestinazione({ tipo: 'nutrizionista' }), { scheda: 'oggi', pagina: { pathname: '/nutrizionista' } });
    assert.deepEqual(rottaDestinazione({ tipo: 'pesoMisure' }), { scheda: 'oggi', pagina: { pathname: '/peso-misure' } });
    assert.deepEqual(rottaDestinazione({ tipo: 'piano' }), { scheda: 'piano', pagina: null });
    assert.deepEqual(rottaDestinazione({ tipo: 'oggi' }), { scheda: 'oggi', pagina: null });
    assert.deepEqual(rottaDestinazione({ tipo: 'revisioni' }), { scheda: 'revisioni', pagina: null });
  });
});
