// Operazioni sulle giornate condivise comuni a Oggi, storico e pannello: giornate in memoria, salvataggio delle
// modifiche in attesa (serializzato con le altre scritture), "letto" dei commenti con nuovo tentativo silenzioso.
import { pianificaLetto, segnaLettoInCache } from '@/core/diario/commento';
import { aggiornaGiornata, type GiornataLocale } from '@/core/diario/giornata';
import { statoRiga, type RigaSettimana } from '@/core/diario/letture';
import { salvaGiornata, scriviCommentoLetto, type EsitoScrittura } from '@/servizi/diario';
import { accodaScrittura, aggiornaMemoria, memoriaDiario, persistiMemoria } from '@/servizi/memoriaDiario';

/** Aggiorna una giornata in memoria; se è la giornata di oggi, già condivisa, anche il diario di oggi la segue. */
export function impostaGiornata(giornata: GiornataLocale): void {
  const m = memoriaDiario();
  const l = m.locale;
  aggiornaMemoria({
    giornate: { ...m.giornate, [giornata.data]: giornata },
    locale: l && l.data === giornata.data && l.riga.tipo === 'condiviso' ? { ...l, diario: giornata.diario } : l,
  });
  persistiMemoria();
}

/** La riga (con commento e "letto") di un giorno condiviso già nota: dalla settimana corrente o dai giorni aperti fuori settimana. */
export function rigaNota(data: string): RigaSettimana | undefined {
  const m = memoriaDiario();
  return m.settimana.find((r) => r.submission_date === data && statoRiga(r.status) === 'submitted') ?? m.righeFuoriSettimana[data];
}

export function ricordaRigaFuoriSettimana(riga: RigaSettimana): void {
  const m = memoriaDiario();
  aggiornaMemoria({ righeFuoriSettimana: { ...m.righeFuoriSettimana, [riga.submission_date]: riga } });
}

/** Aggiorna una riga nota (settimana o fuori settimana) dopo una modifica o un "letto". */
function aggiornaRigaNota(id: string, modifica: (riga: RigaSettimana) => RigaSettimana): void {
  const m = memoriaDiario();
  const fuori = Object.fromEntries(Object.entries(m.righeFuoriSettimana).map(([data, r]) => [data, r.id === id ? modifica(r) : r]));
  aggiornaMemoria({ settimana: m.settimana.map((r) => (r.id === id ? modifica(r) : r)), righeFuoriSettimana: fuori });
}

/**
 * Salva le giornate condivise con modifiche in attesa, una alla volta. Restituisce il primo esito di errore
 * (per la Notifica breve) o null se tutto è andato a buon fine.
 */
export function salvaGiornateInAttesa(): Promise<EsitoScrittura | null> {
  return accodaScrittura(async () => {
    let errore: EsitoScrittura | null = null;
    for (const attuale of Object.values(memoriaDiario().giornate)) {
      if (!attuale.inAttesa) continue;
      const { giornata: dopo, esito } = await salvaGiornata(attuale);
      const corrente = memoriaDiario().giornate[attuale.data];
      // Se nel frattempo il contenuto è cambiato ancora, si tengono le modifiche più recenti con lo stato del server.
      impostaGiornata(corrente && corrente !== attuale ? aggiornaGiornata({ ...corrente, salvato: dopo.salvato, updatedAt: dopo.updatedAt, errore: dopo.errore }, corrente.diario) : dopo);
      if (esito.tipo === 'ok' && dopo.updatedAt) {
        // La riga nota segue l'updated_at del server: alla prossima apertura la giornata in cache vale ancora.
        const { energy_level, satiety_level, hydration_level, sport_type, sport_duration } = dopo.salvato;
        aggiornaRigaNota(dopo.id, (r) => ({ ...r, updated_at: dopo.updatedAt, energy_level, satiety_level, hydration_level, sport_type, sport_duration }));
      }
      if (esito.tipo === 'errore' && !errore) errore = esito;
    }
    return errore;
  });
}

/** Vero se c'è almeno una giornata con modifiche in attesa. */
export function giornateInAttesa(): boolean {
  return Object.values(memoriaDiario().giornate).some((g) => g.inAttesa);
}

function togliLetturaInAttesa(id: string): void {
  aggiornaMemoria({ lettureInAttesa: memoriaDiario().lettureInAttesa.filter((x) => x !== id) });
  persistiMemoria();
}

/** Segna letto il commento di una riga: subito in memoria (pallino verde), poi sul server; se fallisce resta in attesa. */
export function segnaLetto(riga: RigaSettimana): void {
  const op = pianificaLetto(riga);
  if (op.tipo === 'nessuna') return;
  aggiornaRigaNota(riga.id, (r) => segnaLettoInCache([r], r.id)[0] ?? r);
  aggiornaMemoria({ lettureInAttesa: [...new Set([...memoriaDiario().lettureInAttesa, riga.id])] });
  persistiMemoria();
  void scriviCommentoLetto(op.modifica).then((ok) => {
    if (ok) togliLetturaInAttesa(riga.id);
  });
}

/** "Letto" in attesa di conferma: si riprova in silenzio (all'apertura di un pannello, al ritorno della rete). */
export function riprovaLetture(): void {
  for (const id of memoriaDiario().lettureInAttesa) {
    void scriviCommentoLetto({ id, campi: { comment_acknowledged: true } }).then((ok) => {
      if (ok) togliLetturaInAttesa(id);
    });
  }
}
