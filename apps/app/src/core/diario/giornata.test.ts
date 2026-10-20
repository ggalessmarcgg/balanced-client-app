import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  aggiornaGiornata,
  COLONNE_VIETATE_GIORNATA,
  dopoErroreModifica,
  dopoModifica,
  etichettaSport,
  giornataDaRiga,
  giornataDaRileggere,
  pianificaModifica,
  riassuntoGiornata,
} from './giornata.ts';
import type { RigaGiornata } from './letture.ts';
import { DIARIO_VUOTO } from './modello.ts';

const RIGA: RigaGiornata = {
  id: 'r8',
  submission_date: '2026-10-08',
  status: 'submitted',
  submitted_at: '2026-10-08T19:12:00.000Z',
  updated_at: '2026-10-09T08:00:00.000Z',
  breakfast: 'Yogurt greco con frutti di bosco e un caffè',
  lunch: 'Pasta al pomodoro e insalata mista',
  dinner: 'Pollo alla griglia con verdure',
  snacks: 'Una mela a metà pomeriggio',
  day_comment: 'Sabato sono a cena fuori con amici.',
  energy_level: 3,
  satiety_level: 7,
  hydration_level: 3,
  sport_type: 'camminata',
  sport_duration: '30 min',
};

describe('modifica di una giornata condivisa', () => {
  it('senza modifiche non si scrive nulla', () => {
    const g = giornataDaRiga(RIGA);
    assert.equal(g.inAttesa, false);
    assert.deepEqual(pianificaModifica(g), { tipo: 'nessuna' });
    const uguale = aggiornaGiornata(g, { ...g.diario, breakfast: `${g.diario.breakfast}  ` });
    assert.equal(uguale.inAttesa, false);
    assert.deepEqual(pianificaModifica(uguale), { tipo: 'nessuna' });
  });

  it('con una modifica si scrivono solo i dieci campi del cliente su quella riga, mai le colonne vietate', () => {
    const g = aggiornaGiornata(giornataDaRiga(RIGA), { ...giornataDaRiga(RIGA).diario, dinner: 'Minestrone', riposo: true, sport_type: null, sport_duration: null });
    assert.equal(g.inAttesa, true);
    const op = pianificaModifica(g);
    assert.equal(op.tipo, 'modifica');
    if (op.tipo !== 'modifica') return;
    assert.equal(op.modifica.id, 'r8');
    assert.deepEqual(Object.keys(op.modifica.campi).sort(), ['breakfast', 'day_comment', 'dinner', 'energy_level', 'hydration_level', 'lunch', 'satiety_level', 'snacks', 'sport_duration', 'sport_type']);
    for (const colonna of COLONNE_VIETATE_GIORNATA) assert.equal(colonna in op.modifica.campi, false, colonna);
    assert.equal(op.modifica.campi.dinner, 'Minestrone');
    assert.equal(op.modifica.campi.sport_type, null);
    assert.equal(op.modifica.campi.sport_duration, null);
  });

  it('dopo la modifica riuscita la giornata non è più in attesa e porta il nuovo updated_at; dopo un errore resta in attesa', () => {
    const g = aggiornaGiornata(giornataDaRiga(RIGA), { ...giornataDaRiga(RIGA).diario, lunch: 'Riso' });
    const op = pianificaModifica(g);
    if (op.tipo !== 'modifica') return assert.fail();
    const dopo = dopoModifica(g, op.modifica.campi, '2026-10-10T10:00:00.000Z');
    assert.equal(dopo.inAttesa, false);
    assert.equal(dopo.errore, null);
    assert.equal(dopo.updatedAt, '2026-10-10T10:00:00.000Z');
    assert.equal(dopo.salvato.lunch, 'Riso');
    assert.deepEqual(pianificaModifica(dopo), { tipo: 'nessuna' });
    const errore = dopoErroreModifica(g, 'rete');
    assert.equal(errore.inAttesa, true);
    assert.equal(errore.errore, 'rete');
  });

  it('la giornata in cache si rilegge se manca, se la riga è cambiata o se il server ha un updated_at diverso; mai con modifiche in attesa', () => {
    const g = giornataDaRiga(RIGA);
    assert.equal(giornataDaRileggere(undefined, { id: 'r8', updated_at: RIGA.updated_at }), true);
    assert.equal(giornataDaRileggere(g, { id: 'r8', updated_at: RIGA.updated_at }), false);
    assert.equal(giornataDaRileggere(g, { id: 'altra', updated_at: RIGA.updated_at }), true);
    assert.equal(giornataDaRileggere(g, { id: 'r8', updated_at: '2026-10-11T00:00:00.000Z' }), true);
    const inAttesa = aggiornaGiornata(g, { ...g.diario, snacks: 'Noci' });
    assert.equal(giornataDaRileggere(inAttesa, { id: 'r8', updated_at: '2026-10-11T00:00:00.000Z' }), false);
  });
});

describe('riassunto della giornata (Figma 475:1337)', () => {
  it('pasti compilati, valori come etichette, sport con durata estesa, commento personale', () => {
    assert.deepEqual(riassuntoGiornata(giornataDaRiga(RIGA).diario), [
      { titolo: 'Colazione', tipo: 'testo', testo: 'Yogurt greco con frutti di bosco e un caffè' },
      { titolo: 'Pranzo', tipo: 'testo', testo: 'Pasta al pomodoro e insalata mista' },
      { titolo: 'Cena', tipo: 'testo', testo: 'Pollo alla griglia con verdure' },
      { titolo: 'Spuntini', tipo: 'testo', testo: 'Una mela a metà pomeriggio' },
      { titolo: 'Valori', tipo: 'valori', valori: ['Energia buona', 'Sazietà 7', 'Acqua 2 L'] },
      { titolo: 'Sport', tipo: 'testo', testo: 'Camminata · 30 minuti' },
      { titolo: 'Commento personale', tipo: 'testo', testo: 'Sabato sono a cena fuori con amici.' },
    ]);
  });
  it('le sezioni vuote non compaiono; una giornata vuota non ha sezioni', () => {
    assert.deepEqual(riassuntoGiornata({ ...DIARIO_VUOTO, lunch: 'Pasta', satiety_level: 9 }), [
      { titolo: 'Pranzo', tipo: 'testo', testo: 'Pasta' },
      { titolo: 'Valori', tipo: 'valori', valori: ['Sazietà 9'] },
    ]);
    assert.deepEqual(riassuntoGiornata(DIARIO_VUOTO), []);
  });
  it('sport: durate nuove estese, durate storiche tali quali, tipo senza durata, riposo o tipo sconosciuto assenti', () => {
    assert.equal(etichettaSport('camminata', '60 min'), 'Camminata · 1 ora');
    assert.equal(etichettaSport('pesi', 'più di 60 min'), 'Pesi · più di 1 ora');
    assert.equal(etichettaSport('corsa', '30m-1h'), 'Corsa · 30m-1h');
    assert.equal(etichettaSport('nuoto', null), 'Nuoto');
    assert.equal(etichettaSport(null, '30 min'), null);
    assert.equal(etichettaSport('yoga', '30 min'), null);
  });
});
