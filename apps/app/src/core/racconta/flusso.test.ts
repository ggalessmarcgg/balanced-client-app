import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { SOGLIA_ARRESTO_MS } from './audio.ts';
import { raccontoVuoto, riduci, ripartiDallAvvio, STATO_INIZIALE, statoScaduto, uscitaBloccata, uscitaDaConfermare, type EventoRacconta, type StatoRacconta } from './flusso.ts';
import { erroreApp, type ErroreTrascrizione } from './server.ts';

const AUDIO = { uri: 'file:///doc/ExpoAudio/racconto-2026-10-23.m4a', durataMs: 88_000, data: '2026-10-23' };
const TESTO = { testo: 'A colazione ho preso uno yogurt', durataMs: 88_000, data: '2026-10-23' };
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
    assert.deepEqual(riduci(STATO_INIZIALE, { tipo: 'avviato', permesso: 'concesso', audioInAttesa: null, testoInAttesa: null }).stato, { tipo: 'pronto', avviso: 'nessuno' });
    assert.deepEqual(riduci(STATO_INIZIALE, { tipo: 'avviato', permesso: 'negato', audioInAttesa: null, testoInAttesa: null }).stato, { tipo: 'microfonoDisattivato' });
    assert.deepEqual(riduci(STATO_INIZIALE, { tipo: 'avviato', permesso: 'daChiedere', audioInAttesa: null, testoInAttesa: null }).stato, { tipo: 'permesso', inRichiesta: false });
  });

  it('un audio di oggi non inviato riparte da "Registrazione terminata" (nessun invio automatico), qualunque sia il permesso', () => {
    const t = riduci(STATO_INIZIALE, { tipo: 'avviato', permesso: 'negato', audioInAttesa: AUDIO, testoInAttesa: null });
    assert.deepEqual(t.stato, { tipo: 'terminata', audio: AUDIO });
    assert.deepEqual(t.effetti, []);
  });

  it('un racconto di oggi già trascritto riparte da "Il tuo racconto"', () => {
    const t = riduci(STATO_INIZIALE, { tipo: 'avviato', permesso: 'concesso', audioInAttesa: AUDIO, testoInAttesa: TESTO });
    assert.deepEqual(t.stato, { tipo: 'racconto', ...TESTO });
    assert.deepEqual(t.effetti, []);
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
    assert.deepEqual(t.stato, { tipo: 'registrazione', durataMs: 1_250, inPausa: false, fermando: false, livello: 0.5 });
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
    assert.deepEqual(stato, { tipo: 'registrazione', durataMs: 12_000, inPausa: false, fermando: false, livello: 0 });
  });

  it('una chiamata interrompe il registratore: la lettura lo segnala come in pausa senza effetti', () => {
    const { stato, effetti } = esegui(pronto, [{ tipo: 'avvia' }, { tipo: 'avanzamento', durataMs: 5_000, registrando: true }, { tipo: 'avanzamento', durataMs: 5_000, registrando: false }]);
    assert.equal(stato.tipo === 'registrazione' && stato.inPausa, true);
    assert.deepEqual(effetti[2], []);
  });

  it('lo stop del cliente ferma il registratore; il file si salva sul telefono e si resta su "Registrazione terminata"', () => {
    const { stato, effetti } = esegui(pronto, [{ tipo: 'avvia' }, { tipo: 'ferma' }, { tipo: 'registrata', audio: AUDIO }, { tipo: 'registrata', audio: AUDIO }]);
    assert.deepEqual(effetti[1], [{ tipo: 'fermaRegistrazione', motivo: 'tocco' }]);
    assert.deepEqual(effetti[2], [{ tipo: 'salvaAudio', audio: AUDIO }]);
    assert.deepEqual(effetti[3], []);
    assert.deepEqual(stato, { tipo: 'terminata', audio: AUDIO });
  });

  it('da "Registrazione terminata" solo "Da inviare" avvia la trascrizione; "Ricomincia" scarta l’audio', () => {
    const terminata: StatoRacconta = { tipo: 'terminata', audio: AUDIO };
    assert.deepEqual(riduci(terminata, { tipo: 'invia' }), { stato: { tipo: 'trascrizione', audio: AUDIO }, effetti: [{ tipo: 'trascrivi', audio: AUDIO }] });
    assert.deepEqual(riduci(terminata, { tipo: 'ricomincia' }), { stato: { tipo: 'pronto', avviso: 'nessuno' }, effetti: [{ tipo: 'cancellaAudio', uri: AUDIO.uri }] });
    assert.deepEqual(riduci(terminata, { tipo: 'trascritta', testo: 'T', durataMs: 1 }).effetti, []);
  });

  it('l’uscita va confermata solo con una registrazione in corso o terminata e non inviata', () => {
    assert.equal(uscitaDaConfermare({ tipo: 'registrazione', durataMs: 1, inPausa: false, fermando: false, livello: 0 }), true);
    assert.equal(uscitaDaConfermare({ tipo: 'terminata', audio: AUDIO }), true);
    assert.equal(uscitaDaConfermare({ tipo: 'trascrizione', audio: AUDIO }), false);
    assert.equal(uscitaDaConfermare({ tipo: 'racconto', ...TESTO }), false);
    assert.equal(uscitaDaConfermare(pronto), false);
  });
});

