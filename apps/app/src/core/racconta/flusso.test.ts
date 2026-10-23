import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { SOGLIA_ARRESTO_MS } from './audio.ts';
import { riduci, STATO_INIZIALE, statoScaduto, type EventoRacconta, type StatoRacconta } from './flusso.ts';
import { erroreApp, type ErroreTrascrizione } from './server.ts';

const AUDIO = { uri: 'file:///doc/ExpoAudio/racconto-2026-10-23.m4a', durataMs: 88_000, data: '2026-10-23' };
const errore = (esito: ErroreTrascrizione['esito'], codice = 'x'): ErroreTrascrizione => ({ esito, codice, messaggio: 'm', richiestaId: 'r', httpStatus: 500 });

/** Applica una sequenza di eventi e restituisce stato finale ed effetti di ogni passo. */
function esegui(iniziale: StatoRacconta, eventi: EventoRacconta[]) {
  let stato = iniziale;
  const effetti = [];
  for (const e of eventi) {
    const t = riduci(stato, e);
    stato = t.stato;
    effetti.push(t.effetti);
  }
  return { stato, effetti };
}

describe('flusso: avvio e permesso', () => {
  it('permesso concesso → Pronto; negato → Microfono disattivato; da chiedere → Permesso', () => {
    assert.deepEqual(riduci(STATO_INIZIALE, { tipo: 'avviato', permesso: 'concesso', audioInAttesa: null }).stato, { tipo: 'pronto', avviso: 'nessuno' });
    assert.deepEqual(riduci(STATO_INIZIALE, { tipo: 'avviato', permesso: 'negato', audioInAttesa: null }).stato, { tipo: 'microfonoDisattivato' });
    assert.deepEqual(riduci(STATO_INIZIALE, { tipo: 'avviato', permesso: 'daChiedere', audioInAttesa: null }).stato, { tipo: 'permesso', inRichiesta: false });
  });

  it('un audio di oggi in attesa riparte dalla trascrizione, qualunque sia il permesso', () => {
    const t = riduci(STATO_INIZIALE, { tipo: 'avviato', permesso: 'negato', audioInAttesa: AUDIO });
    assert.deepEqual(t.stato, { tipo: 'trascrizione', audio: AUDIO });
    assert.deepEqual(t.effetti, [{ tipo: 'trascrivi', audio: AUDIO }]);
  });

  it('"Consenti" chiede il permesso di sistema una sola volta; la risposta porta a Pronto o a Microfono disattivato', () => {
    const permesso: StatoRacconta = { tipo: 'permesso', inRichiesta: false };
    const t = riduci(permesso, { tipo: 'consenti' });
    assert.deepEqual(t.effetti, [{ tipo: 'chiediPermesso' }]);
    assert.deepEqual(riduci(t.stato, { tipo: 'consenti' }).effetti, []);
    assert.deepEqual(riduci(t.stato, { tipo: 'permessoRisposto', concesso: true }).stato, { tipo: 'pronto', avviso: 'nessuno' });
    assert.deepEqual(riduci(t.stato, { tipo: 'permessoRisposto', concesso: false }).stato, { tipo: 'microfonoDisattivato' });
  });

  it('dalle impostazioni si torna con il permesso concesso → Pronto', () => {
    assert.deepEqual(riduci({ tipo: 'microfonoDisattivato' }, { tipo: 'permessoRisposto', concesso: true }).stato, { tipo: 'pronto', avviso: 'nessuno' });
  });
});

