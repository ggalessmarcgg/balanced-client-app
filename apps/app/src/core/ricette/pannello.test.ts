import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { ContestoRicetta } from './contesto.ts';
import { NOTIFICA_PIANO_AGGIORNATO, puoTrovare, riduci, STATO_CHIUSO, testiEsito, type StatoPannello } from './pannello.ts';
import type { ErroreRicette, EsitoIdee, EsitoRicetta, Idea, Stima } from './server.ts';

const pranzo = { id: 'p4', nome: 'Pranzo' };
const fisso: ContestoRicetta = { tipo: 'fisso', pianoId: 'piano-f', giorno: { indice: 4, nome: 'Giovedì' }, pasti: [{ id: 'c4', nome: 'Colazione' }, pranzo] };
const variabile: ContestoRicetta = { tipo: 'variabile', pianoId: 'piano-v', pasto: { id: 'pr', nome: 'Pranzo' } };
const stima: Stima = { kcal: 770, carboidrati: 87.2, proteine: 57.9, grassi: 19.6, fonte: 'catalogo' };
const idea = (titolo: string): Idea => ({ titolo, descrizione: 'd', tipo: 'individuale', allergeni: [], regime: null });
const idee: EsitoIdee = { tipo: 'ok', risposta: { esito: 'idee', richiestaId: 'req-1', stima, idee: [idea('Uno'), idea('Due'), idea('Tre')], fraseIngredienti: null, versioneIstruzioni: 'v0.4' } };
const errore = (esito: ErroreRicette['esito'], codice = 'x'): ErroreRicette => ({ esito, codice, messaggio: 'm', richiestaId: null, httpStatus: null });
const erroreIdee = (esito: ErroreRicette['esito'], codice?: string): EsitoIdee => ({ tipo: 'errore', errore: errore(esito, codice) });
const erroreRicetta = (esito: ErroreRicette['esito'], codice?: string): EsitoRicetta => ({ tipo: 'errore', errore: errore(esito, codice) });
const ricettaOk: EsitoRicetta = {
  tipo: 'ok',
  risposta: { esito: 'ricetta', richiestaId: 'req-1', versioneIstruzioni: 'v0.4', ricetta: { titolo: 'Bowl', tempoMinuti: 25, riposoMinuti: null, tipo: 'individuale', ingredienti: [{ nome: 'Riso', quantita: '130 g' }], porzioni: null, preparazione: ['Cuoci.'], spiegazione: 's', grezza: { titolo: 'Bowl' } } },
};

function finoAlleIdee(contesto: ContestoRicetta = fisso): StatoPannello {
  let s = riduci(STATO_CHIUSO, { tipo: 'apri', contesto }, 1).stato;
  if (contesto.tipo === 'fisso') s = riduci(s, { tipo: 'scegliPasto', pasto: pranzo }, 1).stato;
  const t = riduci(s, { tipo: 'trova' }, 3);
  assert.equal(t.stato.tipo, 'ricerca');
  return riduci(t.stato, { tipo: 'rispostaIdee', richiesta: 3, esito: idee }, 4).stato;
}

describe('pannello Ricetta: avvio', () => {
  it('fisso: nessun pasto preselezionato, "Trova idee" attivo solo dopo la scelta; il campo si scrive solo all\'avvio', () => {
    const a = riduci(STATO_CHIUSO, { tipo: 'apri', contesto: fisso }, 1);
    assert.deepEqual(a, { stato: { tipo: 'avvio', contesto: fisso, pasto: null, campo: '' }, effetti: [] });
    assert.equal(puoTrovare(a.stato), false);
    assert.deepEqual(riduci(a.stato, { tipo: 'trova' }, 1), { stato: a.stato, effetti: [] });
    const scelto = riduci(a.stato, { tipo: 'scegliPasto', pasto: pranzo }, 1).stato;
    assert.equal(puoTrovare(scelto), true);
    const scritto = riduci(scelto, { tipo: 'scrivi', testo: 'salmone' }, 1).stato;
    assert.ok(scritto.tipo === 'avvio' && scritto.campo === 'salmone');
    const t = riduci(scritto, { tipo: 'trova' }, 7);
    assert.equal(t.stato.tipo, 'ricerca');
    assert.deepEqual(t.effetti, [{ tipo: 'chiamaIdee', richiesta: 7, pastoId: 'p4', campo: 'salmone' }]);
    // Riaprire azzera tutto.
    assert.deepEqual(riduci(t.stato, { tipo: 'apri', contesto: fisso }, 8).stato, { tipo: 'avvio', contesto: fisso, pasto: null, campo: '' });
  });
  it('variabile: il pasto è quello del selettore, "Trova idee" subito attivo; scegliPasto non fa nulla', () => {
    const a = riduci(STATO_CHIUSO, { tipo: 'apri', contesto: variabile }, 1).stato;
    assert.ok(a.tipo === 'avvio' && a.pasto?.id === 'pr');
    assert.equal(puoTrovare(a), true);
    assert.deepEqual(riduci(a, { tipo: 'scegliPasto', pasto: pranzo }, 1).stato, a);
  });
});