describe('flusso: trascrizione', () => {
  const trascrizione: StatoRacconta = { tipo: 'trascrizione', audio: AUDIO };

  it('testo ricevuto → Il tuo racconto; l’audio si cancella subito e il testo si salva sul telefono', () => {
    const t = riduci(trascrizione, { tipo: 'trascritta', testo: TESTO.testo, durataMs: 88_000 });
    assert.deepEqual(t.stato, { tipo: 'racconto', ...TESTO });
    assert.deepEqual(t.effetti, [
      { tipo: 'cancellaAudio', uri: AUDIO.uri },
      { tipo: 'salvaTesto', racconto: TESTO },
    ]);
  });

  it('trascrizione vuota o quasi (silenzio) → "Non ho capito", audio cancellato, nessun racconto salvato', () => {
    for (const testo of ['', '   ', 'Eh.', '... ...', '12 34']) {
      const t = riduci(trascrizione, { tipo: 'trascritta', testo, durataMs: 3_000 });
      assert.deepEqual(t.stato, { tipo: 'pronto', avviso: 'nonHoCapito' }, `testo "${testo}"`);
      assert.deepEqual(t.effetti, [{ tipo: 'cancellaAudio', uri: AUDIO.uri }]);
    }
    assert.equal(raccontoVuoto('Oggi riposo.'), false);
    assert.equal(raccontoVuoto('Ho mangiato'), false);
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
    const riuscita = riduci(silenzioso.stato, { tipo: 'trascritta', testo: TESTO.testo, durataMs: 1 });
    assert.equal(riuscita.stato.tipo, 'racconto');
    assert.deepEqual(riuscita.effetti[0], { tipo: 'cancellaAudio', uri: AUDIO.uri });
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
    assert.deepEqual(riduci(pronto, { tipo: 'trascritta', testo: TESTO.testo, durataMs: 1 }), { stato: pronto, effetti: [] });
    assert.deepEqual(riduci(pronto, { tipo: 'trascrizioneFallita', errore: erroreApp('rete', null) }), { stato: pronto, effetti: [] });
  });
});