describe('flusso: registrazione', () => {
  const pronto: StatoRacconta = { tipo: 'pronto', avviso: 'nessuno' };

  it('"Tocca per iniziare" avvia il registratore; il tempo e il livello avanzano', () => {
    const avvio = riduci(pronto, { tipo: 'avvia' });
    assert.deepEqual(avvio.effetti, [{ tipo: 'avviaRegistrazione' }]);
    const t = riduci(avvio.stato, { tipo: 'avanzamento', durataMs: 1_250, registrando: true, livelloDb: -25 });
    assert.deepEqual(t.stato, { tipo: 'registrazione', durataMs: 1_250, inPausa: false, fermando: false, livelli: [0.5] });
  });

  it('se il registratore non parte si torna a Pronto con l’avviso', () => {
    const { stato } = esegui(pronto, [{ tipo: 'avvia' }, { tipo: 'registrazioneNonRiuscita' }]);
    assert.deepEqual(stato, { tipo: 'pronto', avviso: 'registrazioneNonRiuscita' });
  });

  it('al limite dei 3 minuti si ferma da sola, una volta sola', () => {
    const { stato, effetti } = esegui(pronto, [
      { tipo: 'avvia' },
      { tipo: 'avanzamento', durataMs: SOGLIA_ARRESTO_MS - 1, registrando: true },
      { tipo: 'avanzamento', durataMs: SOGLIA_ARRESTO_MS, registrando: true },
      { tipo: 'avanzamento', durataMs: SOGLIA_ARRESTO_MS + 250, registrando: true },
      { tipo: 'ferma' },
    ]);
    assert.deepEqual(effetti[1], []);
    assert.deepEqual(effetti[2], [{ tipo: 'fermaRegistrazione', motivo: 'limite' }]);
    assert.deepEqual(effetti[3], []);
    assert.deepEqual(effetti[4], []);
    assert.equal(stato.tipo === 'registrazione' && stato.fermando, true);
  });

  it('pausa e ripresa (app in secondo piano): il registratore si ferma e riparte, il tempo non va indietro', () => {
    const { stato, effetti } = esegui(pronto, [
      { tipo: 'avvia' },
      { tipo: 'avanzamento', durataMs: 10_000, registrando: true },
      { tipo: 'pausa' },
      { tipo: 'pausa' },
      { tipo: 'avanzamento', durataMs: 10_000, registrando: false },
      { tipo: 'riprendi' },
      { tipo: 'avanzamento', durataMs: 12_000, registrando: true },
    ]);
    assert.deepEqual(effetti[2], [{ tipo: 'mettiInPausa' }]);
    assert.deepEqual(effetti[3], []);
    assert.deepEqual(effetti[5], [{ tipo: 'riprendiRegistrazione' }]);
    assert.deepEqual(stato, { tipo: 'registrazione', durataMs: 12_000, inPausa: false, fermando: false, livelli: [0, 0] });
  });

  it('una chiamata interrompe il registratore: la lettura lo segnala come in pausa senza effetti', () => {
    const { stato, effetti } = esegui(pronto, [{ tipo: 'avvia' }, { tipo: 'avanzamento', durataMs: 5_000, registrando: true }, { tipo: 'avanzamento', durataMs: 5_000, registrando: false }]);
    assert.equal(stato.tipo === 'registrazione' && stato.inPausa, true);
    assert.deepEqual(effetti[2], []);
  });

  it('lo stop del cliente ferma il registratore; il file registrato parte verso il server e si salva sul telefono', () => {
    const { stato, effetti } = esegui(pronto, [{ tipo: 'avvia' }, { tipo: 'ferma' }, { tipo: 'registrata', audio: AUDIO }, { tipo: 'registrata', audio: AUDIO }]);
    assert.deepEqual(effetti[1], [{ tipo: 'fermaRegistrazione', motivo: 'tocco' }]);
    assert.deepEqual(effetti[2], [
      { tipo: 'salvaAudio', audio: AUDIO },
      { tipo: 'trascrivi', audio: AUDIO },
    ]);
    assert.deepEqual(effetti[3], []);
    assert.deepEqual(stato, { tipo: 'trascrizione', audio: AUDIO });
  });
});

