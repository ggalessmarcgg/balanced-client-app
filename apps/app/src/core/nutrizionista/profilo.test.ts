import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { cognomeConTitolo, conArticolo, ferieInCorso, linkWhatsApp, orariDiLavoro, orarioLeggibile, profiloNutrizionista, telefonoDa, telefonoOscurato, type RigaProfiloNutrizionista } from './profilo.ts';

const RIGA: RigaProfiloNutrizionista = {
  id: 'n1',
  title: 'Dott.ssa',
  full_name: 'Ludovica Damiani',
  expertise: 'Biologa Nutrizionista',
  registration_number: 'AA_088614',
  app_photo_url: 'https://x/foto.jpg',
  app_square_photo_url: 'https://x/quadrata.jpg',
  who_are_you: ' Mi occupo di educazione alimentare. ',
  competences: ['Ricomposizione corporea', '', 'Gravidanza'],
  certifications: ['Laurea magistrale'],
  working_hours: { Lun: '09:00 - 18:00', Mer: '14:00 - 20:00', Ven: '9:00-13:00', Sab: '' },
  phone: '+39 333 1234567',
};

describe('profilo della nutrizionista', () => {
  it('nome con titolo, sezioni ripulite, orari nell\'ordine della settimana solo per i giorni presenti', () => {
    const p = profiloNutrizionista(RIGA);
    assert.equal(p.nome, 'Dott.ssa Ludovica Damiani');
    assert.equal(p.chiSono, 'Mi occupo di educazione alimentare.');
    assert.deepEqual(p.competenze, ['Ricomposizione corporea', 'Gravidanza']);
    assert.deepEqual(p.orari, [
      { giorno: 'Lunedì', orario: '9:00 – 18:00' },
      { giorno: 'Mercoledì', orario: '14:00 – 20:00' },
      { giorno: 'Venerdì', orario: '9:00 – 13:00' },
    ]);
    assert.equal(p.telefono?.formattato, '+39 333 123 4567');
  });
  it('sezioni vuote o nulle → assenti (schermata con sezioni opzionali)', () => {
    const p = profiloNutrizionista({ ...RIGA, expertise: '', registration_number: null, who_are_you: null, competences: null, certifications: [], working_hours: 'testo', phone: null });
    assert.equal(p.specializzazione, null);
    assert.equal(p.numeroAlbo, null);
    assert.equal(p.chiSono, null);
    assert.deepEqual(p.competenze, []);
    assert.deepEqual(p.certificazioni, []);
    assert.deepEqual(p.orari, []);
    assert.equal(p.telefono, null);
    assert.deepEqual(orariDiLavoro(null), []);
    assert.equal(orarioLeggibile('su appuntamento'), 'su appuntamento');
  });
  it('telefono: solo cellulari italiani, in qualunque forma; oscurato per chi non è abbonato; link WhatsApp', () => {
    assert.equal(telefonoDa('393331234567')?.formattato, '+39 333 123 4567');
    assert.equal(telefonoDa('3331234567')?.cifre, '393331234567');
    assert.equal(telefonoDa('0039 333 1234567')?.cifre, '393331234567');
    assert.equal(telefonoDa('+41 79 123 4567'), null);
    assert.equal(telefonoDa('02 1234567'), null);
    assert.equal(telefonoOscurato(telefonoDa('+39 347 765 4321')), '+39 34• ••• ••••');
    assert.equal(telefonoOscurato(null), '+39 33• ••• ••••');
    assert.equal(linkWhatsApp({ formattato: '', cifre: '393331234567' }), 'https://wa.me/393331234567?text=Salve%20Dott.ssa');
  });
  it('ferie in corso: frase con le date puntate e sostituta con cognome e titolo; senza righe → null', () => {
    const f = ferieInCorso(
      [{ holiday_id: 'h', nutritionist_holidays: { start_date: '2026-10-12', end_date: '2026-10-20' }, sostituta: { id: 's', title: 'Dott.ssa', full_name: 'Veronica Gritti', app_square_photo_url: null, phone: '3477654321' } }],
      'Dott.ssa Ludovica Damiani',
    );
    assert.equal(f?.etichetta, 'Dott.ssa Ludovica Damiani è assente dal 12.10 al 20.10.');
    assert.equal(f?.sostituta?.cognomeConTitolo, 'Dott.ssa Gritti');
    assert.equal(f?.sostituta?.iniziali, 'VG');
    assert.equal(f?.sostituta?.telefono?.formattato, '+39 347 765 4321');
    assert.equal(ferieInCorso([], 'x'), null);
    assert.equal(ferieInCorso([{ holiday_id: 'h', nutritionist_holidays: { start_date: '2026-10-12', end_date: '2026-10-20' }, sostituta: null }], 'x')?.sostituta, null);
    assert.equal(cognomeConTitolo('Dott.', 'Marco De Luca'), 'Dott. Luca');
    assert.equal(conArticolo('Dott.ssa Ludovica Damiani'), 'La Dott.ssa Ludovica Damiani');
    assert.equal(conArticolo('Dott. Marco Rossi'), 'Il Dott. Marco Rossi');
  });
});
