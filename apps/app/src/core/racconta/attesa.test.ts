import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { fileDaCancellare, leggiNotaAttesa, leggiNotaTesto, nomeFileRegistrazione, notaAudioInAttesa, notaTestoInAttesa } from './attesa.ts';

const AUDIO = { uri: 'file:///doc/ExpoAudio/racconto-2026-10-23.m4a', durataMs: 88_000, data: '2026-10-23' };

describe('audio in attesa', () => {
  it('la nota di oggi dello stesso cliente è da trascrivere', () => {
    const nota = notaAudioInAttesa(AUDIO, 'c1', '2026-10-23T10:00:00.000Z');
    assert.deepEqual(leggiNotaAttesa(nota, 'c1', '2026-10-23'), { tipo: 'daTrascrivere', audio: AUDIO });
  });

  it('la nota di un altro giorno è scaduta: il file va cancellato', () => {
    const nota = notaAudioInAttesa(AUDIO, 'c1', '2026-10-23T10:00:00.000Z');
    assert.deepEqual(leggiNotaAttesa(nota, 'c1', '2026-10-24'), { tipo: 'scaduto', uri: AUDIO.uri });
  });

  it('nota di un altro cliente o malformata: nessun audio', () => {
    const nota = notaAudioInAttesa(AUDIO, 'c1', '2026-10-23T10:00:00.000Z');
    assert.deepEqual(leggiNotaAttesa(nota, 'c2', '2026-10-23'), { tipo: 'nessuno' });
    assert.deepEqual(leggiNotaAttesa(null, 'c1', '2026-10-23'), { tipo: 'nessuno' });
    assert.deepEqual(leggiNotaAttesa({ uri: '', durataMs: 1, data: '2026-10-23', clientId: 'c1' }, 'c1', '2026-10-23'), { tipo: 'nessuno' });
    assert.deepEqual(leggiNotaAttesa('testo', 'c1', '2026-10-23'), { tipo: 'nessuno' });
  });

  it('un file per giorno; si cancellano tutti gli altri file di registrazione', () => {
    assert.equal(nomeFileRegistrazione('2026-10-23'), 'racconto-2026-10-23');
    assert.deepEqual(fileDaCancellare(['racconto-2026-10-22.m4a', 'racconto-2026-10-23.m4a', 'altro.m4a'], 'racconto-2026-10-23.m4a'), ['racconto-2026-10-22.m4a']);
    assert.deepEqual(fileDaCancellare(['racconto-2026-10-22.m4a', 'racconto-2026-10-23.m4a'], null), ['racconto-2026-10-22.m4a', 'racconto-2026-10-23.m4a']);
  });
});

describe('testo in attesa', () => {
  const RACCONTO = { testo: 'A colazione…', durataMs: 88_000, data: '2026-10-23' };
  it('il testo di oggi dello stesso cliente si riprende; di un altro giorno è scaduto; altrimenti nulla', () => {
    const nota = notaTestoInAttesa(RACCONTO, 'c1', '2026-10-23T10:00:00.000Z');
    assert.deepEqual(leggiNotaTesto(nota, 'c1', '2026-10-23'), { tipo: 'daRiprendere', racconto: RACCONTO });
    assert.deepEqual(leggiNotaTesto(nota, 'c1', '2026-10-24'), { tipo: 'scaduto' });
    assert.deepEqual(leggiNotaTesto(nota, 'c2', '2026-10-23'), { tipo: 'nessuno' });
    assert.deepEqual(leggiNotaTesto({ testo: 1 }, 'c1', '2026-10-23'), { tipo: 'nessuno' });
  });
});