describe('pannello Ricetta: idee', () => {
  it('risposta attesa → idee senza selezione; "Vedi la ricetta" solo dopo il tocco; risposta vecchia ignorata', () => {
    const s = finoAlleIdee();
    assert.ok(s.tipo === 'idee' && s.dati.scelta === null && s.dati.idee.length === 3);
    assert.deepEqual(riduci(s, { tipo: 'vediRicetta' }, 9), { stato: s, effetti: [] });
    const scelta = riduci(s, { tipo: 'scegliIdea', indice: 1 }, 9).stato;
    assert.ok(scelta.tipo === 'idee' && scelta.dati.scelta === 1);
    assert.deepEqual(riduci(s, { tipo: 'scegliIdea', indice: 5 }, 9).stato, s);
    const v = riduci(scelta, { tipo: 'vediRicetta' }, 9);
    assert.equal(v.stato.tipo, 'attesaRicetta');
    assert.deepEqual(v.effetti, [{ tipo: 'chiamaRicetta', richiesta: 9, pastoId: 'p4', richiestaId: 'req-1', stima, idea: idea('Due'), campo: '' }]);
    // Una risposta con un numero di richiesta diverso non cambia nulla.
    assert.deepEqual(riduci(v.stato, { tipo: 'rispostaRicetta', richiesta: 2, esito: ricettaOk }, 10).stato, v.stato);
    const ok = riduci(v.stato, { tipo: 'rispostaRicetta', richiesta: 9, esito: ricettaOk }, 10);
    assert.equal(ok.stato.tipo, 'chiuso');
    assert.equal(ok.effetti.length, 1);
    const effetto = ok.effetti[0];
    assert.ok(effetto && effetto.tipo === 'apriRicetta');
    assert.deepEqual(effetto.ricetta.pasto, pranzo);
    assert.equal(effetto.ricetta.giorno, 'Giovedì');
    assert.equal(effetto.ricetta.pianoId, 'piano-f');
    assert.equal(effetto.ricetta.tipoPiano, 'fisso');
    assert.equal(effetto.ricetta.richiestaId, 'req-1');
    assert.equal(effetto.ricetta.ricetta.titolo, 'Bowl');
  });
  it('nessuna idea → 5.7; una risposta dopo la chiusura si ignora', () => {
    let s = riduci(STATO_CHIUSO, { tipo: 'apri', contesto: variabile }, 1).stato;
    s = riduci(s, { tipo: 'trova' }, 2).stato;
    const nessuna = riduci(s, { tipo: 'rispostaIdee', richiesta: 2, esito: { tipo: 'ok', risposta: { esito: 'nessuna_idea' } } }, 3).stato;
    assert.equal(nessuna.tipo, 'nessunaIdea');
    assert.equal(testiEsito(nessuna as Extract<StatoPannello, { tipo: 'nessunaIdea' }>).titolo, 'Nessuna idea disponibile');
    const chiuso = riduci(s, { tipo: 'chiudi' }, 3).stato;
    assert.deepEqual(riduci(chiuso, { tipo: 'rispostaIdee', richiesta: 2, esito: idee }, 3).stato, STATO_CHIUSO);
  });
});

