import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { applicaLettureInAttesa, autoreCommento, CAMPI_LETTO, iniziali, nomeSenzaTitolo, pianificaLetto, segnaLettoInCache, statoCommento } from './commento.ts';

describe('statoCommento e pianificaLetto', () => {
  it('nessun commento con testo nullo o vuoto; da leggere con acknowledged false o null; letto con true', () => {
    assert.equal(statoCommento({ nutritionist_comment: null, comment_acknowledged: false }), 'nessuno');
    assert.equal(statoCommento({ nutritionist_comment: '  ', comment_acknowledged: false }), 'nessuno');
    assert.equal(statoCommento({ nutritionist_comment: 'Bravo', comment_acknowledged: false }), 'daLeggere');
    assert.equal(statoCommento({ nutritionist_comment: 'Bravo', comment_acknowledged: null }), 'daLeggere');
    assert.equal(statoCommento({ nutritionist_comment: 'Bravo', comment_acknowledged: true }), 'letto');
  });
  it("all'apertura del pannello si scrive solo comment_acknowledged = true, e solo se c'è un commento da leggere", () => {
    assert.deepEqual(pianificaLetto({ id: 'r1', nutritionist_comment: 'Bravo', comment_acknowledged: false }), {
      tipo: 'segnaLetto',
      modifica: { id: 'r1', campi: { comment_acknowledged: true } },
    });
    assert.deepEqual(Object.keys(CAMPI_LETTO), ['comment_acknowledged']);
    assert.deepEqual(pianificaLetto({ id: 'r1', nutritionist_comment: 'Bravo', comment_acknowledged: true }), { tipo: 'nessuna' });
    assert.deepEqual(pianificaLetto({ id: 'r1', nutritionist_comment: null, comment_acknowledged: false }), { tipo: 'nessuna' });
  });
  it('la cache passa a letto subito e le righe rilette restano lette finché la scrittura è in attesa', () => {
    const righe = [
      { id: 'a', comment_acknowledged: false },
      { id: 'b', comment_acknowledged: false },
    ];
    const dopo = segnaLettoInCache(righe, 'a');
    assert.deepEqual(dopo, [
      { id: 'a', comment_acknowledged: true },
      { id: 'b', comment_acknowledged: false },
    ]);
    assert.equal(dopo[1], righe[1]); // le righe non toccate restano le stesse
    assert.deepEqual(applicaLettureInAttesa(righe, ['b']), [
      { id: 'a', comment_acknowledged: false },
      { id: 'b', comment_acknowledged: true },
    ]);
    assert.equal(applicaLettureInAttesa(righe, []), righe);
  });
});

describe('autore del commento', () => {
  const profilo = { id: 'n1', full_name: 'Margherita Chiadò', title: 'Dott.ssa', app_square_photo_url: 'https://foto/m.jpg' };
  it('dal profilo dell’autore: nome di battesimo, foto quadrata e iniziali', () => {
    assert.deepEqual(autoreCommento(profilo, null), { nome: 'Margherita', foto: 'https://foto/m.jpg', iniziali: 'MC', fotoPronta: false });
  });
  it('ripiego sulla nutrizionista del cliente se il profilo non è leggibile; iniziali se manca la foto', () => {
    assert.deepEqual(autoreCommento(null, { nome: 'Dott.ssa Marta Veneziano', foto: null }), { nome: 'Marta', foto: null, iniziali: 'MV', fotoPronta: false });
    assert.deepEqual(autoreCommento({ ...profilo, full_name: null }, { nome: 'Dr. Anna Nanni', foto: 'f' }), { nome: 'Anna', foto: 'f', iniziali: 'AN', fotoPronta: false });
    assert.equal(autoreCommento(null, null), null);
  });
  it('titoli e iniziali', () => {
    assert.equal(nomeSenzaTitolo('Dott.ssa Margherita Chiadò'), 'Margherita Chiadò');
    assert.equal(nomeSenzaTitolo('Dottoressa Anna Nanni'), 'Anna Nanni');
    assert.equal(nomeSenzaTitolo(' Alessandra Marchina '), 'Alessandra Marchina');
    assert.equal(iniziali('Dott.ssa Margherita Chiadò'), 'MC');
    assert.equal(iniziali('Margherita'), 'M');
    assert.equal(iniziali(''), '');
  });
});
