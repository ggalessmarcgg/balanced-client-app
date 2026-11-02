import { SchermataErroreCaricamento } from '@/ui/schermate/SchermateTrasversali';

export const TESTI_ERRORE_IMPREVISTO = {
  descrizione: 'Qualcosa è andato storto. Riprova: se succede ancora, scrivi a supporto@joinbalanced.it.',
} as const;

/**
 * Trasversali · 3.1 · Errore imprevisto (Figma 861:8817, disegno del 2/11/2026): al posto della chiusura improvvisa,
 * per un errore di rendering (ErrorBoundary del layout radice) o un errore imprevisto nella lettura di avvio. Stessa
 * struttura della Trasversali 3 (barra superiore con il solo logo, spazio 120, blocco "Errore di caricamento") con
 * l'icona Avviso al posto di Offline, il testo qui sopra e "Riprova". Mai campanella, menu o barra di navigazione.
 */
export function SchermataErrore({ onRiprova }: { onRiprova: () => void }) {
  return <SchermataErroreCaricamento icona="Avviso" descrizione={TESTI_ERRORE_IMPREVISTO.descrizione} onRiprova={onRiprova} />;
}