describe('flusso: trascrizione', () => {
  const trascrizione: StatoRacconta = { tipo: 'trascrizione', audio: AUDIO };

  it('testo ricevuto → Il tuo racconto, e l’audio si cancella subito', () => {
    const t = riduci(trascrizione, { tipo: 'trascritta', testo: 'A colazione…', durataMs: 88_000 });
    assert.deepEqual(t.stato, { tipo: 'racconto', testo: 'A colazione…', durataMs: 88_000, data: '2026-10-23' });
    assert.deepEqual(t.effetti, [{ tipo: 'cancellaAudio', uri: AUDIO.uri }]);
  });

  it('senza rete → Senza connessione con l’audio conservato; il nuovo tentativo silenzioso non cambia schermata', () => {
    const offline = riduci(trascrizione, { tipo: 'trascrizioneFallita', errore: erroreApp('rete', null) });
    assert.deepEqual(offline.stato, { tipo: 'senzaConnessione', audio: AUDIO, inRiprova: false });
    assert.deepEqual(offline.effetti, []);
    const silenzioso = riduci(offline.stato, { tipo: 'riprova', silenzioso: true });
    assert.deepEqual(silenzioso.stato, { tipo: 'senzaConnessione', audio: AUDIO, inRiprova: true });
    assert.deepEqual(silenzioso.effetti, [{ tipo: 'trascrivi', audio: AUDIO }]);
    assert.deepEqual(riduci(silenzioso.stato, { tipo: 'riprova', silenzioso: true }).effetti, []);
    const ancoraOffline = riduci(silenzioso.stato, { tipo: 'trascrizioneFallita', errore: erroreApp('rete', null) });
    assert.deepEqual(ancoraOffline.stato, { tipo: 'senzaConnessione', audio: AUDIO, inRiprova: false });
    const riuscita = riduci(silenzioso.stato, { tipo: 'trascritta', testo: 'T', durataMs: 1 });
    assert.equal(riuscita.stato.tipo, 'racconto');
    assert.deepEqual(riuscita.effetti, [{ tipo: 'cancellaAudio', uri: AUDIO.uri }]);
  });

  it('errore riprovabile → schermata con "Riprova" e audio conservato; "Riprova" ritrascrive', () => {
    const t = riduci(trascrizione, { tipo: 'trascrizioneFallita', errore: errore('riprovabile') });
    assert.deepEqual(t.stato, { tipo: 'errore', audio: AUDIO, errore: errore('riprovabile') });
    assert.deepEqual(t.effetti, []);
    const r = riduci(t.stato, { tipo: 'riprova' });
    assert.deepEqual(r.stato, { tipo: 'trascrizione', audio: AUDIO });
    assert.deepEqual(r.effetti, [{ tipo: 'trascrivi', audio: AUDIO }]);
  });

  it('errori definitivi (sessione, non disponibile, richiesta rifiutata) → schermata senza "Riprova", audio cancellato', () => {
    for (const esito of ['sessione', 'nonDisponibile', 'definitivo'] as const) {
      const t = riduci(trascrizione, { tipo: 'trascrizioneFallita', errore: errore(esito) });
      assert.deepEqual(t.stato, { tipo: 'errore', audio: null, errore: errore(esito) });
      assert.deepEqual(t.effetti, [{ tipo: 'cancellaAudio', uri: AUDIO.uri }]);
      assert.deepEqual(riduci(t.stato, { tipo: 'riprova' }).effetti, []);
      assert.deepEqual(riduci(t.stato, { tipo: 'ricomincia' }).stato, { tipo: 'pronto', avviso: 'nessuno' });
    }
  });

  it('esiti arrivati fuori tempo (schermata già cambiata) non fanno nulla', () => {
    const pronto: StatoRacconta = { tipo: 'pronto', avviso: 'nessuno' };
    assert.deepEqual(riduci(pronto, { tipo: 'trascritta', testo: 'T', durataMs: 1 }), { stato: pronto, effetti: [] });
    assert.deepEqual(riduci(pronto, { tipo: 'trascrizioneFallita', errore: erroreApp('rete', null) }), { stato: pronto, effetti: [] });
  });
});

describe('flusso: il tuo racconto', () => {
  const racconto: StatoRacconta = { tipo: 'racconto', testo: 'Ciao', durataMs: 88_000, data: '2026-10-23' };

  it('il testo si modifica a mano', () => {
    assert.deepEqual(riduci(racconto, { tipo: 'modificaTesto', testo: 'Ciao a tutti' }).stato, { ...racconto, testo: 'Ciao a tutti' });
  });

  it('"Ricomincia" torna a Pronto senza dialogo; da un errore con audio o senza rete cancella anche l’audio', () => {
    assert.deepEqual(riduci(racconto, { tipo: 'ricomincia' }), { stato: { tipo: 'pronto', avviso: 'nessuno' }, effetti: [] });
    assert.deepEqual(riduci({ tipo: 'errore', audio: AUDIO, errore: errore('riprovabile') }, { tipo: 'ricomincia' }).effetti, [{ tipo: 'cancellaAudio', uri: AUDIO.uri }]);
    assert.deepEqual(riduci({ tipo: 'senzaConnessione', audio: AUDIO, inRiprova: false }, { tipo: 'ricomincia' }).effetti, [{ tipo: 'cancellaAudio', uri: AUDIO.uri }]);
  });

  it('"Azzera" riporta all’avvio da qualunque stato', () => {
    assert.deepEqual(riduci(racconto, { tipo: 'azzera' }).stato, STATO_INIZIALE);
  });
});

describe('flusso: cambio di giorno', () => {
  it('uno stato con audio o racconto di un altro giorno è scaduto; gli altri no', () => {
    const racconto: StatoRacconta = { tipo: 'racconto', testo: 'T', durataMs: 1, data: '2026-10-23' };
    assert.equal(statoScaduto(racconto, '2026-10-23'), false);
    assert.equal(statoScaduto(racconto, '2026-10-24'), true);
    assert.equal(statoScaduto({ tipo: 'senzaConnessione', audio: AUDIO, inRiprova: false }, '2026-10-24'), true);
    assert.equal(statoScaduto({ tipo: 'errore', audio: null, errore: errore('sessione') }, '2026-10-24'), false);
    assert.equal(statoScaduto({ tipo: 'pronto', avviso: 'nessuno' }, '2026-10-24'), false);
  });
});
