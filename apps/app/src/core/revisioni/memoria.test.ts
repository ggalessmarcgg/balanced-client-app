import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { fondiMemoria, MEMORIA_VUOTA, modificaDaCache, type MemoriaRevisioni } from './memoria.ts';

const RIGA = { id: 'r1', review_number: 1, status: 'read', submissions_count: 7, review_author_id: null, sent_at: null, opened_at: null, read_at: null };
const CACHE_VUOTA = { righe: null, testi: {}, scrittureInAttesa: [] };

describe('fondiMemoria', () => {
  it('senza cambiamenti restituisce lo stesso oggetto (nessuna notifica)', () => {
    const m: MemoriaRevisioni = { ...MEMORIA_VUOTA, clientId: 'c' };
    assert.equal(fondiMemoria(m, { clientId: 'c', righe: null }), m);
    assert.equal(fondiMemoria(m, {}), m);
  });
  it('con un campo diverso restituisce un oggetto nuovo', () => {
    const m: MemoriaRevisioni = { ...MEMORIA_VUOTA, clientId: 'c' };
    const n = fondiMemoria(m, { righe: [RIGA] });
    assert.notEqual(n, m);
    assert.deepEqual(n.righe, [RIGA]);
  });
});

describe('modificaDaCache', () => {
  it('cliente nuovo: tutto dalla cache, anche se vuota', () => {
    assert.deepEqual(modificaDaCache(MEMORIA_VUOTA, 'c', CACHE_VUOTA), { clientId: 'c', righe: null, testi: {}, scrittureInAttesa: [] });
  });
  it('memoria senza righe e cache vuota: nulla da applicare', () => {
    assert.equal(modificaDaCache({ ...MEMORIA_VUOTA, clientId: 'c' }, 'c', CACHE_VUOTA), null);
  });
  it('memoria già pronta: nulla da applicare', () => {
    assert.equal(modificaDaCache({ ...MEMORIA_VUOTA, clientId: 'c', righe: [] }, 'c', { ...CACHE_VUOTA, righe: [RIGA] }), null);
  });
  it('memoria senza righe e cache piena: le righe della cache', () => {
    assert.deepEqual(modificaDaCache({ ...MEMORIA_VUOTA, clientId: 'c' }, 'c', { ...CACHE_VUOTA, righe: [RIGA] }), { righe: [RIGA], testi: {}, scrittureInAttesa: [] });
  });
});

/**
 * Il ciclo dell'Account (+test4, 21/10/2026): la schermata rileggeva lo stato quando le righe mancavano; ogni lettura
 * portava in memoria la cache (vuota) e notificava; la schermata vedeva ancora righe mancanti e rileggeva. Qui la
 * stessa dinamica con un ascoltatore che rilegge finché le righe sono null: deve fermarsi subito.
 */
describe('nessun ciclo tra lettura e ascoltatore', () => {
  it('una lettura con la cache vuota non notifica e non fa ripartire la lettura', () => {
    let memoria: MemoriaRevisioni = MEMORIA_VUOTA;
    let notifiche = 0;
    let letture = 0;
    const applica = (modifica: Partial<MemoriaRevisioni> | null) => {
      if (!modifica) return;
      const nuova = fondiMemoria(memoria, modifica);
      if (nuova === memoria) return;
      memoria = nuova;
      notifiche += 1;
      ascoltatore();
    };
    const leggi = () => {
      letture += 1;
      if (letture > 50) throw new Error('ciclo: la lettura riparte da sola');
      applica(modificaDaCache(memoria, 'c', CACHE_VUOTA)); // cache vuota, come al primo accesso
    };
    const ascoltatore = () => {
      if (memoria.righe === null) leggi(); // la schermata: righe mancanti → rilegge
    };
    leggi();
    assert.equal(letture, 2); // la prima lettura cambia il cliente e notifica una volta; la seconda non cambia nulla
    assert.equal(notifiche, 1);
    assert.equal(memoria.righe, null);
    // Le righe del server poi arrivano una volta sola.
    applica({ clientId: 'c', righe: [RIGA] });
    assert.equal(notifiche, 2);
    assert.equal(letture, 2);
  });
});
