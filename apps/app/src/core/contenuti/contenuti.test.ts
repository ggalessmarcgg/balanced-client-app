import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { elencoContenuti, etichettaLettura, grigliaContenuti, paragrafi, type RigaContenuto } from './contenuti.ts';

const riga = (order_index: number, step_name: string, category = 'Imparando la nutrizione'): RigaContenuto => ({ id: `c${order_index}`, order_index, step_name, category, reading_time: 3, content_body: '' });

describe('contenuti', () => {
  it('elenco per order_index, titoli ripuliti dall\'a capo finale', () => {
    const e = elencoContenuti([riga(2, 'Secondo'), riga(1, 'Primo\n'), riga(3, 'Terzo')]);
    assert.deepEqual(
      e.map((c) => c.titolo),
      ['Primo', 'Secondo', 'Terzo'],
    );
  });
  it('griglia a gruppi di quattro: larga, alta, colonna di due; l\'ultimo gruppo può essere incompleto', () => {
    const e = elencoContenuti([1, 2, 3, 4, 5, 6].map((n) => riga(n, `C${n}`)));
    const g = grigliaContenuti(e);
    assert.equal(g.length, 2);
    assert.equal(g[0]?.larga.titolo, 'C1');
    assert.equal(g[0]?.alta?.titolo, 'C2');
    assert.deepEqual(g[0]?.colonna.map((c) => c.titolo), ['C3', 'C4']);
    assert.equal(g[1]?.alta?.titolo, 'C6');
    assert.deepEqual(g[1]?.colonna, []);
    assert.deepEqual(grigliaContenuti([]), []);
  });
  it('tempo di lettura al singolare e nullo', () => {
    assert.equal(etichettaLettura(3), 'Tempo di lettura: 3 minuti');
    assert.equal(etichettaLettura(1), 'Tempo di lettura: 1 minuto');
    assert.equal(etichettaLettura(null), null);
    assert.equal(etichettaLettura(0), null);
  });
  it('paragrafi: separati da riga vuota, titoletti in grassetto, ** interni tolti', () => {
    assert.deepEqual(paragrafi('Intro **forte** qui.\n\n**Perché oscilla?**\n\n\nTesto.\r\n\r\n'), [
      { tipo: 'testo', testo: 'Intro forte qui.' },
      { tipo: 'titolo', testo: 'Perché oscilla?' },
      { tipo: 'testo', testo: 'Testo.' },
    ]);
  });
});
