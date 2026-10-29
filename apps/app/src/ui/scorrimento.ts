import { Platform, type ScrollViewProps } from 'react-native';

/**
 * Proprietà comuni a tutte le liste e pagine che scorrono (verticali e orizzontali, anche nei pannelli): su Android
 * spegne la deformazione a fine scorrimento (stretch overscroll di Android 12+), che non esiste nel disegno; su iOS
 * non aggiunge nulla, il rimbalzo resta quello di sistema (decisione del 30/10/2026).
 */
export const PROPRIETA_SCORRIMENTO: Pick<ScrollViewProps, 'overScrollMode'> = Platform.select({
  android: { overScrollMode: 'never' as const },
  default: {},
});
