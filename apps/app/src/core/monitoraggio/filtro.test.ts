import assert from 'node:assert/strict';
import { test } from 'node:test';

import { etichetteSicure, messaggioSicuro, nomeSchermata, pulisciBreadcrumb, pulisciEvento, pulisciUrl } from './filtro.ts';

const UUID = '35fb4c5b-1234-4abc-8def-0123456789ab';

test('pulisciUrl: via query string e frammento, resta host e percorso', () => {
  assert.equal(pulisciUrl(`https://x.supabase.co/rest/v1/daily_submissions?user_id=eq.${UUID}&diary_date=eq.2026-11-02`), 'https://x.supabase.co/rest/v1/daily_submissions');
  assert.equal(pulisciUrl('https://agenti/v1/diario-vocale/trascrivi'), 'https://agenti/v1/diario-vocale/trascrivi');
  assert.equal(pulisciUrl('/abbonato?giornata=2026-11-02#x'), '/abbonato');
  assert.equal(pulisciUrl(undefined), undefined);
  assert.equal(pulisciUrl(42), undefined);
});

test('messaggioSicuro: identificativi, email, indirizzi, date e token sostituiti; contenuti tra virgolette e righe successive tolti; 160 caratteri', () => {
  assert.equal(messaggioSicuro(`riga ${UUID} del 2026-11-02T10:00:00Z per aless.marchetto6+test4@gmail.com su https://x.supabase.co/rest/v1/a?b=1`), 'riga <id> del <data> per <email> su <url>');
  assert.equal(messaggioSicuro("Cannot read property 'colazione' of undefined"), "Cannot read property 'colazione' of undefined");
  assert.equal(messaggioSicuro('invalid input syntax for type json: "a colazione ho mangiato pane e marmellata con un caffè"'), 'invalid input syntax for type json: "<testo>"');
  assert.equal(messaggioSicuro('prima riga\nseconda riga con il racconto'), 'prima riga');
  assert.equal(messaggioSicuro('Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV'), 'Bearer <token>');
  const lungo = messaggioSicuro('m'.repeat(200));
  assert.equal(lungo?.length, 161);
  assert.equal(messaggioSicuro(undefined), undefined);
  assert.equal(messaggioSicuro(''), '');
});

test('nomeSchermata: rotta senza parametri né identificativi', () => {
  assert.equal(nomeSchermata('/abbonato?giornata=2026-11-02'), '/abbonato');
  assert.equal(nomeSchermata(`/revisione/${UUID}`), '/revisione/[id]');
  assert.equal(nomeSchermata('/contenuti/42'), '/contenuti/[id]');
  assert.equal(nomeSchermata('/ricette/abc'), '/ricette/[id]');
  assert.equal(nomeSchermata('(abbonato)/abbonato'), '(abbonato)/abbonato');
  assert.equal(nomeSchermata(undefined), undefined);
});

test('pulisciBreadcrumb: console via; rete con metodo, stato e indirizzo pulito; navigazione con le sole schermate; il resto senza dati', () => {
  assert.equal(pulisciBreadcrumb({ category: 'console', message: 'log con il racconto' }), null);
  assert.equal(pulisciBreadcrumb(null), null);
  assert.deepEqual(
    pulisciBreadcrumb({ category: 'fetch', type: 'http', level: 'info', timestamp: 1, message: 'via', data: { method: 'PATCH', status_code: 204, url: `https://x.supabase.co/rest/v1/daily_submissions?id=eq.${UUID}`, request_body_size: 10 } }),
    { category: 'fetch', type: 'http', level: 'info', timestamp: 1, message: undefined, data: { method: 'PATCH', status_code: 204, url: 'https://x.supabase.co/rest/v1/daily_submissions' } },
  );
  assert.deepEqual(
    pulisciBreadcrumb({ category: 'navigation', type: 'navigation', message: 'Navigation to x', data: { from: 'abbonato?giornata=2026-11-02', to: `revisione/${UUID}` } }),
    { category: 'navigation', type: 'navigation', message: undefined, data: { from: 'abbonato', to: 'revisione/[id]' } },
  );
  assert.deepEqual(pulisciBreadcrumb({ category: 'touch', type: 'user', message: 'Touch event within element: Pulsante', data: { path: [] } }), { category: 'touch', type: 'user', message: 'Touch event within element: Pulsante', data: undefined });
  const altro = pulisciBreadcrumb({ category: 'app.lifecycle', message: 'm'.repeat(200), data: { testo: 'via' } });
  assert.equal(altro?.data, undefined);
  assert.equal(altro?.message?.length, 161);
});

test('pulisciEvento: via request, user e nome del telefono; messaggi resi sicuri; breadcrumb ripuliti; il resto intatto', () => {
  const evento = {
    event_id: 'e1',
    message: `fallito per ${UUID}`,
    request: { headers: { Authorization: 'Bearer x' } },
    user: { id: 'u' },
    contexts: { device: { name: 'iPhone di Alessandro', model: 'iPhone17,3' }, app: { app_version: '1.0.0', app_build: '2' } },
    exception: { values: [{ type: 'TypeError', value: 'Cannot read property "pasti" of undefined\nstack', stacktrace: { frames: [] } }] },
    breadcrumbs: [{ category: 'console', message: 'via' }, { category: 'xhr', data: { method: 'GET', status_code: 200, url: 'https://a/b?c=1' } }],
    tags: { schermata: '/abbonato' },
  };
  const pulito = pulisciEvento(evento);
  assert.equal('request' in pulito, false);
  assert.equal('user' in pulito, false);
  assert.deepEqual(pulito.contexts, { device: { model: 'iPhone17,3' }, app: { app_version: '1.0.0', app_build: '2' } });
  assert.equal(pulito.message, 'fallito per <id>');
  assert.deepEqual(pulito.exception, { values: [{ type: 'TypeError', value: 'Cannot read property "pasti" of undefined', stacktrace: { frames: [] } }] });
  assert.deepEqual(pulito.breadcrumbs, [{ category: 'xhr', message: undefined, data: { method: 'GET', status_code: 200, url: 'https://a/b' } }]);
  assert.deepEqual(pulito.tags, { schermata: '/abbonato' });
  assert.equal(pulito.event_id, 'e1');
  // L'evento originale non viene modificato.
  assert.equal('request' in evento, true);
});

test('etichetteSicure: solo scalari brevi', () => {
  assert.deepEqual(etichetteSicure({ origine: 'avvio', stato: 'J', n: 3, ok: false, vuoto: '', lungo: 'x'.repeat(81), oggetto: { a: 1 }, nullo: null }), { origine: 'avvio', stato: 'J', n: '3', ok: 'false' });
});
