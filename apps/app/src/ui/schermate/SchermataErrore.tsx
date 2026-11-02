import { SchermataErroreCaricamento } from '@/ui/schermate/SchermateTrasversali';

export const TESTI_ERRORE_IMPREVISTO = {
  descrizione: 'Qualcosa è andato storto. Riprova: se succede ancora, chiudi e riapri l’app.',
} as const;

/**
 * Schermata gentile al posto della chiusura improvvisa (step 4, decisione del 2/11/2026): la mostra l'ErrorBoundary
 * del layout radice per un errore di rendering e l'avvio per un errore imprevisto nella lettura dello stato.
 * Non esiste un disegno Figma dedicato: in attesa di un disegno è la Trasversali 3 (Errore di caricamento, 563:4978)
 * con il testo qui sopra, senza barra di navigazione e con il solo logo, come negli altri stati trasversali all'avvio.
 */
export function SchermataErrore({ onRiprova }: { onRiprova: () => void }) {
  return <SchermataErroreCaricamento descrizione={TESTI_ERRORE_IMPREVISTO.descrizione} onRiprova={onRiprova} />;
}
