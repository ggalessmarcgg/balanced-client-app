import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  aggiornaDiario,
  copiaLocalePiuRecente,
  copiaValida,
  diarioLocaleIniziale,
  dopoCondivisione,
  dopoErrore,
  dopoSalvataggio,
  pianificaCondivisione,
  pianificaSalvataggio,
  rigaGiaCondivisa,
  type DiarioLocale,
} from './bozza.ts';
import { campiDaSalvare, DIARIO_VUOTO } from './modello.ts';

const CLIENT = 'client-1';
const USER = 'user-1';
const OGGI = '2026-10-19';
const ADESSO = '2026-10-19T19:30:00.000Z';

function nuovo(): DiarioLocale {
  return diarioLocaleIniziale(CLIENT, OGGI, DIARIO_VUOTO, { tipo: 'assente' });
}

describe('bozza mai vuota', () => {
  it('senza contenuto non si crea nessuna riga', () => {
    assert.deepEqual(pianificaSalvataggio(nuovo(), USER), { tipo: 'nessuna' });
    const soloSpazi = aggiornaDiario(nuovo(), { ...DIARIO_VUOTO, breakfast: '  ' });
    assert.deepEqual(pianificaSalvataggio(soloSpazi, USER), { tipo: 'nessuna' });
    assert.equal(soloSpazi.inAttesa, false);
  });
  it('al primo contenuto vero si inserisce la riga con client_id, user_id e data italiana, senza status', () => {
    const locale = aggiornaDiario(nuovo(), { ...DIARIO_VUOTO, breakfast: 'Caffè e pane' });
    assert.equal(locale.inAttesa, true);
    const op = pianificaSalvataggio(locale, USER);
    assert.equal(op.tipo, 'inserisci');
    if (op.tipo !== 'inserisci') return;
    assert.equal(op.riga.client_id, CLIENT);
    assert.equal(op.riga.user_id, USER);
    assert.equal(op.riga.submission_date, OGGI);
    assert.equal(op.riga.breakfast, 'Caffè e pane');
    assert.equal('status' in op.riga, false);
    assert.equal('submitted_at' in op.riga, false);
  });
});

describe('salvataggio della bozza', () => {
  const salvato = campiDaSalvare({ ...DIARIO_VUOTO, breakfast: 'Caffè' });
  const bozza = diarioLocaleIniziale(CLIENT, OGGI, { ...DIARIO_VUOTO, breakfast: 'Caffè' }, { tipo: 'bozza', id: 'riga-1', salvato });

  it('con gli stessi campi già salvati non si scrive nulla', () => {
    assert.deepEqual(pianificaSalvataggio(bozza, USER), { tipo: 'nessuna' });
    assert.equal(aggiornaDiario(bozza, { ...DIARIO_VUOTO, breakfast: ' Caffè ' }).inAttesa, false);
  });
  it('con un campo cambiato si modifica la riga per id, senza status', () => {
    const locale = aggiornaDiario(bozza, { ...DIARIO_VUOTO, breakfast: 'Caffè', energy_level: 3 });
    assert.equal(locale.inAttesa, true);
    const op = pianificaSalvataggio(locale, USER);
    assert.equal(op.tipo, 'modifica');
    if (op.tipo !== 'modifica') return;
    assert.equal(op.modifica.id, 'riga-1');
    assert.equal(op.modifica.campi.energy_level, 3);
    assert.equal('status' in op.modifica.campi, false);
    assert.equal('client_id' in op.modifica.campi, false);
  });
  it('dopo il salvataggio la cache si aggiorna senza rilettura e non resta nulla in attesa', () => {
    const locale = aggiornaDiario(nuovo(), { ...DIARIO_VUOTO, lunch: 'Pasta' });
    const campi = campiDaSalvare(locale.diario);
    const dopo = dopoSalvataggio(locale, 'riga-9', campi);
    assert.deepEqual(dopo.riga, { tipo: 'bozza', id: 'riga-9', salvato: campi });
    assert.equal(dopo.inAttesa, false);
    assert.equal(dopo.errore, null);
  });
  it('se il contenuto cambia mentre il salvataggio è in corso, resta in attesa', () => {
    const locale = aggiornaDiario(nuovo(), { ...DIARIO_VUOTO, lunch: 'Pasta' });
    const campiInviati = campiDaSalvare(locale.diario);
    const cambiato = aggiornaDiario(locale, { ...locale.diario, dinner: 'Minestra' });
    assert.equal(dopoSalvataggio(cambiato, 'riga-9', campiInviati).inAttesa, true);
  });
  it('un errore lascia la copia locale in attesa con lo stato di errore visibile', () => {
    const locale = dopoErrore(aggiornaDiario(nuovo(), { ...DIARIO_VUOTO, lunch: 'Pasta' }), 'rete');
    assert.equal(locale.inAttesa, true);
    assert.equal(locale.errore, 'rete');
    assert.equal(pianificaSalvataggio(locale, USER).tipo, 'inserisci');
  });
});

