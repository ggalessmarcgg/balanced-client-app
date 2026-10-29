import { Platform } from 'react-native';

import { spazio } from '@/ui/theme';

/**
 * Spazio sotto un piede fisso (pulsanti in fondo a un pannello dal basso o al suo foglio): l'area sicura inferiore,
 * mai meno di 20. Su iOS l'area sicura è l'indicatore home (34 pt): il piede le si appoggia sopra. Su Android l'area di
 * sistema in basso (24 con i gesti, 48 con i tre tasti; Figma «Schermo Android» 414:34) è più stretta e i pulsanti
 * finivano addosso all'indicatore dei gesti: si aggiungono 8, così la distanza dal bordo (32) è quella dell'iPhone
 * (correzione del 30/10/2026). Senza barra di sistema restano i 20 del disegno.
 */
export function paddingInferioreSicuro(insetInferiore: number): number {
  if (Platform.OS === 'android') return Math.max(insetInferiore + spazio[8], spazio[20]);
  return Math.max(insetInferiore, spazio[20]);
}
