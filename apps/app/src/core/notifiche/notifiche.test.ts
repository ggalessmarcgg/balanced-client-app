import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { composiNotifica, daQuando, elencoNotifiche, etichettaOra, FILTRO_TIPI_ESCLUSI, nomeDiBattesimo, nuoveDaLeggere, numeroDalCorpo, segnaCliccata, segnaViste, type RigaNotifica } from './notifiche.ts';

const ADESSO = new Date('2026-10-15T10:00:00.000Z'); // giovedì 15 ottobre 2026, 12:00 a Roma

function riga(parziale: Partial<RigaNotifica>): RigaNotifica {
  return { id: 'n1', notification_type: 'nutritionist_comment', reference_id: 's1', reference_table: 'daily_submissions', title: 'Nuovo commento', body: null, viewed_at: null, clicked_at: null, created_at: '2026-10-15T07:12:00.000Z', ...parziale };
}

const CONTESTO = {
  nomeNutrizionista: 'Margherita',
  dataGiornata: (id: string) => (id === 's1' ? '2026-10-14' : null),
  revisione: (id: string) => (id === 'r13' ? { numero: 13, diari: 7 } : null),
  ferie: { al: '2026-10-20', sostituta: 'Dott.ssa Veronica Gritti' },
};

describe('etichettaOra', () => {
  it('oggi, ieri e giorno della settimana in ora italiana', () => {
    assert.equal(etichettaOra('2026-10-15T07:12:00.000Z', ADESSO), 'Oggi, 09:12');
    assert.equal(etichettaOra('2026-10-14T16:40:00.000Z', ADESSO), 'Ieri, 18:40');
    assert.equal(etichettaOra('2026-10-12T09:02:00.000Z', ADESSO), 'Lun, 11:02');
    assert.equal(etichettaOra('2026-10-10T08:00:00.000Z', ADESSO), 'Sab, 10:00');
    // 23:30 UTC del 14 è già il 15 a Roma → "Oggi".
    assert.equal(etichettaOra('2026-10-14T23:30:00.000Z', ADESSO), 'Oggi, 01:30');
    assert.equal(etichettaOra('non valido', ADESSO), '');
  });
});

describe('composiNotifica', () => {
  it('commento: nome, giornata e destinazione del pannello', () => {
    const n = composiNotifica(riga({}), CONTESTO, ADESSO);
    assert.equal(n.titolo, 'Nuovo commento sul tuo diario');
    assert.equal(n.testo, 'Margherita ha commentato la tua giornata di mercoledì.');
    assert.deepEqual(n.destinazione, { tipo: 'giornata', submissionId: 's1' });
    assert.equal(n.daLeggere, true);
    assert.equal(n.ora, 'Oggi, 09:12');
  });
  it('commento senza giornata in memoria: frase generica', () => {
    const n = composiNotifica(riga({ reference_id: 'altra' }), CONTESTO, ADESSO);
    assert.equal(n.testo, 'Margherita ha commentato una tua giornata.');
  });
  it('revisione inviata: numero dalla memoria o dal corpo salvato', () => {
    const a = composiNotifica(riga({ notification_type: 'review_sent', reference_id: 'r13', reference_table: 'client_reviews', viewed_at: '2026-10-15T08:00:00.000Z' }), CONTESTO, ADESSO);
    assert.equal(a.titolo, 'La tua revisione è pronta');
    assert.equal(a.testo, 'Revisione 13: scopri cosa è andato bene questa settimana.');
    assert.deepEqual(a.destinazione, { tipo: 'revisione', id: 'r13' });
    assert.equal(a.daLeggere, false);
    const b = composiNotifica(riga({ notification_type: 'review_sent', reference_id: 'legacy', reference_table: 'client_phase_1_step_progress', body: 'Revisione 4: clicca per vederla' }), CONTESTO, ADESSO);
    assert.equal(b.testo, 'Revisione 4: scopri cosa è andato bene questa settimana.');
    assert.deepEqual(b.destinazione, { tipo: 'revisioni' });
  });
  it('revisione sbloccata con i diari condivisi', () => {
    const n = composiNotifica(riga({ notification_type: 'review_unlocked', reference_id: 'r13', reference_table: 'client_reviews' }), CONTESTO, ADESSO);
    assert.equal(n.titolo, 'Revisione sbloccata');
    assert.equal(n.testo, 'Hai condiviso 7 diari: Margherita sta preparando la revisione.');
    assert.deepEqual(n.destinazione, { tipo: 'revisioni' });
  });
  it('ferie: fine e sostituta dalle ferie in corso, riserva senza', () => {
    const con = composiNotifica(riga({ notification_type: 'holiday_replacement', reference_table: 'nutritionist_holidays' }), CONTESTO, ADESSO);
    assert.equal(con.testo, 'Fino al 20 ottobre ti segue la Dott.ssa Veronica Gritti.');
    assert.deepEqual(con.destinazione, { tipo: 'nutrizionista' });
    const senza = composiNotifica(riga({ notification_type: 'holiday_replacement' }), { nomeNutrizionista: 'Margherita', ferie: null }, ADESSO);
    assert.equal(senza.testo, 'Durante le ferie della tua nutrizionista ti segue una collega.');
  });
  it('tipi senza destinazione: corpo salvato come testo', () => {
    const n = composiNotifica(riga({ notification_type: 'food_suggestion_approved', body: 'Il tuo suggerimento per lo spuntino è stato aggiunto al piano.' }), CONTESTO, ADESSO);
    assert.equal(n.titolo, 'Suggerimento approvato');
    assert.equal(n.testo, 'Il tuo suggerimento per lo spuntino è stato aggiunto al piano.');
    assert.equal(n.destinazione, null);
    const x = composiNotifica(riga({ notification_type: 'content_unlocked', title: 'Nuovo contenuto', body: 'Leggi…' }), {}, ADESSO);
    assert.equal(x.titolo, 'Nuovo contenuto');
    assert.equal(x.testo, 'Leggi…');
  });
  it('senza il nome della nutrizionista in memoria', () => {
    const n = composiNotifica(riga({}), { dataGiornata: () => '2026-10-14' }, ADESSO);
    assert.equal(n.testo, 'La tua nutrizionista ha commentato la tua giornata di mercoledì.');
  });
});

