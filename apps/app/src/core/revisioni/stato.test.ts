import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { RigaRevisione } from './letture.ts';
import { dataRoma, etichettaDiari, frazioneAvanzamento, nuovaPresente, sezioneRevisioni } from './stato.ts';

const riga = (review_number: number, status: string, extra: Partial<RigaRevisione> = {}): RigaRevisione => ({
  id: `r${review_number}`,
  review_number,
  status,
  submissions_count: status === 'on_going' ? 3 : 7,
  review_author_id: null,
  sent_at: null,
  opened_at: null,
  read_at: null,
  ...extra,
});
const descrivi = (s: ReturnType<typeof sezioneRevisioni>) => s.attive.map((c) => `${c.numero}:${c.tipo}`).join(' ');

describe('card di avanzamento', () => {
  it('nessuna riga → Inizia 1, 0 su 7, con il testo della prima revisione', () => {
    const s = sezioneRevisioni([]);
    assert.deepEqual(s.attive, [{ tipo: 'inizia', id: null, numero: 1, diari: 0, primaRevisione: true }]);
    assert.deepEqual(s.passate, []);
    assert.equal(s.nuovaPresente, false);
  });
  it('on_going → Da sbloccare con submissions_count; testo solo sulla revisione 1', () => {
    const s = sezioneRevisioni([riga(1, 'on_going', { submissions_count: 3 })]);
    assert.deepEqual(s.attive, [{ tipo: 'daSbloccare', id: 'r1', numero: 1, diari: 3, primaRevisione: true }]);
    const s2 = sezioneRevisioni([riga(1, 'read'), riga(2, 'on_going', { submissions_count: 5 })]);
    assert.deepEqual(s2.attive[0], { tipo: 'daSbloccare', id: 'r2', numero: 2, diari: 5, primaRevisione: false });
  });
  it('la riga più alta non è on_going → Inizia virtuale con numero massimo + 1, senza testo', () => {
    const s = sezioneRevisioni([riga(12, 'read'), riga(13, 'sent')]);
    assert.deepEqual(s.attive[0], { tipo: 'inizia', id: null, numero: 14, diari: 0, primaRevisione: false });
  });
  it('unlocked e draft → In elaborazione, sotto la card di avanzamento', () => {
    assert.equal(descrivi(sezioneRevisioni([riga(13, 'unlocked'), riga(12, 'read')])), '14:inizia 13:inElaborazione');
    assert.equal(descrivi(sezioneRevisioni([riga(13, 'draft'), riga(14, 'on_going')])), '14:daSbloccare 13:inElaborazione');
  });
  it('frazione della barra: 0 → 0, 3 → 3/7, 7 e oltre (contatore legacy) → 1', () => {
    assert.equal(frazioneAvanzamento(0), 0);
    assert.equal(frazioneAvanzamento(3), 3 / 7);
    assert.equal(frazioneAvanzamento(7), 1);
    assert.equal(frazioneAvanzamento(12), 1);
  });
  it('etichetta dei diari al singolare solo per 1', () => {
    assert.equal(etichettaDiari(0), '0 diari');
    assert.equal(etichettaDiari(1), '1 diario');
    assert.equal(etichettaDiari(7), '7 diari');
  });
});

describe('revisioni Nuove', () => {
  it('più Nuove insieme: tutte tra le card attive, dalla più vecchia alla più recente (sent_at crescente)', () => {
    const s = sezioneRevisioni([
      riga(11, 'sent', { sent_at: '2026-10-09T10:00:00Z' }),
      riga(10, 'sent', { sent_at: '2026-10-02T10:00:00Z' }),
      riga(12, 'on_going', { submissions_count: 2 }),
    ]);
    assert.equal(descrivi(s), '12:daSbloccare 10:nuova 11:nuova');
    assert.equal(s.nuovaPresente, true);
    assert.equal(nuovaPresente([riga(1, 'opened')]), false);
  });
  it('Da sbloccare, In elaborazione e Nuova possono coesistere', () => {
    const s = sezioneRevisioni([riga(13, 'sent', { sent_at: '2026-10-09T10:00:00Z' }), riga(14, 'unlocked'), riga(15, 'on_going')]);
    assert.equal(descrivi(s), '15:daSbloccare 14:inElaborazione 13:nuova');
  });
  it('la Nuova porta autrice e data di invio', () => {
    const s = sezioneRevisioni([riga(3, 'sent', { sent_at: '2026-10-09T10:00:00Z', review_author_id: 'a1' })]);
    assert.deepEqual(s.attive[1], { tipo: 'nuova', id: 'r3', numero: 3, autoreId: 'a1', sentAt: '2026-10-09T10:00:00Z' });
  });
});

describe('revisioni passate', () => {
  it('opened e read in elenco per sent_at decrescente, con "Revisione N · giorno mese" in ora italiana', () => {
    const s = sezioneRevisioni([
      riga(10, 'read', { sent_at: '2026-09-18T10:00:00Z' }),
      riga(12, 'opened', { sent_at: '2026-10-02T10:00:00Z' }),
      riga(11, 'read', { sent_at: '2026-09-25T10:00:00Z' }),
    ]);
    assert.deepEqual(
      s.passate.map((p) => p.titolo),
      ['Revisione 12 · 2 ottobre', 'Revisione 11 · 25 settembre', 'Revisione 10 · 18 settembre'],
    );
  });
  it('sul legacy l\'invio non segue il numero: vince sent_at; senza sent_at si usa apertura o lettura, poi il numero', () => {
    const s = sezioneRevisioni([
      riga(5, 'read', { sent_at: '2026-01-10T10:00:00Z' }),
      riga(4, 'read', { sent_at: '2026-02-10T10:00:00Z' }),
      riga(3, 'read', { opened_at: '2026-03-10T10:00:00Z' }),
      riga(2, 'read'),
      riga(1, 'read'),
    ]);
    assert.deepEqual(
      s.passate.map((p) => p.numero),
      [3, 4, 5, 2, 1],
    );
    assert.equal(s.passate[3]?.titolo, 'Revisione 2');
  });
  it('la data è quella italiana: un invio alle 23:30 UTC del 1° ottobre è il 2 ottobre a Roma', () => {
    assert.equal(dataRoma('2026-10-01T23:30:00Z'), '2026-10-02');
    assert.equal(dataRoma('non valido'), null);
    assert.equal(dataRoma(null), null);
  });
});