describe('flusso: il tuo racconto', () => {
  const racconto: StatoRacconta = { tipo: 'racconto', testo: 'Ciao', durataMs: 88_000, data: '2026-10-23' };

  it('il testo si modifica a mano e ogni modifica si salva sul telefono', () => {
    const t = riduci(racconto, { tipo: 'modificaTesto', testo: 'Ciao a tutti' });
    assert.deepEqual(t.stato, { ...racconto, testo: 'Ciao a tutti' });
    assert.deepEqual(t.effetti, [{ tipo: 'salvaTesto', racconto: { testo: 'Ciao a tutti', durataMs: 88_000, data: '2026-10-23' } }]);
  });

  it('"Ricomincia" torna a Pronto senza dialogo e cancella il testo salvato; da un errore con audio o senza rete cancella l’audio', () => {
    assert.deepEqual(riduci(racconto, { tipo: 'ricomincia' }), { stato: { tipo: 'pronto', avviso: 'nessuno' }, effetti: [{ tipo: 'cancellaTesto' }] });
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

describe('flusso: uscita dalla schermata (difetto del 23/10/2026)', () => {
  const pronto: StatoRacconta = { tipo: 'pronto', avviso: 'nessuno' };
  const avviato: EventoRacconta = { tipo: 'avviato', permesso: 'concesso', audioInAttesa: null, testoInAttesa: null };

  it('prima della correzione: uscendo durante la registrazione il flusso restava in "registrazione" e al rientro "Ferma" non portava a nulla', () => {
    // Sequenza del difetto: registrazione avviata, schermata smontata senza azzeramento, nuova schermata con un
    // registratore nuovo che non registra. Con lo stato rimasto, "avviato" veniva ignorato e "Ferma" chiedeva di
    // fermare un registratore mai avviato.
    const { stato } = esegui(pronto, [{ tipo: 'avvia' }, { tipo: 'avviataRegistrazione' }, { tipo: 'avanzamento', durataMs: 4_000, registrando: true, livelloDb: -20 }]);
    assert.equal(stato.tipo, 'registrazione');
    assert.equal(riduci(stato, avviato).stato, stato);
    // Ora all'apertura lo stato rimasto viene riconosciuto e si riparte dall'avvio.
    assert.equal(ripartiDallAvvio(stato, '2026-10-23'), true);
  });

  it('"uscita" durante la registrazione (anche in pausa o in arresto) riporta all’avvio; al rientro si registra e si ferma di nuovo', () => {
    for (const reg of [
      { tipo: 'registrazione', durataMs: 4_000, inPausa: false, fermando: false, livello: 0.4 },
      { tipo: 'registrazione', durataMs: 4_000, inPausa: true, fermando: false, livello: 0 },
      { tipo: 'registrazione', durataMs: 4_000, inPausa: false, fermando: true, livello: 0 },
    ] satisfies StatoRacconta[]) {
      const t = riduci(reg, { tipo: 'uscita' });
      assert.deepEqual(t.stato, STATO_INIZIALE);
      assert.deepEqual(t.effetti, []);
      const rientro = esegui(t.stato, [avviato, { tipo: 'avvia' }, { tipo: 'avviataRegistrazione' }, { tipo: 'ferma' }]);
      assert.equal(rientro.stato.tipo, 'registrazione');
      assert.deepEqual(rientro.effetti.at(-1), [{ tipo: 'fermaRegistrazione', motivo: 'tocco' }]);
    }
  });

  it('"uscita" lascia com’erano gli stati che non dipendono dal registratore (audio terminato, trascrizione, racconto)', () => {
    for (const s of [
      { tipo: 'terminata', audio: AUDIO },
      { tipo: 'trascrizione', audio: AUDIO },
      { tipo: 'senzaConnessione', audio: AUDIO, inRiprova: false },
      { tipo: 'racconto', ...TESTO },
      pronto,
    ] satisfies StatoRacconta[]) {
      assert.equal(riduci(s, { tipo: 'uscita' }).stato, s);
      assert.equal(ripartiDallAvvio(s, '2026-10-23'), false);
    }
  });

  it('all’apertura si riparte dall’avvio anche con uno stato di un altro giorno', () => {
    assert.equal(ripartiDallAvvio({ tipo: 'racconto', ...TESTO }, '2026-10-24'), true);
  });
});

describe('flusso: compilazione del diario (lotto 2)', () => {
  const racconto: StatoRacconta = { tipo: 'racconto', ...TESTO };
  const compilazione: StatoRacconta = { tipo: 'compilazione', racconto: TESTO };

  it('"Crea il mio diario" manda al server il testo così com\'è (anche corretto a mano)', () => {
    const corretto = riduci(racconto, { tipo: 'modificaTesto', testo: 'A colazione yogurt greco' }).stato;
    const t = riduci(corretto, { tipo: 'creaDiario' });
    assert.deepEqual(t.stato, { tipo: 'compilazione', racconto: { ...TESTO, testo: 'A colazione yogurt greco' } });
    assert.deepEqual(t.effetti, [{ tipo: 'compila', racconto: { ...TESTO, testo: 'A colazione yogurt greco' } }]);
    assert.deepEqual(riduci(compilazione, { tipo: 'creaDiario' }).effetti, []);
  });

  it('diario compilato → riepilogo; il racconto salvato si cancella', () => {
    const t = riduci(compilazione, { tipo: 'compilato' });
    assert.deepEqual(t.stato, { tipo: 'compilato', data: TESTO.data });
    assert.deepEqual(t.effetti, [{ tipo: 'cancellaTesto' }]);
  });

  it('"non ho capito" → Racconta · 11 (Pronto con l\'avviso); il racconto si cancella', () => {
    const t = riduci(compilazione, { tipo: 'nonCapito' });
    assert.deepEqual(t.stato, { tipo: 'pronto', avviso: 'nonHoCapito' });
    assert.deepEqual(t.effetti, [{ tipo: 'cancellaTesto' }]);
  });

  it('errore o tempo scaduto → Racconta · 12 con il racconto salvato; "Riprova" ricompila', () => {
    const e = errore('riprovabile', 'compilazione_timeout');
    const t = riduci(compilazione, { tipo: 'compilazioneFallita', errore: e });
    assert.deepEqual(t.stato, { tipo: 'erroreCompilazione', racconto: TESTO, errore: e });
    assert.deepEqual(t.effetti, []);
    const r = riduci(t.stato, { tipo: 'riprova' });
    assert.deepEqual(r.effetti, [{ tipo: 'compila', racconto: TESTO }]);
    assert.deepEqual(riduci({ tipo: 'erroreCompilazione', racconto: TESTO, errore: errore('rete', 'rete') }, { tipo: 'riprova' }).effetti, [{ tipo: 'compila', racconto: TESTO }]);
  });

  it('errori definitivi senza "Riprova"; "Ricomincia" torna a Pronto e cancella il racconto', () => {
    const definitivo: StatoRacconta = { tipo: 'erroreCompilazione', racconto: TESTO, errore: errore('sessione', 'token_non_valido') };
    assert.deepEqual(riduci(definitivo, { tipo: 'riprova' }).effetti, []);
    assert.deepEqual(riduci(definitivo, { tipo: 'ricomincia' }), { stato: { tipo: 'pronto', avviso: 'nessuno' }, effetti: [{ tipo: 'cancellaTesto' }] });
  });

  it('durante la compilazione non si esce; dopo, uscendo o riaprendo si riparte dall\'avvio', () => {
    assert.equal(uscitaBloccata(compilazione), true);
    assert.equal(uscitaBloccata(racconto), false);
    assert.equal(uscitaDaConfermare(compilazione), false);
    const compilato: StatoRacconta = { tipo: 'compilato', data: TESTO.data };
    assert.deepEqual(riduci(compilato, { tipo: 'uscita' }).stato, STATO_INIZIALE);
    assert.equal(ripartiDallAvvio(compilato, TESTO.data), true);
    assert.equal(riduci(compilazione, { tipo: 'uscita' }).stato, compilazione);
  });

  it('esiti che arrivano fuori posto non cambiano nulla', () => {
    assert.equal(riduci(racconto, { tipo: 'compilato' }).stato, racconto);
    assert.equal(riduci(racconto, { tipo: 'nonCapito' }).stato, racconto);
    assert.equal(riduci(racconto, { tipo: 'compilazioneFallita', errore: errore('riprovabile') }).stato, racconto);
  });

  it('una compilazione di un altro giorno è scaduta', () => {
    assert.equal(statoScaduto(compilazione, '2026-10-24'), true);
  });
});