describe('pannello Ricetta: errori', () => {
  function inRicerca(): StatoPannello {
    let s = riduci(STATO_CHIUSO, { tipo: 'apri', contesto: variabile }, 1).stato;
    s = riduci(s, { tipo: 'trova' }, 2).stato;
    return s;
  }
  it('rete, timeout e riprovabili → 5.8 con "Riprova" che ripete le idee; sessione, abbonamento e definitivi senza "Riprova"', () => {
    for (const esito of ['rete', 'riprovabile'] as const) {
      const e = riduci(inRicerca(), { tipo: 'rispostaIdee', richiesta: 2, esito: erroreIdee(esito) }, 3).stato;
      assert.ok(e.tipo === 'errore' && e.riprovabile && e.fase === 'idee');
      const r = riduci(e, { tipo: 'riprova' }, 5);
      assert.equal(r.stato.tipo, 'ricerca');
      assert.deepEqual(r.effetti, [{ tipo: 'chiamaIdee', richiesta: 5, pastoId: 'pr', campo: '' }]);
    }
    for (const [esito, codice] of [['sessione', 'token_non_valido'], ['nonDisponibile', 'abbonamento_non_attivo'], ['definitivo', 'richiesta_non_valida']] as const) {
      const e = riduci(inRicerca(), { tipo: 'rispostaIdee', richiesta: 2, esito: erroreIdee(esito, codice) }, 3).stato;
      assert.ok(e.tipo === 'errore' && !e.riprovabile);
      assert.deepEqual(riduci(e, { tipo: 'riprova' }, 5), { stato: e, effetti: [] });
    }
    const sessione = riduci(inRicerca(), { tipo: 'rispostaIdee', richiesta: 2, esito: erroreIdee('sessione', 'token_non_valido') }, 3).stato;
    assert.equal(testiEsito(sessione as Extract<StatoPannello, { tipo: 'errore' }>).titolo, 'La sessione è scaduta');
    const abbonamento = riduci(inRicerca(), { tipo: 'rispostaIdee', richiesta: 2, esito: erroreIdee('nonDisponibile', 'abbonamento_non_attivo') }, 3).stato;
    assert.equal(testiEsito(abbonamento as Extract<StatoPannello, { tipo: 'errore' }>).titolo, 'Funzione non disponibile');
  });
  it('pasto_non_disponibile (idee o ricetta) → pannello chiuso, piano riletto, notifica', () => {
    const e = riduci(inRicerca(), { tipo: 'rispostaIdee', richiesta: 2, esito: erroreIdee('pastoNonDisponibile', 'pasto_non_disponibile') }, 3);
    assert.deepEqual(e, { stato: STATO_CHIUSO, effetti: [{ tipo: 'rileggiPiano' }] });
    const s = riduci(riduci(finoAlleIdee(), { tipo: 'scegliIdea', indice: 0 }, 9).stato, { tipo: 'vediRicetta' }, 9).stato;
    const r = riduci(s, { tipo: 'rispostaRicetta', richiesta: 9, esito: erroreRicetta('pastoNonDisponibile', 'pasto_non_disponibile') }, 10);
    assert.deepEqual(r, { stato: STATO_CHIUSO, effetti: [{ tipo: 'rileggiPiano' }] });
    assert.equal(NOTIFICA_PIANO_AGGIORNATO, 'Il piano è stato aggiornato: tocca di nuovo “Ricetta”.');
  });
  it('stima non plausibile o idea non ammessa → si torna alla ricerca delle idee; errore della ricetta con "Riprova" ripete la ricetta', () => {
    const attesa = riduci(riduci(finoAlleIdee(), { tipo: 'scegliIdea', indice: 2 }, 9).stato, { tipo: 'vediRicetta' }, 9).stato;
    for (const codice of ['stima_non_plausibile', 'idea_non_ammessa']) {
      const r = riduci(attesa, { tipo: 'rispostaRicetta', richiesta: 9, esito: erroreRicetta('ripetiIdee', codice) }, 10);
      assert.equal(r.stato.tipo, 'ricerca');
      assert.deepEqual(r.effetti, [{ tipo: 'chiamaIdee', richiesta: 10, pastoId: 'p4', campo: '' }]);
    }
    const e = riduci(attesa, { tipo: 'rispostaRicetta', richiesta: 9, esito: erroreRicetta('riprovabile', 'ricette_timeout') }, 10).stato;
    assert.ok(e.tipo === 'errore' && e.fase === 'ricetta' && e.riprovabile && e.dati?.scelta === 2);
    assert.equal(testiEsito(e).testo, 'Non siamo riusciti a preparare la ricetta. Controlla la connessione e riprova.');
    const r = riduci(e, { tipo: 'riprova' }, 11);
    assert.equal(r.stato.tipo, 'attesaRicetta');
    assert.deepEqual(r.effetti, [{ tipo: 'chiamaRicetta', richiesta: 11, pastoId: 'p4', richiestaId: 'req-1', stima, idea: idea('Tre'), campo: '' }]);
  });
});
