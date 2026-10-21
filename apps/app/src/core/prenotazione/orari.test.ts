import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { alternaScelta, conUnaRipetizione, giorniDagliOrari, giorniDellaScheda, giornoGriglia, normalizzaOrari, raggruppaPerData, RITARDO_RIPETIZIONE_MS, sceltaAncoraValida, type OrarioDisponibile } from './orari.ts';

const o = (date: string, time: string): OrarioDisponibile => ({ date, time });

describe('orari disponibili', () => {
  it('normalizza la risposta della funzione: solo righe valide, senza doppioni, ordinate per giorno e ora', () => {
    const orari = normalizzaOrari([o('2026-07-21', '12:00'), o('2026-07-20', '11:00'), { date: '2026-07-20', time: '9:00' }, o('2026-07-20', '09:00'), o('2026-07-20', '09:00'), null, 'x', { date: '2026-13-01', time: '10:00' }]);
    assert.deepEqual(orari, [o('2026-07-20', '09:00'), o('2026-07-20', '11:00'), o('2026-07-21', '12:00')]);
    assert.deepEqual(normalizzaOrari(null), []);
    assert.deepEqual(normalizzaOrari({ date: 'x' }), []);
  });

  it('raggruppa per data con le ore in ordine (SlotPage.tsx, slotsByDate)', () => {
    const perData = raggruppaPerData([o('2026-07-20', '11:00'), o('2026-07-20', '09:00'), o('2026-07-24', '15:00')]);
    assert.deepEqual([...perData.entries()], [
      ['2026-07-20', ['09:00', '11:00']],
      ['2026-07-24', ['15:00']],
    ]);
  });

  it('giorni dalla risposta: 10 feriali dalla prima data restituita, due schede da 5, mai dal fuso del telefono', () => {
    // La prima data è mercoledì 22 luglio 2026: la griglia parte da lì (il server ha già escluso lunedì e martedì).
    const giorni = giorniDagliOrari([o('2026-07-24', '15:00'), o('2026-07-22', '09:00'), o('2026-07-30', '16:00')]);
    assert.equal(giorni.length, 10);
    assert.deepEqual(
      giorni.map((g) => g.data),
      ['2026-07-22', '2026-07-23', '2026-07-24', '2026-07-27', '2026-07-28', '2026-07-29', '2026-07-30', '2026-07-31', '2026-08-03', '2026-08-04'],
    );
    assert.deepEqual(giorni[0], { data: '2026-07-22', giorno: 'mer', etichetta: '22.07' });
    assert.deepEqual(giorniDellaScheda(giorni, 0).map((g) => g.giorno), ['mer', 'gio', 'ven', 'lun', 'mar']);
    assert.deepEqual(giorniDellaScheda(giorni, 1).map((g) => g.etichetta), ['29.07', '30.07', '31.07', '03.08', '04.08']);
    assert.deepEqual(giorniDellaScheda(giorni, 2), []);
  });

  it('griglia: parte da lunedì se la prima data cade nel weekend e si allunga fino a includere ogni data (dato inatteso)', () => {
    const giorni = giorniDagliOrari([o('2026-07-18', '10:00'), o('2026-08-10', '10:00')]);
    assert.equal(giorni[0]?.data, '2026-07-20');
    assert.ok(giorni.some((g) => g.data === '2026-08-10'));
    assert.ok(giorni.length >= 10);
    assert.deepEqual(giorniDagliOrari([]), []);
  });

  it('etichette dei giorni: abbreviazione minuscola e gg.mm', () => {
    assert.deepEqual(giornoGriglia('2026-07-20'), { data: '2026-07-20', giorno: 'lun', etichetta: '20.07' });
    assert.deepEqual(giornoGriglia('2026-10-02'), { data: '2026-10-02', giorno: 'ven', etichetta: '02.10' });
  });

  it('selezione singola attraverso le schede: il secondo tocco deseleziona; la scelta cade se l\'orario sparisce', () => {
    const a = o('2026-07-20', '09:00');
    const b = o('2026-07-28', '16:00');
    assert.deepEqual(alternaScelta(null, a), a);
    assert.deepEqual(alternaScelta(a, b), b);
    assert.equal(alternaScelta(a, { ...a }), null);
    assert.deepEqual(sceltaAncoraValida(a, [a, b]), a);
    assert.equal(sceltaAncoraValida(a, [b]), null);
    assert.equal(sceltaAncoraValida(null, [a]), null);
  });

  it('una sola ripetizione dopo 300 ms su errore; il secondo errore si propaga', async () => {
    const attese: number[] = [];
    const attendi = async (ms: number) => {
      attese.push(ms);
    };
    let tentativi = 0;
    const esito = await conUnaRipetizione(async () => {
      tentativi += 1;
      if (tentativi === 1) throw new Error('rete');
      return 'ok';
    }, attendi);
    assert.equal(esito, 'ok');
    assert.equal(tentativi, 2);
    assert.deepEqual(attese, [RITARDO_RIPETIZIONE_MS]);
    await assert.rejects(
      conUnaRipetizione(async () => {
        throw new Error('ancora');
      }, attendi),
      /ancora/,
    );
    // Senza errore nessuna attesa.
    attese.length = 0;
    assert.equal(await conUnaRipetizione(async () => 1, attendi), 1);
    assert.deepEqual(attese, []);
  });
});
