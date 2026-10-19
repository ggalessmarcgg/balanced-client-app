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

/** Durate e curva delle transizioni del diario, riprese dal funnel (onboarding-v2: tacchette 300 ms, push 250 ms, dissolve 200 ms, ease-out). */
export const TRANSIZIONI = {
  tacchetteMs: 300,
  scorrimentoMs: 250,
  dissolvenzaMs: 200,
} as const;
