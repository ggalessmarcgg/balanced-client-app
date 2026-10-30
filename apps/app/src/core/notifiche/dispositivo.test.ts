import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { azionePerPermesso, modificaDisattivazione, modificaPermesso, modificaRegistrazione, permessoDaStato, rigaDaInserire, scegliRiga, type DatiTelefono, type RigaDispositivo } from './dispositivo.ts';

const ADESSO = new Date('2026-10-30T10:00:00.000Z');
const dati: DatiTelefono = { piattaforma: 'android', token: 'fcm-abc', installationId: 'inst-1', permesso: 'granted', appVersion: '0.1.0', osVersion: '17', deviceModel: 'Pixel 9a' };
const riga = (extra: Partial<RigaDispositivo> = {}): RigaDispositivo => ({ id: 'd1', token: 'fcm-abc', permission_status: 'undetermined', disabled_at: null, installation_id: 'inst-1', ...extra });

describe('registro dei telefoni (contratto §4)', () => {
  it('prima registrazione: riga attiva con fornitore, codice, permesso, versioni e ultimo accesso', () => {
    assert.deepEqual(rigaDaInserire('c1', 'u1', dati, ADESSO), {
      client_id: 'c1',
      user_id: 'u1',
      platform: 'android',
      provider: 'fcm',
      token: 'fcm-abc',
      installation_id: 'inst-1',
      permission_status: 'granted',
      app_version: '0.1.0',
      os_version: '17',
      device_model: 'Pixel 9a',
      last_seen_at: ADESSO.toISOString(),
    });
    assert.equal(rigaDaInserire('c1', 'u1', { ...dati, piattaforma: 'ios' }, ADESSO).provider, 'apns');
  });

  it('a ogni avvio la riga si aggiorna e torna attiva; il codice si riscrive solo se cambiato', () => {
    const m = modificaRegistrazione(riga({ disabled_at: '2026-10-29T00:00:00.000Z' }), dati, ADESSO);
    assert.deepEqual(m, { permission_status: 'granted', app_version: '0.1.0', os_version: '17', device_model: 'Pixel 9a', last_seen_at: ADESSO.toISOString(), disabled_at: null, disabled_reason: null });
    const conCodiceNuovo = modificaRegistrazione(riga({ token: 'fcm-vecchio' }), dati, ADESSO);
    assert.equal(conCodiceNuovo.token, 'fcm-abc');
    const conInstallazioneNuova = modificaRegistrazione(riga({ installation_id: null }), dati, ADESSO);
    assert.equal(conInstallazioneNuova.installation_id, 'inst-1');
  });

  it('"Esci" disattiva con motivo logout; il permesso si aggiorna da solo', () => {
    assert.deepEqual(modificaDisattivazione('logout', ADESSO), { disabled_at: ADESSO.toISOString(), disabled_reason: 'logout' });
    assert.deepEqual(modificaPermesso('denied', ADESSO), { permission_status: 'denied', last_seen_at: ADESSO.toISOString() });
  });

  it('ritrova la propria riga per installazione, poi per codice', () => {
    const altra = riga({ id: 'd2', installation_id: 'inst-2', token: 'fcm-altro' });
    assert.equal(scegliRiga([altra, riga()], dati)?.id, 'd1');
    assert.equal(scegliRiga([altra, riga({ installation_id: null })], dati)?.id, 'd1');
    assert.equal(scegliRiga([altra], dati), null);
  });

  it('permesso di sistema → colonna e azione in Account (contratto §5)', () => {
    assert.equal(permessoDaStato('granted'), 'granted');
    assert.equal(permessoDaStato('denied'), 'denied');
    assert.equal(permessoDaStato('undetermined'), 'undetermined');
    assert.equal(permessoDaStato('altro'), 'undetermined');
    assert.equal(azionePerPermesso('granted', true), 'nessuna');
    assert.equal(azionePerPermesso('undetermined', true), 'attiva');
    assert.equal(azionePerPermesso('denied', true), 'attiva');
    assert.equal(azionePerPermesso('denied', false), 'impostazioni');
  });
});