describe('condivisione una volta sola', () => {
  it('riga assente → inserimento già submitted con submitted_at', () => {
    const locale = aggiornaDiario(nuovo(), { ...DIARIO_VUOTO, dinner: 'Riso' });
    const op = pianificaCondivisione(locale, USER, ADESSO);
    assert.equal(op.tipo, 'inserisciCondiviso');
    if (op.tipo !== 'inserisciCondiviso') return;
    assert.equal(op.riga.status, 'submitted');
    assert.equal(op.riga.submitted_at, ADESSO);
    assert.equal(op.riga.dinner, 'Riso');
  });
  it('bozza → una sola modifica che porta status a submitted con gli ultimi campi', () => {
    const salvato = campiDaSalvare({ ...DIARIO_VUOTO, dinner: 'Riso' });
    const bozza = diarioLocaleIniziale(CLIENT, OGGI, { ...DIARIO_VUOTO, dinner: 'Riso', day_comment: 'Bene' }, { tipo: 'bozza', id: 'riga-1', salvato });
    const op = pianificaCondivisione(bozza, USER, ADESSO);
    assert.equal(op.tipo, 'condividi');
    if (op.tipo !== 'condividi') return;
    assert.equal(op.modifica.id, 'riga-1');
    assert.equal(op.modifica.campi.status, 'submitted');
    assert.equal(op.modifica.campi.submitted_at, ADESSO);
    assert.equal(op.modifica.campi.day_comment, 'Bene');
  });
  it('riga già condivisa → nessuna seconda condivisione e nessun salvataggio', () => {
    const condiviso = dopoCondivisione(nuovo(), 'riga-1', ADESSO);
    assert.deepEqual(pianificaCondivisione(condiviso, USER, ADESSO), { tipo: 'giaCondiviso' });
    assert.deepEqual(pianificaSalvataggio(condiviso, USER), { tipo: 'nessuna' });
    assert.equal(aggiornaDiario(condiviso, { ...DIARIO_VUOTO, lunch: 'x' }).inAttesa, false);
  });
  it("se il server dice che la riga è già condivisa (invio automatico, web app) l'app mostra condiviso senza riscrivere", () => {
    const locale = dopoErrore(aggiornaDiario(nuovo(), { ...DIARIO_VUOTO, lunch: 'Pasta' }), 'rete');
    const dopo = rigaGiaCondivisa(locale, 'riga-7', '2026-10-19T21:50:00.000Z', { lunch: 'Pasta al pomodoro' });
    assert.equal(dopo.riga.tipo, 'condiviso');
    assert.equal(dopo.inAttesa, false);
    assert.equal(dopo.diario.lunch, 'Pasta al pomodoro');
    assert.deepEqual(pianificaCondivisione(dopo, USER, ADESSO), { tipo: 'giaCondiviso' });
  });
});

describe('copia locale', () => {
  it('vale solo per lo stesso cliente e lo stesso giorno (a mezzanotte si passa al giorno nuovo)', () => {
    const locale = nuovo();
    assert.equal(copiaValida(locale, CLIENT, OGGI), true);
    assert.equal(copiaValida(locale, CLIENT, '2026-10-20'), false);
    assert.equal(copiaValida(locale, 'altro', OGGI), false);
    assert.equal(copiaValida(null, CLIENT, OGGI), false);
  });
});

describe('copia locale più recente del server (app chiusa in modo improvviso)', () => {
  const T0 = '2026-10-19T19:00:00.000Z';
  const T1 = '2026-10-19T19:05:00.000Z';
  it("una modifica locale porta l'istante e resta in attesa anche con il campo di testo ancora aperto", () => {
    const locale = aggiornaDiario(nuovo(), { ...DIARIO_VUOTO, dinner: 'Minestra di verd' }, T1);
    assert.equal(locale.modificatoAlle, T1);
    assert.equal(locale.inAttesa, true);
    const op = pianificaSalvataggio(locale, USER);
    assert.equal(op.tipo, 'inserisci');
    if (op.tipo === 'inserisci') assert.equal(op.riga.dinner, 'Minestra di verd');
  });
  it('la copia locale in attesa vince se è più recente di updated_at, altrimenti vince il server', () => {
    const locale = aggiornaDiario(nuovo(), { ...DIARIO_VUOTO, lunch: 'Pasta' }, T1);
    assert.equal(copiaLocalePiuRecente(locale, T0), true);
    assert.equal(copiaLocalePiuRecente(locale, '2026-10-19T19:05:00+00:00'), true); // stesso istante, formato Postgres
    assert.equal(copiaLocalePiuRecente(locale, '2026-10-19T19:06:00+00:00'), false);
    assert.equal(copiaLocalePiuRecente(locale, null), true); // riga assente sul server
  });
  it('una copia locale senza modifiche in attesa non vince mai', () => {
    assert.equal(copiaLocalePiuRecente(nuovo(), null), false);
    const salvato = dopoSalvataggio(aggiornaDiario(nuovo(), { ...DIARIO_VUOTO, lunch: 'Pasta' }, T1), 'riga-1', campiDaSalvare({ ...DIARIO_VUOTO, lunch: 'Pasta' }));
    assert.equal(copiaLocalePiuRecente(salvato, T0), false);
  });
});
