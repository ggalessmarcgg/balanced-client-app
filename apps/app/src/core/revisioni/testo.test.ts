import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { blocchiDiSezione, testoRevisione } from './testo.ts';

describe('testo della revisione', () => {
  it('tre sezioni con le etichette di web app e CRM, nell\'ordine generale, correlazione, spunti e consigli', () => {
    const t = testoRevisione({ spunti_consigli: 'Spunto.', generale: 'Bene.', correlazione: 'Nesso.' });
    assert.deepEqual(
      t.sezioni.map((s) => [s.chiave, s.etichetta]),
      [
        ['generale', 'Generale'],
        ['correlazione', 'Correlazione'],
        ['spunti_consigli', 'Spunti e consigli'],
      ],
    );
  });
  it('le sezioni vuote (stringa vuota, spazi, assenti) si nascondono', () => {
    const t = testoRevisione({ generale: 'Bene.', correlazione: '', spunti_consigli: '  \n ' });
    assert.deepEqual(
      t.sezioni.map((s) => s.chiave),
      ['generale'],
    );
    assert.deepEqual(testoRevisione({ generale: 'Solo questa' }).sezioni.map((s) => s.chiave), ['generale']);
  });
  it('forme non previste (null, testo puro, array) → nessuna sezione, incipit vuoto', () => {
    for (const v of [null, undefined, 'testo', ['a'], 42]) {
      const t = testoRevisione(v);
      assert.deepEqual(t.sezioni, []);
      assert.equal(t.incipit, '');
      assert.equal(t.caratteri, 0);
    }
  });
  it('a capo preservati nei paragrafi; una riga vuota separa i paragrafi', () => {
    assert.deepEqual(blocchiDiSezione('Prima riga\nSeconda riga\n\nAltro paragrafo'), [
      { tipo: 'paragrafo', testo: 'Prima riga\nSeconda riga' },
      { tipo: 'paragrafo', testo: 'Altro paragrafo' },
    ]);
  });
  it('righe con "- ", "* " o "• " → elenco puntato, anche tra paragrafi', () => {
    assert.deepEqual(blocchiDiSezione('Consigli:\n- primo\n* secondo\n• terzo\nChiusura'), [
      { tipo: 'paragrafo', testo: 'Consigli:' },
      { tipo: 'elenco', voci: ['primo', 'secondo', 'terzo'] },
      { tipo: 'paragrafo', testo: 'Chiusura' },
    ]);
  });
  it('un trattino senza spazio non è un elenco; il "**" residuo sparisce; i ritorni a capo di Windows si normalizzano', () => {
    assert.deepEqual(blocchiDiSezione('-5 kg in un mese\r\n**Bene** così'), [{ tipo: 'paragrafo', testo: '-5 kg in un mese\nBene così' }]);
  });
  it('incipit: prima riga di Generale senza marcatori; anteprima con gli a capo; caratteri = etichette + testi', () => {
    const t = testoRevisione({ generale: '- Ottima settimana!\nContinua così.', correlazione: '', spunti_consigli: 'Spunto' });
    assert.equal(t.incipit, 'Ottima settimana!');
    assert.equal(t.anteprima, 'Ottima settimana!\nContinua così.');
    assert.equal(t.caratteri, 'Generale'.length + 'Ottima settimana!'.length + 'Continua così.'.length + 'Spunti e consigli'.length + 'Spunto'.length);
  });
  it('senza Generale l\'incipit viene dalla prima sezione piena', () => {
    assert.equal(testoRevisione({ generale: '', correlazione: 'Nesso chiaro.' }).incipit, 'Nesso chiaro.');
  });
});
