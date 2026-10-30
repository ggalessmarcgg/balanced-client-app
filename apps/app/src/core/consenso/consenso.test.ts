import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { consensoValido, rigaConsenso, TIPO_CONSENSO_AI, VERSIONE_TESTO_AI } from './consenso.ts';

describe('consenso alle funzioni AI (contratto §8)', () => {
  it('stato dall\'ultima riga: granted valido, revoked o nessuna riga non valido', () => {
    assert.equal(consensoValido({ id: '1', action: 'granted', text_version: 'v1', created_at: '2026-10-30T10:00:00Z' }), true);
    assert.equal(consensoValido({ id: '2', action: 'revoked', text_version: 'v1', created_at: '2026-10-30T11:00:00Z' }), false);
    assert.equal(consensoValido(null), false);
  });

  it('riga da inserire con tipo, versione del testo, versione dell\'app e piattaforma', () => {
    assert.deepEqual(rigaConsenso('granted', 'c1', 'u1', '0.1.0', 'android'), { client_id: 'c1', user_id: 'u1', kind: TIPO_CONSENSO_AI, action: 'granted', text_version: VERSIONE_TESTO_AI, app_version: '0.1.0', platform: 'android' });
    assert.equal(rigaConsenso('revoked', 'c1', 'u1', null, 'ios').action, 'revoked');
    assert.equal(VERSIONE_TESTO_AI, 'v1');
  });
});
