// Stato dei giorni della Card settimana (Figma 449:253, componente Giorno della settimana 439:112) a partire dalle
// righe lette per la settimana corrente. Varianti: condiviso, condiviso con commento da leggere (pallino rosso),
// condiviso con commento letto (pallino verde scuro), oggi, oggi con commento da leggere / letto (704:436, 704:442),
// futuro, non condiviso.
import { statoCommento, type StatoCommento } from './commento.ts';
import { confrontaDate, giorniDellaSettimana, INIZIALI_SETTIMANA } from './data.ts';
import { statoRiga } from './letture.ts';

export type StatoGiorno = 'condiviso' | 'condivisoDaLeggere' | 'condivisoLetto' | 'oggi' | 'oggiDaLeggere' | 'oggiLetto' | 'futuro' | 'nonCondiviso';
export type GiornoSettimana = {
  data: string;
  iniziale: string;
  stato: StatoGiorno;
  /** Esiste una riga condivisa: il giorno si può toccare per aprire il pannello (anche oggi, se già condiviso). */
  condiviso: boolean;
  commento: StatoCommento;
};

export type RigaPerSettimana = { submission_date: string; status: string; nutritionist_comment: string | null; comment_acknowledged: boolean | null };

/**
 * Per ogni giorno da lunedì a domenica: oggi → "oggi" (anche se già condiviso: il disegno evidenzia sempre il
 * giorno corrente), con il pallino del commento se la giornata di oggi è condivisa e commentata; giorni passati → condiviso se esiste una riga submitted (con il pallino del
 * commento se c'è), altrimenti non condiviso (una bozza non conta); giorni futuri → futuro.
 */
export function giorniSettimana(oggi: string, righe: RigaPerSettimana[]): GiornoSettimana[] {
  const condivise = new Map(righe.filter((r) => statoRiga(r.status) === 'submitted').map((r) => [r.submission_date, r] as const));
  return giorniDellaSettimana(oggi).map((data, i) => {
    const c = confrontaDate(data, oggi);
    const riga = condivise.get(data);
    const commento: StatoCommento = riga ? statoCommento(riga) : 'nessuno';
    let stato: StatoGiorno;
    if (c === 0) stato = commento === 'daLeggere' ? 'oggiDaLeggere' : commento === 'letto' ? 'oggiLetto' : 'oggi';
    else if (c > 0) stato = 'futuro';
    else if (!riga) stato = 'nonCondiviso';
    else stato = commento === 'daLeggere' ? 'condivisoDaLeggere' : commento === 'letto' ? 'condivisoLetto' : 'condiviso';
    return { data, iniziale: INIZIALI_SETTIMANA[i] ?? '', stato, condiviso: riga !== undefined, commento };
  });
}
