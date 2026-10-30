import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { contaMontaggio, gruppoMontato } from './montaggio.ts';

describe('montaggio del layout dell’abbonato', () => {
  it('rimontaggio: il nuovo layout si monta prima che il vecchio si smonti e il gruppo resta montato', () => {
    let n = contaMontaggio(0, true); // primo montaggio
    n = contaMontaggio(n, true); // nuovo layout (replace sulla stessa scheda)
    n = contaMontaggio(n, false); // smontaggio del vecchio
    assert.equal(n, 1);
    assert.equal(gruppoMontato(n), true);
  });
  it('smontaggio vero: il gruppo non è più montato e il conteggio non scende sotto zero', () => {
    assert.equal(gruppoMontato(contaMontaggio(1, false)), false);
    assert.equal(contaMontaggio(0, false), 0);
  });
});