describe('elencoNotifiche e pallino', () => {
  const righe = [
    riga({ id: 'a', created_at: '2026-10-12T09:02:00.000Z' }),
    riga({ id: 'b', notification_type: 'diary_reminder', created_at: '2026-10-15T09:00:00.000Z' }),
    riga({ id: 'c', created_at: '2026-10-15T07:12:00.000Z', viewed_at: '2026-10-15T08:00:00.000Z' }),
    riga({ id: 'vecchia', created_at: '2026-10-01T07:12:00.000Z' }),
  ];
  it('esclude i promemoria e le righe oltre i 7 giorni, dalla più recente', () => {
    assert.deepEqual(elencoNotifiche(righe, CONTESTO, ADESSO).map((n) => n.id), ['c', 'a']);
  });
  it('il filtro della lettura esclude i tre promemoria', () => {
    assert.equal(FILTRO_TIPI_ESCLUSI, '(diary_reminder,weight_update,measurement_update)');
    assert.equal(daQuando(ADESSO), '2026-10-08T10:00:00.000Z');
  });
  it('pallino solo con una notifica dell\'elenco non vista', () => {
    assert.equal(nuoveDaLeggere(righe, ADESSO), true);
    assert.equal(nuoveDaLeggere(segnaViste(righe, ADESSO), ADESSO), false);
    // Un promemoria non visto non accende il pallino.
    assert.equal(nuoveDaLeggere([righe[1]!], ADESSO), false);
  });
  it('segnature in memoria', () => {
    const viste = segnaViste(righe, ADESSO);
    assert.equal(viste.every((r) => r.viewed_at !== null), true);
    assert.equal(viste[2]!.viewed_at, '2026-10-15T08:00:00.000Z'); // già vista: invariata
    const cliccate = segnaCliccata(righe, 'a', ADESSO);
    assert.equal(cliccate[0]!.clicked_at, ADESSO.toISOString());
    assert.equal(cliccate[2]!.clicked_at, null);
  });
  it('nome di battesimo senza titolo', () => {
    assert.equal(nomeDiBattesimo('Dott.ssa Margherita Chiadò'), 'Margherita');
    assert.equal(nomeDiBattesimo('Dr. Luca Bianchi'), 'Luca');
    assert.equal(nomeDiBattesimo('Veronica Gritti'), 'Veronica');
    assert.equal(nomeDiBattesimo(''), '');
  });
  it('numero dal corpo salvato', () => {
    assert.equal(numeroDalCorpo('Revisione 13: clicca per vederla'), 13);
    assert.equal(numeroDalCorpo(''), null);
  });
});
