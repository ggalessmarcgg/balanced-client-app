import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { RigaRevisione } from './letture.ts';
import { applicaModifica, applicaModifiche, leggibile, pianificaApertura, pianificaLetta, posizioneNelCiclo, statiDiPartenza, unisciConLocale } from './lettura.ts';

const ADESSO = new Date('2026-10-21T10:00:00.000Z');
const riga = (status: string): RigaRevisione => ({ id: 'r', review_number: 1, status, submissions_count: 7, review_author_id: null, sent_at: '2026-10-20T10:00:00Z', opened_at: null, read_at: null });

describe('le due scritture del cliente', () => {
  it('apertura solo da sent: status = opened e opened_at, nient\'altro', () => {
    const op = pianificaApertura(riga('sent'), ADESSO);
    assert.deepEqual(op, { tipo: 'scrivi', modifica: { tipo: 'apertura', id: 'r', campi: { status: 'opened', opened_at: ADESSO.toISOString() } } });
    for (const s of ['opened', 'read', 'unlocked', 'draft', 'on_going']) assert.deepEqual(pianificaApertura(riga(s), ADESSO), { tipo: 'nessuna' });
  });
  it('letta appena il piè di pagina è raggiunto, da opened o sent: status = read e read_at, nessuna attesa', () => {
    for (const s of ['opened', 'sent']) {
      assert.deepEqual(pianificaLetta(riga(s), ADESSO), { tipo: 'scrivi', modifica: { tipo: 'letta', id: 'r', campi: { status: 'read', read_at: ADESSO.toISOString() } } });
    }
    for (const s of ['read', 'unlocked', 'draft', 'on_going']) assert.deepEqual(pianificaLetta(riga(s), ADESSO), { tipo: 'nessuna' });
  });
  it('filtri della scrittura: apertura da sent; letta da opened o sent', () => {
    assert.deepEqual([...statiDiPartenza({ tipo: 'apertura', id: 'r', campi: { status: 'opened', opened_at: 'x' } })], ['sent']);
    assert.deepEqual([...statiDiPartenza({ tipo: 'letta', id: 'r', campi: { status: 'read', read_at: 'x' } })], ['opened', 'sent']);
  });
  it('la cache si aggiorna subito e resta aggiornata anche se il server rilegge lo stato vecchio', () => {
    const apertura = { tipo: 'apertura' as const, id: 'r', campi: { status: 'opened' as const, opened_at: 'A' } };
    const letta = { tipo: 'letta' as const, id: 'r', campi: { status: 'read' as const, read_at: 'B' } };
    const dopoApertura = applicaModifica([riga('sent')], apertura);
    assert.equal(dopoApertura[0]?.status, 'opened');
    assert.equal(dopoApertura[0]?.opened_at, 'A');
    const dopoLetta = applicaModifiche([riga('sent')], [apertura, letta]);
    assert.equal(dopoLetta[0]?.status, 'read');
    assert.equal(dopoLetta[0]?.read_at, 'B');
    assert.equal(dopoLetta[0]?.opened_at, 'A');
    // Già letta sul server: la modifica di apertura in attesa non la riporta indietro.
    assert.equal(applicaModifica([riga('read')], apertura)[0]?.status, 'read');
    // Un'altra riga non si tocca.
    assert.equal(applicaModifica([{ ...riga('sent'), id: 'altra' }], apertura)[0]?.status, 'sent');
  });
  it('la lettura si apre per sent, opened e read; mai per unlocked, draft, on_going o righe assenti', () => {
    for (const s of ['sent', 'opened', 'read']) assert.equal(leggibile(riga(s)), true);
    for (const s of ['unlocked', 'draft', 'on_going']) assert.equal(leggibile(riga(s)), false);
    assert.equal(leggibile(undefined), false);
  });
});

describe('rilettura dal server con la copia locale', () => {
  it('gli stati vanno in una sola direzione', () => {
    assert.deepEqual(['on_going', 'unlocked', 'draft', 'sent', 'opened', 'read', 'altro'].map(posizioneNelCiclo), [0, 1, 2, 3, 4, 5, -1]);
  });
  it('una riga più avanti in locale (appena aperta o letta) non torna indietro; le altre seguono il server', () => {
    const locali = [{ ...riga('read'), opened_at: 'A', read_at: 'B' }, { ...riga('sent'), id: 'x' }];
    const server = [riga('sent'), { ...riga('opened'), id: 'x', opened_at: 'S' }, { ...riga('on_going'), id: 'nuova' }];
    const unite = unisciConLocale(server, locali);
    assert.deepEqual(unite.map((r) => [r.id, r.status, r.opened_at, r.read_at]), [
      ['r', 'read', 'A', 'B'],
      ['x', 'opened', 'S', null],
      ['nuova', 'on_going', null, null],
    ]);
  });
});
