// Apertura e lettura di una revisione (censimento step 7, §1b, §3 e §7). Le uniche due scritture del cliente, e le
// sole colonne: apertura status = 'opened' + opened_at (solo da 'sent'); lettura status = 'read' + read_at (da
// 'opened' o 'sent'). La policy del database permetterebbe qualsiasi colonna: l'app non ne scrive altre.
// "Letta" senza pulsante: il cliente ha scorso fino al piè di pagina E ha passato nella pagina un tempo minimo
// proporzionato al testo (circa 25 caratteri al secondo, come la mediana storica apertura → "Ho capito!").
import { haTesto, statoRevisione, type RigaRevisione } from './letture.ts';

export const CARATTERI_AL_SECONDO = 25;
/** Tempo minimo in pagina anche per i testi brevissimi. */
export const TEMPO_MINIMO_LETTURA_MS = 5_000;

export function tempoMinimoLetturaMs(caratteri: number): number {
  return Math.max(TEMPO_MINIMO_LETTURA_MS, Math.round((Math.max(0, caratteri) / CARATTERI_AL_SECONDO) * 1000));
}

export type StatoLettura = {
  /** Istante di apertura della pagina di lettura (ms). */
  apertaAlle: number;
  caratteri: number;
  /** Il piè di pagina "Hai letto tutta la revisione." è entrato nello schermo almeno una volta. */
  fondoRaggiunto: boolean;
};

/**
 * Quanto manca prima di poter segnare "letta": null se il fondo non è ancora stato raggiunto; 0 se le due condizioni
 * sono già soddisfatte; altrimenti i millisecondi che mancano al tempo minimo.
 */
export function attesaPrimaDiLetta(stato: StatoLettura, adesso: number): number | null {
  if (!stato.fondoRaggiunto) return null;
  return Math.max(0, stato.apertaAlle + tempoMinimoLetturaMs(stato.caratteri) - adesso);
}

export type CampiApertura = { status: 'opened'; opened_at: string };
export type CampiLetta = { status: 'read'; read_at: string };
export type ModificaRevisione = { tipo: 'apertura'; id: string; campi: CampiApertura } | { tipo: 'letta'; id: string; campi: CampiLetta };

/** All'apertura della lettura: una sola modifica se la revisione è ancora 'sent', altrimenti nulla. */
export function pianificaApertura(riga: Pick<RigaRevisione, 'id' | 'status'>, adesso: Date): { tipo: 'nessuna' } | { tipo: 'scrivi'; modifica: ModificaRevisione } {
  if (riga.status !== 'sent') return { tipo: 'nessuna' };
  return { tipo: 'scrivi', modifica: { tipo: 'apertura', id: riga.id, campi: { status: 'opened', opened_at: adesso.toISOString() } } };
}

/** Quando scatta la regola del letto: una sola modifica se la revisione è 'opened' o 'sent', altrimenti nulla. */
export function pianificaLetta(riga: Pick<RigaRevisione, 'id' | 'status'>, adesso: Date): { tipo: 'nessuna' } | { tipo: 'scrivi'; modifica: ModificaRevisione } {
  if (riga.status !== 'opened' && riga.status !== 'sent') return { tipo: 'nessuna' };
  return { tipo: 'scrivi', modifica: { tipo: 'letta', id: riga.id, campi: { status: 'read', read_at: adesso.toISOString() } } };
}

/** Stati di partenza ammessi per ogni modifica (filtro della scrittura: 0 righe = già fatto altrove, nulla da riscrivere). */
export function statiDiPartenza(modifica: ModificaRevisione): readonly string[] {
  return modifica.tipo === 'apertura' ? ['sent'] : ['opened', 'sent'];
}

/** Applica una modifica alla cache: subito dopo averla decisa, e di nuovo sulle righe rilette finché il server non l'ha confermata. */
export function applicaModifica(righe: RigaRevisione[], modifica: ModificaRevisione): RigaRevisione[] {
  return righe.map((r) => {
    if (r.id !== modifica.id || !statiDiPartenza(modifica).includes(r.status)) return r;
    if (modifica.tipo === 'apertura') return { ...r, status: 'opened', opened_at: modifica.campi.opened_at };
    return { ...r, status: 'read', read_at: modifica.campi.read_at, opened_at: r.opened_at ?? modifica.campi.read_at };
  });
}

export function applicaModifiche(righe: RigaRevisione[], modifiche: ModificaRevisione[]): RigaRevisione[] {
  return modifiche.reduce(applicaModifica, righe);
}

/** La lettura è consentita solo per le revisioni inviate; se la riga non è più 'sent' si apre comunque (rotta diretta). */
export function leggibile(riga: Pick<RigaRevisione, 'status'> | undefined): boolean {
  return riga !== undefined && haTesto(riga.status);
}

/** Posizione nel ciclo (gli stati vanno in una sola direzione): -1 per uno stato sconosciuto. */
export function posizioneNelCiclo(status: string): number {
  const s = statoRevisione(status);
  return s === null ? -1 : ['on_going', 'unlocked', 'draft', 'sent', 'opened', 'read'].indexOf(s);
}

/**
 * Righe rilette dal server unite alla copia locale: se in locale una revisione è più avanti nel ciclo (aperta o
 * letta un istante fa, scrittura confermata ma lettura partita prima), restano stato e date locali. Le righe nuove
 * e tutto il resto vengono dal server.
 */
export function unisciConLocale(server: RigaRevisione[], locali: RigaRevisione[]): RigaRevisione[] {
  const perId = new Map(locali.map((r) => [r.id, r]));
  return server.map((r) => {
    const locale = perId.get(r.id);
    if (!locale || posizioneNelCiclo(locale.status) <= posizioneNelCiclo(r.status)) return r;
    return { ...r, status: locale.status, opened_at: locale.opened_at ?? r.opened_at, read_at: locale.read_at ?? r.read_at };
  });
}
