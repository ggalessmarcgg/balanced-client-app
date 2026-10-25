import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { NOTIFICA_PIANO_AGGIORNATO, riduci, STATO_CHIUSO, testiEsito, type StatoPannello } from './pannello.ts';
import type { ErroreSostituzione, EsitoSostituzione } from './server.ts';

const riga = { id: 'r1', testo: 'Riso basmati · 70 g' };
const errore = (esito: ErroreSostituzione['esito'], codice = 'x'): EsitoSostituzione => ({ tipo: 'errore', errore: { esito, codice, messaggio: 'm', richiestaId: null, httpStatus: null } });
const alternative: EsitoSostituzione = {
  tipo: 'ok',
  risposta: { esito: 'alternative', alternative: [{ nome: 'Farro', quantita: 'Farro · 70 g', aPiacere: false }], spiegazione: 'Va bene.', inCasa: [{ testo: 'pollo', esito: 'non_adatta', motivo: 'Il pollo è proteico.' }] },
};

function apriECerca(inCasa = ''): { stato: StatoPannello; richiesta: number } {
  let { stato } = riduci(STATO_CHIUSO, { tipo: 'apri', riga }, 1);
  if (inCasa) stato = riduci(stato, { tipo: 'scrivi', testo: inCasa }, 1).stato;
  const t = riduci(stato, { tipo: 'trova' }, 7);
  assert.equal(t.stato.tipo, 'ricerca');
  assert.deepEqual(t.effetti, [{ tipo: 'chiama', richiesta: 7, rigaId: 'r1', inCasa }]);
  return { stato: t.stato, richiesta: 7 };
}

describe('pannello Sostituisci', () => {
  it('apertura da capo con il campo vuoto; il campo si scrive solo all\'avvio; la chiamata parte solo da "Trova alternative"', () => {
    const a = riduci(STATO_CHIUSO, { tipo: 'apri', riga }, 1);
    assert.deepEqual(a, { stato: { tipo: 'avvio', riga, inCasa: '' }, effetti: [] });
    const scritto = riduci(a.stato, { tipo: 'scrivi', testo: 'skyr' }, 1).stato;
    assert.ok(scritto.tipo === 'avvio' && scritto.inCasa === 'skyr');
    // Riaprire (anche la stessa riga) azzera tutto.
    assert.deepEqual(riduci(scritto, { tipo: 'apri', riga }, 1).stato, { tipo: 'avvio', riga, inCasa: '' });
    assert.deepEqual(riduci(a.stato, { tipo: 'risposta', richiesta: 1, esito: alternative }, 1).stato, a.stato);
  });
  it('risposte: alternative con i paragrafi, nessuna alternativa, non riconosciuto', () => {
    const { stato, richiesta } = apriECerca('pollo');
    const alt = riduci(stato, { tipo: 'risposta', richiesta, esito: alternative }, 8).stato;
    assert.ok(alt.tipo === 'alternative');
    assert.equal(alt.alternative.length, 1);
    assert.deepEqual(alt.spiegazione, { primo: 'Va bene.', secondo: 'Il pollo è proteico.' });
    const senzaCampo = riduci(apriECerca().stato, { tipo: 'risposta', richiesta: 7, esito: alternative }, 8).stato;
    assert.ok(senzaCampo.tipo === 'alternative' && senzaCampo.spiegazione.secondo === null);
    assert.equal(riduci(stato, { tipo: 'risposta', richiesta, esito: { tipo: 'ok', risposta: { esito: 'nessuna_alternativa', spiegazione: null } } }, 8).stato.tipo, 'nessunaAlternativa');
    assert.equal(riduci(stato, { tipo: 'risposta', richiesta, esito: { tipo: 'ok', risposta: { esito: 'non_riconosciuto' } } }, 8).stato.tipo, 'nonRiconosciuto');
  });
  it('una risposta di una richiesta vecchia o dopo la chiusura si ignora', () => {
    const { stato } = apriECerca();
    assert.equal(riduci(stato, { tipo: 'risposta', richiesta: 6, esito: alternative }, 8).stato, stato);
    const chiuso = riduci(stato, { tipo: 'chiudi' }, 8).stato;
    assert.equal(chiuso.tipo, 'chiuso');
    assert.equal(riduci(chiuso, { tipo: 'risposta', richiesta: 7, esito: alternative }, 8).stato.tipo, 'chiuso');
  });
  it('errori: Riprova per rete e riprovabili (stessa richiesta); senza Riprova per sessione, abbonamento e definitivi', () => {
    const { stato, richiesta } = apriECerca('skyr');
    for (const esito of ['rete', 'riprovabile'] as const) {
      const e = riduci(stato, { tipo: 'risposta', richiesta, esito: errore(esito) }, 8).stato;
      assert.ok(e.tipo === 'errore' && e.riprovabile);
      const r = riduci(e, { tipo: 'riprova' }, 9);
      assert.equal(r.stato.tipo, 'ricerca');
      assert.deepEqual(r.effetti, [{ tipo: 'chiama', richiesta: 9, rigaId: 'r1', inCasa: 'skyr' }]);
    }
    for (const esito of ['sessione', 'nonDisponibile', 'definitivo', 'inCasaTroppoLungo'] as const) {
      const e = riduci(stato, { tipo: 'risposta', richiesta, esito: errore(esito) }, 8).stato;
      assert.ok(e.tipo === 'errore' && !e.riprovabile);
      assert.equal(riduci(e, { tipo: 'riprova' }, 9).effetti.length, 0);
    }
  });
  it('riga_non_disponibile: il pannello si chiude e il piano si rilegge', () => {
    const { stato, richiesta } = apriECerca();
    const t = riduci(stato, { tipo: 'risposta', richiesta, esito: errore('rigaNonDisponibile', 'riga_non_disponibile') }, 8);
    assert.equal(t.stato.tipo, 'chiuso');
    assert.deepEqual(t.effetti, [{ tipo: 'rileggiPiano' }]);
    assert.equal(NOTIFICA_PIANO_AGGIORNATO, 'Il piano è stato aggiornato: tocca di nuovo l’alimento.');
  });
  it('testi delle card per esito', () => {
    const base = { riga, inCasa: '' };
    assert.equal(testiEsito({ tipo: 'nessunaAlternativa', ...base }).titolo, 'Nessuna alternativa adatta');
    assert.equal(testiEsito({ tipo: 'nonRiconosciuto', ...base }).titolo, 'Non riconosciamo questo alimento');
    const err = (esito: ErroreSostituzione['esito'], codice = 'x') => testiEsito({ tipo: 'errore', ...base, riprovabile: false, errore: { esito, codice, messaggio: 'm', richiestaId: null, httpStatus: null } });
    assert.equal(err('rete').titolo, 'Qualcosa non ha funzionato');
    assert.equal(err('sessione').titolo, 'La sessione è scaduta');
    assert.match(err('nonDisponibile', 'abbonamento_non_attivo').testo, /percorso attivo/);
  });
});
