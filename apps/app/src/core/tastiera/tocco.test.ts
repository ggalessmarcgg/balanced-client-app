import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { toccoChiudeCampo } from './tocco.ts';

describe('tastiera: tocco fuori dai campi', () => {
  it('chiude il campo a fuoco se il tocco è altrove, mai se non c’è un campo a fuoco o il tocco è sul campo stesso', () => {
    const campo = { id: 'campo' };
    assert.equal(toccoChiudeCampo(campo, { id: 'titolo' }), true);
    assert.equal(toccoChiudeCampo(campo, campo), false);
    assert.equal(toccoChiudeCampo(null, { id: 'titolo' }), false);
    assert.equal(toccoChiudeCampo(undefined, { id: 'titolo' }), false);
  });
});
