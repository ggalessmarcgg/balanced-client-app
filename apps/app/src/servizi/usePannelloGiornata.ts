// Pannello della giornata (lotto 2): si apre su un giorno condiviso della settimana, dello storico o da una data
// della rotta; il commento si segna letto all'apertura; "Modifica" riapre i blocchi del diario con le regole di
// salvataggio della bozza. Usa la memoria di sessione (memoriaDiario), quindi funziona uguale da Oggi e dallo storico.
import { useCallback, useEffect, useRef, useState } from 'react';

import { autoreCommento, statoCommento, type AutoreCommento } from '@/core/diario/commento';
import { dataOggiRoma, dataValida, giorniDellaSettimana } from '@/core/diario/data';
import { aggiornaGiornata, giornataDaRiga, giornataDaRileggere, type GiornataLocale } from '@/core/diario/giornata';
import { statoRiga } from '@/core/diario/letture';
import { BLOCCHI, bloccoSuccessivo, type Blocco, type Diario } from '@/core/diario/modello';
import { leggiAutore, leggiGiornata, leggiGiornataPerData, type EsitoScrittura } from '@/servizi/diario';
import { fotoInCache } from '@/servizi/foto';
import { impostaGiornata, ricordaRigaFuoriSettimana, rigaNota, riprovaLetture, salvaGiornateInAttesa, segnaLetto } from '@/servizi/giornate';
import { aggiornaMemoria, memoriaDiario, persistiMemoria, useMemoriaDiario } from '@/servizi/memoriaDiario';

export type CommentoPannello = { testo: string; /** Era da leggere all'apertura: etichetta "Nuovo" nella Card commento. */ nuovo: boolean; autore: AutoreCommento | null };
export type FasePannello = { tipo: 'caricamento' } | { tipo: 'rete' } | { tipo: 'errore' } | { tipo: 'pronto'; giornata: GiornataLocale; commento: CommentoPannello | null };
export type StatoPannello = {
  data: string;
  fase: FasePannello;
  /** Blocco aperto in modifica; null = riassunto "La tua giornata". */
  modifica: Blocco | null;
};

export type NotificaDiario = { tipo: 'conferma'; testo: string } | { tipo: 'errore'; testo: string; riprova: boolean };

export const TESTI_MODIFICA = {
  erroreRete: 'Sei offline: le modifiche sono salvate sul telefono.',
  erroreModifica: 'Non siamo riusciti a salvare le modifiche alla giornata.',
} as const;

export function notificaModifica(esito: EsitoScrittura | null): NotificaDiario | null {
  if (!esito || esito.tipo !== 'errore') return null;
  return { tipo: 'errore', testo: esito.errore === 'rete' ? TESTI_MODIFICA.erroreRete : TESTI_MODIFICA.erroreModifica, riprova: true };
}

/** Nutrizionista del cliente (dal profilo dello stato): ripiego per l'autore del commento. */
export type NutrizionistaCliente = { nome: string; foto: string | null } | null;

export type AzioniPannello = {
  pannello: StatoPannello | null;
  /** Apre il pannello di una giornata condivisa (giorno della Card settimana, dello storico o data dalla rotta). */
  apriGiornata: (data: string) => void;
  chiudiPannello: () => void;
  /** "Riprova" dopo un errore di caricamento del pannello. */
  riprovaPannello: () => void;
  /** "Modifica" nel pannello: riapre i passaggi del diario dal primo blocco. */
  modificaGiornata: () => void;
  chiudiModifica: () => void;
  avantiModifica: () => void;
  indietroModifica: () => void;
  vaiAModifica: (blocco: Blocco) => void;
  aggiornaGiornata: (diario: Diario) => void;
  /** Salva le modifiche in attesa (uscita dalla pagina, app in secondo piano, "Riprova"). */
  salvaModifiche: (mostraErrore: boolean) => void;
};

