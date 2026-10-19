// Stato dei giorni della Card settimana (Figma 449:253, componente Giorno della settimana 439:112) a partire dalle
// righe lette per l'intervallo. Le varianti con il commento della nutrizionista arrivano con il lotto 2.
import { confrontaDate, giorniDellaSettimana, INIZIALI_SETTIMANA } from './data.ts';
import { statoRiga } from './letture.ts';

export type StatoGiorno = 'condiviso' | 'oggi' | 'futuro' | 'nonCondiviso';
export type GiornoSettimana = { data: string; iniziale: string; stato: StatoGiorno };

/**
 * Per ogni giorno da lunedì a domenica: oggi → "oggi" (anche se già condiviso: il disegno evidenzia sempre il
 * giorno corrente); giorni passati → condiviso se esiste una riga submitted, altrimenti non condiviso (una bozza
 * non conta); giorni futuri → futuro.
 */
export function giorniSettimana(oggi: string, righe: { submission_date: string; status: string }[]): GiornoSettimana[] {
  const condivisi = new Set(righe.filter((r) => statoRiga(r.status) === 'submitted').map((r) => r.submission_date));
  return giorniDellaSettimana(oggi).map((data, i) => {
    const c = confrontaDate(data, oggi);
    const stato: StatoGiorno = c === 0 ? 'oggi' : c > 0 ? 'futuro' : condivisi.has(data) ? 'condiviso' : 'nonCondiviso';
    return { data, iniziale: INIZIALI_SETTIMANA[i] ?? '', stato };
  });
}
