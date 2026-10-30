import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { mostraSalta, NUMERO_PAGINE, PAGINA, riduci, TESTI_PAGINE } from './carosello.ts';

describe('carosello del primo accesso (contratto §7)', () => {
  it('cinque pagine con i testi; "Salta" solo nelle pagine 1–3', () => {
    assert.equal(TESTI_PAGINE.length, NUMERO_PAGINE);
    assert.deepEqual([0, 1, 2, 3, 4].map(mostraSalta), [true, true, true, false, false]);
  });

  it('"Avanti" scorre fino alla pagina 4; "Salta" porta alla pagina 4', () => {
    assert.deepEqual(riduci(0, 'avanti'), { pagina: 1, effetti: [] });
    assert.deepEqual(riduci(2, 'avanti'), { pagina: 3, effetti: [] });
    assert.deepEqual(riduci(0, 'salta'), { pagina: PAGINA.ai, effetti: [] });
    assert.deepEqual(riduci(2, 'salta'), { pagina: PAGINA.ai, effetti: [] });
    // La pagina 4 non ha "Salta" né "Avanti".
    assert.deepEqual(riduci(3, 'salta'), { pagina: 3, effetti: [] });
    assert.deepEqual(riduci(3, 'avanti'), { pagina: 3, effetti: [] });
  });

  it('pagina 4: "Accetto" registra il consenso e va alla 5, "Non ora" prosegue senza scrivere', () => {
    assert.deepEqual(riduci(3, 'accetto'), { pagina: 4, effetti: ['registraConsenso'] });
    assert.deepEqual(riduci(3, 'nonOra'), { pagina: 4, effetti: [] });
    assert.deepEqual(riduci(1, 'accetto'), { pagina: 1, effetti: [] });
  });

  it('pagina 5: "Attiva le notifiche" chiede il permesso e chiude, "Più tardi" chiude', () => {
    assert.deepEqual(riduci(4, 'attiva'), { pagina: 4, effetti: ['chiediPermesso', 'fine'] });
    assert.deepEqual(riduci(4, 'piuTardi'), { pagina: 4, effetti: ['fine'] });
    assert.deepEqual(riduci(4, 'avanti'), { pagina: 4, effetti: [] });
  });
});
