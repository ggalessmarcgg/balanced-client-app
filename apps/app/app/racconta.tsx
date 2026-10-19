import { useRouter } from 'expo-router';

import { SchermataRaccontaSegnaposto } from '@/ui/schermate/SchermateSegnaposto';

/** "Racconta" dalla Card diario: segnaposto fino allo step 10 (sezione Figma 3.1 · Diario vocale). */
export default function RottaRacconta() {
  const router = useRouter();
  return <SchermataRaccontaSegnaposto onIndietro={() => router.back()} />;
}
