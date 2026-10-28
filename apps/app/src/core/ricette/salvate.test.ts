import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { RicettaPronta } from './pannello.ts';
import { elencoRicetteSalvate, eliminaRicetta, nuovaRigaRicetta, requestIdPerDatabase, salvaRicetta, type NuovaRigaRicetta, type RicettaSalvata, type RigaRicettaSalvata, type ScrittoreRicette } from './salvate.ts';

const grezza = { titolo: 'Bowl di farro', tempo_minuti: 20, riposo_minuti: null, tipo: 'individuale', ingredienti: [{ nome: 'Farro', quantita: '75 g' }], porzioni: null, preparazione: ['Cuoci.'], spiegazione: 's', allergeni: [], regime: null };
const pronta: RicettaPronta = {
  ricetta: { titolo: 'Bowl di farro', tempoMinuti: 20, riposoMinuti: null, tipo: 'individuale', ingredienti: [{ nome: 'Farro', quantita: '75 g' }], porzioni: null, preparazione: ['Cuoci.'], spiegazione: 's', grezza },
  pasto: { id: 'p4', nome: 'Pranzo' },
  giorno: 'Giovedì',
  pianoId: 'piano-f',
  tipoPiano: 'fisso',
  richiestaId: '12345678-1234-4123-8123-123456789012',
  versioneIstruzioni: 'v0.4 (28/10/2026)',
};

function scrittoreFinto() {
  const inserite: NuovaRigaRicetta[] = [];
  const eliminate: string[] = [];
  const scrittore: ScrittoreRicette = {
    inserisci: async (riga) => {
      inserite.push(riga);
      return { tipo: 'ok', dati: { id: 'nuova', created_at: '2026-10-28T20:00:00Z' } };
    },
    elimina: async (id) => {
      eliminate.push(id);
      return { tipo: 'ok', dati: null };
    },
  };
  return { scrittore, inserite, eliminate };
}

describe('riga da salvare', () => {
  it('ricetta così come ricevuta, pasto, giorno, tipo di piano, titolo, tempo, identificativo della richiesta, versione delle istruzioni', () => {
    assert.deepEqual(nuovaRigaRicetta('cliente-1', pronta), {
      client_id: 'cliente-1',
      plan_id: 'piano-f',
      plan_meal_id: 'p4',
      meal_name: 'Pranzo',
      day_name: 'Giovedì',
      plan_type: 'fisso',
      title: 'Bowl di farro',
      prep_minutes: 20,
      recipe: grezza,
      request_id: '12345678-1234-4123-8123-123456789012',
      instructions_version: 'v0.4 (28/10/2026)',
    });
  });
  it('request_id solo se è un uuid; tempo mancante → null; variabile senza giorno', () => {
    assert.equal(requestIdPerDatabase('app-xyz'), null);
    assert.equal(requestIdPerDatabase(null), null);
    const riga = nuovaRigaRicetta('c', { ...pronta, giorno: null, tipoPiano: 'variabile', richiestaId: 'app-xyz', ricetta: { ...pronta.ricetta, tempoMinuti: null } });
    assert.equal(riga.request_id, null);
    assert.equal(riga.prep_minutes, null);
    assert.equal(riga.day_name, null);
    assert.equal(riga.plan_type, 'variabile');
  });
});

describe('salvataggio ed eliminazione con dipendenze finte', () => {
  it('salva: una sola scrittura con la riga giusta; la ricetta salvata torna con id e data del database', async () => {
    const { scrittore, inserite } = scrittoreFinto();
    const esito = await salvaRicetta(scrittore, 'cliente-1', pronta);
    assert.ok(esito.tipo === 'ok');
    assert.equal(inserite.length, 1);
    assert.equal(inserite[0]?.client_id, 'cliente-1');
    assert.deepEqual(esito.dati, { id: 'nuova', creataIl: '2026-10-28T20:00:00Z', pasto: 'Pranzo', giorno: 'Giovedì', ricetta: pronta.ricetta });
  });
  it('salva senza rete o con errore: l\'esito passa com\'è, nessuna ricetta salvata', async () => {
    const scrittore: ScrittoreRicette = { inserisci: async () => ({ tipo: 'rete' }), elimina: async () => ({ tipo: 'ok', dati: null }) };
    assert.deepEqual(await salvaRicetta(scrittore, 'c', pronta), { tipo: 'rete' });
    const conErrore: ScrittoreRicette = { ...scrittore, inserisci: async () => ({ tipo: 'errore', messaggio: 'RLS' }) };
    assert.deepEqual(await salvaRicetta(conErrore, 'c', pronta), { tipo: 'errore', messaggio: 'RLS' });
  });
  it('elimina: una sola eliminazione per id; l\'elenco torna senza la ricetta; con errore l\'elenco non cambia', async () => {
    const { scrittore, eliminate } = scrittoreFinto();
    const elenco: RicettaSalvata[] = [
      { id: 'a', creataIl: '2026-10-28T20:00:00Z', pasto: 'Pranzo', giorno: null, ricetta: pronta.ricetta },
      { id: 'b', creataIl: '2026-10-27T20:00:00Z', pasto: 'Cena', giorno: null, ricetta: pronta.ricetta },
    ];
    const esito = await eliminaRicetta(scrittore, elenco, 'a');
    assert.ok(esito.tipo === 'ok');
    assert.deepEqual(eliminate, ['a']);
    assert.deepEqual(esito.dati.map((r) => r.id), ['b']);
    const fallisce: ScrittoreRicette = { ...scrittore, elimina: async () => ({ tipo: 'rete' }) };
    assert.deepEqual(await eliminaRicetta(fallisce, elenco, 'a'), { tipo: 'rete' });
  });
});

describe('elenco dalle righe', () => {
  it('dalla più recente; titolo e tempo della riga vincono; righe illeggibili nascoste', () => {
    const righe: RigaRicettaSalvata[] = [
      { id: '1', created_at: '2026-10-27T10:00:00Z', meal_name: 'Cena', day_name: null, plan_type: 'variabile', title: 'Vellutata', prep_minutes: 30, recipe: { ...grezza, titolo: 'Altro', tempo_minuti: 5 }, request_id: null, instructions_version: null },
      { id: '2', created_at: '2026-10-28T10:00:00Z', meal_name: 'Pranzo', day_name: 'Giovedì', plan_type: 'fisso', title: 'Bowl', prep_minutes: 20, recipe: grezza, request_id: null, instructions_version: null },
      { id: '3', created_at: '2026-10-29T10:00:00Z', meal_name: 'Pranzo', day_name: null, plan_type: 'fisso', title: 'Rotta', prep_minutes: 20, recipe: { titolo: 'x' }, request_id: null, instructions_version: null },
    ];
    const elenco = elencoRicetteSalvate(righe);
    assert.deepEqual(elenco.map((r) => r.id), ['2', '1']);
    assert.equal(elenco[1]?.ricetta.titolo, 'Vellutata');
    assert.equal(elenco[1]?.ricetta.tempoMinuti, 30);
  });
});
