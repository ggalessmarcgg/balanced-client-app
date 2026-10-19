import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** Vero se nel sistema è attivo "Riduci movimento": niente scorrimenti, solo dissolvenze brevi. */
export function useRiduciMovimento(): boolean {
  const [riduci, setRiduci] = useState(false);
  useEffect(() => {
    let attivo = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => attivo && setRiduci(v));
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setRiduci);
    return () => {
      attivo = false;
      sub.remove();
    };
  }, []);
  return riduci;
}

/**
 * Durate delle transizioni del diario (curva ease-out). Le tacchette riprendono il funnel (onboarding-v2,
 * segmented-indicator.css: 300 ms); il blocco nuovo compare quasi subito con una dissolvenza brevissima.
 */
export const TRANSIZIONI = {
  tacchetteMs: 300,
  comparsaMs: 120,
} as const;
