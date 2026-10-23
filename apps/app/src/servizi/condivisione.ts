// Condivisione del diario di oggi, comune alla Card diario di Oggi e al riepilogo di Racconta: una sola scrittura
// (servizi/diario.ts, condividiDiario) in coda con le altre, poi la memoria di sessione segue lo stato condiviso senza
// rileggere (oggi diventa un giorno condiviso della settimana) e si rilegge solo lo stato leggero delle revisioni.
import type { RigaSettimana } from '@/core/diario/letture';
import { condividiDiario, type EsitoScrittura } from '@/servizi/diario';
import { accodaScrittura, aggiornaMemoria, memoriaDiario, persistiMemoria } from '@/servizi/memoriaDiario';
import { aggiornaStatoRevisioni } from '@/servizi/revisioni';

/** Condivide il diario di oggi in memoria. null se non c'è un diario di oggi in memoria. */
export function condividiOggi(): Promise<EsitoScrittura | null> {
  const iniziale = memoriaDiario().locale;
  if (!iniziale) return Promise.resolve(null);
  return accodaScrittura(async () => {
    const { locale: dopo, esito } = await condividiDiario(memoriaDiario().locale ?? iniziale);
    aggiornaMemoria({ locale: dopo });
    persistiMemoria();
    if (dopo.riga.tipo === 'condiviso') {
      // Oggi diventa un giorno condiviso della settimana (apribile nel pannello); la giornata completa si rilegge al tocco.
      const m = memoriaDiario();
      const precedente = m.settimana.find((r) => r.submission_date === dopo.data);
      const rigaOggi: RigaSettimana = {
        id: dopo.riga.id,
        submission_date: dopo.data,
        status: 'submitted',
        updated_at: null,
        energy_level: dopo.diario.energy_level,
        satiety_level: dopo.diario.satiety_level,
        hydration_level: dopo.diario.hydration_level,
        sport_type: dopo.diario.sport_type,
        sport_duration: dopo.diario.sport_duration,
        nutritionist_comment: precedente?.nutritionist_comment ?? null,
        comment_author_id: precedente?.comment_author_id ?? null,
        comment_acknowledged: precedente?.comment_acknowledged ?? null,
        review_status: precedente?.review_status ?? null,
      };
      const { [dopo.data]: _vecchia, ...giornate } = m.giornate;
      aggiornaMemoria({
        settimana: [...m.settimana.filter((r) => r.submission_date !== dopo.data), rigaOggi].sort((a, b) => (a.submission_date < b.submission_date ? -1 : 1)),
        giornate,
        primoDiario: m.primoDiario ?? dopo.data,
      });
      persistiMemoria();
      // Il trigger del diario ha fatto avanzare (o sbloccato) la revisione: si rilegge solo lo stato leggero.
      aggiornaStatoRevisioni(dopo.clientId);
    }
    return esito;
  });
}
