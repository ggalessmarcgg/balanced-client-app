import Svg, { Path } from 'react-native-svg';

import { colori } from '@/ui/theme';

// Logo (Figma 625:254): simbolo Balanced 18,93 × 33,74, due foglie con marchio/foglia-chiara e
// marchio/foglia-scura. Tracciati esportati dal componente (coordinate nel riquadro originale).
const LARGHEZZA = 18.93;
const ALTEZZA = 33.74;
const FOGLIA_CHIARA =
  'M11.2912 6.26796C17.8413 7.92618 16.8121 17.1399 15.6389 21.3077C15.1055 18.8903 6.37243 14.6299 4.80756 12.8587C3.1081 10.9351 3.35958 8.30247 2.53554 3.17328C2.90548 3.42516 4.74108 4.60974 11.2912 6.26796Z';
const FOGLIA_SCURA =
  'M7.6252 27.4709C1.07676 25.8061 2.11525 16.5934 3.29267 12.4268C3.82364 14.8447 12.5524 19.114 14.1155 20.8868C15.813 22.812 15.5589 25.4444 16.3777 30.5744C16.0081 30.3222 14.1736 29.1357 7.6252 27.4709Z';

export type LogoProps = {
  /** Altezza in punti; la larghezza segue in proporzione (Figma: per misure diverse si ridimensiona l'istanza). */
  altezza?: number;
  /** Etichetta per lo screen reader; se assente il logo è decorativo. */
  etichetta?: string;
};

export function Logo({ altezza = ALTEZZA, etichetta }: LogoProps) {
  const larghezza = (altezza * LARGHEZZA) / ALTEZZA;
  return (
    <Svg
      width={larghezza}
      height={altezza}
      viewBox={`0 0 ${LARGHEZZA} ${ALTEZZA}`}
      fill="none"
      accessible={Boolean(etichetta)}
      accessibilityLabel={etichetta}
      accessibilityRole={etichetta ? 'image' : undefined}
      importantForAccessibility={etichetta ? 'yes' : 'no-hide-descendants'}
    >
      <Path d={FOGLIA_CHIARA} fill={colori.marchio.fogliaChiara} />
      <Path d={FOGLIA_SCURA} fill={colori.marchio.fogliaScura} />
    </Svg>
  );
}
