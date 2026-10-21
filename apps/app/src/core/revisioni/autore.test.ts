import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { autoreRevisione, nomeConTitolo } from './autore.ts';

describe('autrice della revisione', () => {
  it('"<title> <full_name>" dal profilo dell\'autrice, con iniziali e foto quadrata', () => {
    const a = autoreRevisione({ id: 'a', title: 'Dott.ssa', full_name: 'Margherita Chiadò', app_square_photo_url: 'https://x/foto.jpg' }, null);
    assert.deepEqual(a, { nome: 'Dott.ssa Margherita Chiadò', foto: 'https://x/foto.jpg', iniziali: 'MC', fotoPronta: false });
    assert.equal(nomeConTitolo({ title: null, full_name: ' Anna Rossi ' }), 'Anna Rossi');
  });
  it('senza autrice (o profilo non leggibile) si ripiega sulla nutrizionista assegnata; senza nessuna delle due → null', () => {
    const n = { nome: 'Dott.ssa Alessandra Marchina', foto: null };
    assert.deepEqual(autoreRevisione(null, n), { nome: 'Dott.ssa Alessandra Marchina', foto: null, iniziali: 'AM', fotoPronta: false });
    assert.deepEqual(autoreRevisione({ id: 'a', title: null, full_name: null, app_square_photo_url: null }, n)?.nome, 'Dott.ssa Alessandra Marchina');
    assert.equal(autoreRevisione(null, null), null);
  });
});
