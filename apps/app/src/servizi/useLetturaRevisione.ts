// Lettura di una revisione: apertura segnata subito (la revisione smette di essere Nuova), testo dalla memoria o
// letto per id (rotta diretta), autrice con ripiego, e "letta" appena il piè di pagina entra nello schermo.
import { useCallback, useEffect, useRef, useState } from 'react';

import type { RigaAutore } from '@/core/diario/letture';
import { autoreRevisione, type AutoreRevisione } from '@/core/revisioni/autore';
import { leggibile } from '@/core/revisioni/lettura';
import { dataRoma } from '@/core/revisioni/stato';
import type { TestoRevisione } from '@/core/revisioni/testo';
import { leggiAutore } from '@/servizi/diario';
import { fotoInCache } from '@/servizi/foto';
import { memoriaRevisioni, useMemoriaRevisioni } from '@/servizi/memoriaRevisioni';
import { caricaRevisioni, caricaTestoRevisione, riprovaScritture, segnaAperta, segnaLetta } from '@/servizi/revisioni';
import type { NutrizionistaCliente } from '@/servizi/usePannelloGiornata';

export type RevisioneDaLeggere = {
  numero: number;
  /** Data di invio in ora italiana (YYYY-MM-DD), per "Venerdì 9 ottobre". */
  data: string | null;
  autore: AutoreRevisione | null;
  testo: TestoRevisione;
};

export type FaseLetturaRevisione =
  | { tipo: 'caricamento' }
  | { tipo: 'rete' }
  | { tipo: 'errore' }
  /** La revisione non esiste o non è stata inviata: si torna all'elenco. */
  | { tipo: 'nonLeggibile' }
  | { tipo: 'pronto'; revisione: RevisioneDaLeggere };

export type StatoLetturaRevisione = {
  fase: FaseLetturaRevisione;
  /** Numero della revisione appena la riga è nota (anche prima del testo). */
  numero: number | null;
  /** Il piè di pagina "Hai letto tutta la revisione." è entrato nello schermo. */
  onFondoRaggiunto: () => void;
  riprova: () => void;
};

export function useLetturaRevisione(id: string, clientId: string, nutrizionista: NutrizionistaCliente): StatoLetturaRevisione {
  const memoria = useMemoriaRevisioni();
  // Solo gli esiti negativi sono stato React: "pronto" si ricava dalla memoria (riga + testo) e dall'autrice.
  const [esitoNegativo, setEsitoNegativo] = useState<'rete' | 'errore' | 'nonLeggibile' | null>(null);
  const [tentativo, setTentativo] = useState(0);
  const [autore, setAutore] = useState<{ id: string; profilo: RigaAutore | null; fotoPronta: boolean } | null>(null);
  /** La revisione è pronta a schermo: il piè di pagina conta solo da qui, una volta per apertura. */
  const prontaPerIlFondo = useRef(false);
  const fondoSegnalato = useRef(false);
  const montato = useRef(true);
  const nutrizionistaRef = useRef(nutrizionista);
  useEffect(() => {
    nutrizionistaRef.current = nutrizionista;
  }, [nutrizionista]);

  const riga = memoria.clientId === clientId ? memoria.righe?.find((r) => r.id === id) : undefined;
  const testo = memoria.testi[id];

  // 1. Stato e testo: dalla memoria se ci sono; altrimenti la lettura della sezione (rotta diretta a freddo) e il
  //    testo per id. 2. Apertura segnata appena la revisione è nota. 3. Autrice.
  useEffect(() => {
    montato.current = true;
    let attivo = true;
    (async () => {
      let r = memoriaRevisioni().righe?.find((x) => x.id === id);
      if (!r || memoriaRevisioni().clientId !== clientId) {
        const esito = await caricaRevisioni(clientId, nutrizionistaRef.current?.foto ?? null, { soloStato: true });
        if (!attivo) return;
        r = memoriaRevisioni().righe?.find((x) => x.id === id);
        if (!r && esito.tipo !== 'ok') return setEsitoNegativo(esito.tipo === 'rete' ? 'rete' : 'errore');
      }
      if (!leggibile(r) || !r) return setEsitoNegativo('nonLeggibile');
      if (!memoriaRevisioni().testi[id]) {
        const esito = await caricaTestoRevisione(id);
        if (!attivo) return;
        if (!memoriaRevisioni().testi[id]) return setEsitoNegativo(esito.tipo === 'rete' ? 'rete' : 'errore');
      }
      segnaAperta(id);
      prontaPerIlFondo.current = true;
      if (r.review_author_id) {
        const profilo = await leggiAutore(r.review_author_id);
        const fotoPronta = profilo?.app_square_photo_url ? await fotoInCache(profilo.app_square_photo_url) : false;
        if (attivo) setAutore({ id: r.review_author_id, profilo, fotoPronta });
      } else {
        const foto = nutrizionistaRef.current?.foto;
        const fotoPronta = foto ? await fotoInCache(foto) : false;
        if (attivo) setAutore({ id: '', profilo: null, fotoPronta });
      }
    })();
    return () => {
      attivo = false;
      montato.current = false;
      prontaPerIlFondo.current = false;
      fondoSegnalato.current = false;
      void riprovaScritture();
    };
  }, [id, clientId, tentativo]);

  let fase: FaseLetturaRevisione = { tipo: 'caricamento' };
  if (esitoNegativo) fase = { tipo: esitoNegativo };
  else if (riga && testo && autore && leggibile(riga)) {
    const a = autoreRevisione(autore.profilo, nutrizionista);
    if (a) a.fotoPronta = autore.fotoPronta;
    fase = { tipo: 'pronto', revisione: { numero: riga.review_number, data: dataRoma(riga.sent_at), autore: a, testo } };
  }

  const onFondoRaggiunto = useCallback(() => {
    if (!prontaPerIlFondo.current || fondoSegnalato.current) return;
    fondoSegnalato.current = true;
    segnaLetta(id);
  }, [id]);

  const riprova = useCallback(() => {
    setEsitoNegativo(null);
    setTentativo((t) => t + 1);
  }, []);

  return { fase, numero: riga?.review_number ?? null, onFondoRaggiunto, riprova };
}