export function usePannelloGiornata(clientId: string, nutrizionista: NutrizionistaCliente, onNotifica?: (notifica: NotificaDiario) => void): AzioniPannello {
  const memoria = useMemoriaDiario();
  const [pannello, setPannello] = useState<StatoPannello | null>(null);
  const pannelloRef = useRef<StatoPannello | null>(null);
  const nutrizionistaRef = useRef(nutrizionista);
  const onNotificaRef = useRef(onNotifica);
  const montato = useRef(true);
  useEffect(() => {
    nutrizionistaRef.current = nutrizionista;
    onNotificaRef.current = onNotifica;
  }, [nutrizionista, onNotifica]);

  const impostaPannello = useCallback((nuovo: StatoPannello | null) => {
    pannelloRef.current = nuovo;
    if (montato.current) setPannello(nuovo);
  }, []);

  const salvaModifiche = useCallback((mostraErrore: boolean) => {
    void salvaGiornateInAttesa().then((esito) => {
      const n = notificaModifica(esito);
      if (n && mostraErrore && montato.current) onNotificaRef.current?.(n);
    });
  }, []);

  // All'uscita dalla pagina le modifiche in attesa si salvano.
  useEffect(() => {
    montato.current = true;
    return () => {
      montato.current = false;
      void salvaGiornateInAttesa();
    };
  }, []);

  const apriGiornata = useCallback(
    (data: string) => {
      if (!dataValida(data) || pannelloRef.current?.data === data) return;
      // Le modifiche in attesa di un pannello precedente si salvano prima di passare a un'altra giornata.
      salvaModifiche(true);
      riprovaLetture();
      impostaPannello({ data, fase: { tipo: 'caricamento' }, modifica: null });
      (async () => {
        const oggi = memoriaDiario().locale?.data ?? dataOggiRoma(new Date());
        // 1. La riga (con commento e "letto"): dalla settimana o dai giorni già aperti; altrimenti una lettura per data.
        let riga = rigaNota(data);
        if (!riga) {
          if (giorniDellaSettimana(oggi).includes(data)) return impostaPannello(null); // non condiviso: nulla da aprire
          const esito = await leggiGiornataPerData(clientId, data);
          if (pannelloRef.current?.data !== data) return;
          if (esito.tipo !== 'ok') return impostaPannello({ data, fase: { tipo: esito.tipo }, modifica: null });
          if (!esito.dati || statoRiga(esito.dati.status) !== 'submitted') return impostaPannello(null);
          const { nutritionist_comment, comment_author_id, comment_acknowledged, ...completa } = esito.dati;
          riga = { ...completa, nutritionist_comment, comment_author_id, comment_acknowledged };
          ricordaRigaFuoriSettimana(riga);
          aggiornaMemoria({ giornate: { ...memoriaDiario().giornate, [data]: giornataDaRiga(completa) } });
        }
        // 2. La giornata completa: dalla cache se è ancora quella del server, altrimenti una lettura per id.
        let giornata = memoriaDiario().giornate[data];
        if (giornataDaRileggere(giornata, riga)) {
          const esito = await leggiGiornata(riga.id);
          if (pannelloRef.current?.data !== data) return;
          if (esito.tipo === 'ok' && esito.dati) giornata = giornataDaRiga(esito.dati);
          else if (esito.tipo === 'rete' && giornata) {
            // senza rete si mostra la copia in cache
          } else return impostaPannello({ data, fase: { tipo: esito.tipo === 'ok' ? 'errore' : esito.tipo }, modifica: null });
          aggiornaMemoria({ giornate: { ...memoriaDiario().giornate, [data]: giornata } });
        }
        if (!giornata) return impostaPannello({ data, fase: { tipo: 'errore' }, modifica: null });
        // 3. Il commento: autore (dalla memoria, precaricato) e "letto" all'apertura.
        const stato = statoCommento(riga);
        let commento: CommentoPannello | null = null;
        if (stato !== 'nessuno' && riga.nutritionist_comment) {
          const profilo = riga.comment_author_id ? await leggiAutore(riga.comment_author_id) : null;
          const autore = autoreCommento(profilo, nutrizionistaRef.current);
          // Foto già su disco (precaricata o vista prima): si mostra subito, senza dissolvenza.
          if (autore?.foto) autore.fotoPronta = await fotoInCache(autore.foto);
          if (pannelloRef.current?.data !== data) return;
          commento = { testo: riga.nutritionist_comment.trim(), nuovo: stato === 'daLeggere', autore };
          if (stato === 'daLeggere') segnaLetto(riga);
        }
        persistiMemoria();
        impostaPannello({ data, fase: { tipo: 'pronto', giornata, commento }, modifica: null });
      })();
    },
    [clientId, impostaPannello, salvaModifiche],
  );

  const chiudiPannello = useCallback(() => {
    impostaPannello(null);
    salvaModifiche(true);
  }, [impostaPannello, salvaModifiche]);

  const riprovaPannello = useCallback(() => {
    const data = pannelloRef.current?.data;
    if (!data) return;
    impostaPannello(null);
    apriGiornata(data);
  }, [apriGiornata, impostaPannello]);

  const modificaGiornata = useCallback(() => {
    const p = pannelloRef.current;
    if (!p || p.fase.tipo !== 'pronto') return;
    impostaPannello({ ...p, modifica: 'pasti' });
  }, [impostaPannello]);

  const chiudiModifica = useCallback(() => {
    const p = pannelloRef.current;
    if (p) impostaPannello({ ...p, modifica: null });
    salvaModifiche(true);
  }, [impostaPannello, salvaModifiche]);

  const vaiAModifica = useCallback(
    (nuovo: Blocco) => {
      const p = pannelloRef.current;
      if (p && p.modifica !== nuovo) impostaPannello({ ...p, modifica: nuovo });
      salvaModifiche(true);
    },
    [impostaPannello, salvaModifiche],
  );

  const avantiModifica = useCallback(() => {
    const b = pannelloRef.current?.modifica;
    const prossimo = b ? bloccoSuccessivo(b) : null;
    if (prossimo) vaiAModifica(prossimo);
  }, [vaiAModifica]);

  const indietroModifica = useCallback(() => {
    const b = pannelloRef.current?.modifica;
    const precedente = b ? BLOCCHI[BLOCCHI.indexOf(b) - 1] : undefined;
    if (precedente) vaiAModifica(precedente);
  }, [vaiAModifica]);

  const aggiornaGiornataAperta = useCallback((diario: Diario) => {
    const p = pannelloRef.current;
    if (!p || p.fase.tipo !== 'pronto') return;
    const attuale = memoriaDiario().giornate[p.data] ?? p.fase.giornata;
    impostaGiornata(aggiornaGiornata(attuale, diario));
  }, []);

  // La giornata mostrata è quella in memoria (aggiornata dalle modifiche e dai salvataggi).
  const giornataInMemoria = pannello?.fase.tipo === 'pronto' ? memoria.giornate[pannello.data] : undefined;
  const pannelloMostrato =
    pannello && pannello.fase.tipo === 'pronto' && giornataInMemoria && giornataInMemoria !== pannello.fase.giornata
      ? { ...pannello, fase: { ...pannello.fase, giornata: giornataInMemoria } }
      : pannello;

  return {
    pannello: pannelloMostrato,
    apriGiornata,
    chiudiPannello,
    riprovaPannello,
    modificaGiornata,
    chiudiModifica,
    avantiModifica,
    indietroModifica,
    vaiAModifica,
    aggiornaGiornata: aggiornaGiornataAperta,
    salvaModifiche,
  };
}
