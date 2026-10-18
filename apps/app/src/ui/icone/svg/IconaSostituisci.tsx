import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { gradienti, icone } from '@/ui/theme';

// Icona AI / 20 / Sostituisci (Figma 532:3425): Lucide sparkle con tratto sfumato App/Gradiente AI.
// Tracciato esportato da Figma (viewBox 20); la sfumatura segue le tappe del token gradienti.ai.
const voce = icone['20/Sostituisci'];
const TRACCIATO =
  'M10.5322 18.1429C10.6818 18.0187 10.7832 17.846 10.8189 17.6549C11.1063 15.9462 11.9191 14.3696 13.1443 13.1444C14.3695 11.9192 15.9461 11.1064 17.6548 10.819C17.8459 10.7833 18.0186 10.6819 18.1428 10.5323C18.2671 10.3827 18.3351 10.1943 18.3351 9.99988C18.3351 9.80541 18.2671 9.61706 18.1428 9.46746C18.0186 9.31786 17.8459 9.21642 17.6548 9.18071C15.9461 8.89335 14.3695 8.08053 13.1443 6.85535C11.9191 5.63016 11.1063 4.05355 10.8189 2.34488C10.7832 2.15372 10.6818 1.98106 10.5322 1.85681C10.3826 1.73256 10.1942 1.66455 9.99976 1.66455C9.80529 1.66455 9.61694 1.73256 9.46734 1.85681C9.31774 1.98106 9.2163 2.15372 9.18059 2.34488C8.89323 4.05355 8.08041 5.63016 6.85522 6.85535C5.63004 8.08053 4.05343 8.89335 2.34476 9.18071C2.15359 9.21642 1.98094 9.31786 1.85669 9.46746C1.73244 9.61706 1.66443 9.80541 1.66443 9.99988C1.66443 10.1943 1.73244 10.3827 1.85669 10.5323C1.98094 10.6819 2.15359 10.7833 2.34476 10.819C4.05343 11.1064 5.63004 11.9192 6.85522 13.1444C8.08041 14.3696 8.89323 15.9462 9.18059 17.6549C9.2163 17.846 9.31774 18.0187 9.46734 18.1429C9.61694 18.2672 9.80529 18.3352 9.99976 18.3352C10.1942 18.3352 10.3826 18.2672 10.5322 18.1429Z';

type Props = { misura: number; tratto?: number; etichetta?: string };

export function IconaSostituisci({ misura, tratto = voce.tratto, etichetta }: Props) {
  return (
    <Svg
      width={misura}
      height={misura}
      viewBox="0 0 20 20"
      fill="none"
      accessible={Boolean(etichetta)}
      accessibilityLabel={etichetta}
      accessibilityRole={etichetta ? 'image' : undefined}
      importantForAccessibility={etichetta ? 'yes' : 'no-hide-descendants'}
    >
      <Defs>
        <LinearGradient id="gradienteAI" x1="1.66443" y1="9.99988" x2="18.3351" y2="9.99988" gradientUnits="userSpaceOnUse">
          {gradienti.ai.tappe.map((t) => (
            <Stop key={t.posizione} offset={t.posizione} stopColor={t.colore} />
          ))}
        </LinearGradient>
      </Defs>
      <Path d={TRACCIATO} stroke="url(#gradienteAI)" strokeWidth={tratto} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
