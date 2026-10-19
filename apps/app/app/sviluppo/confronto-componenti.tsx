import { useLocalSearchParams } from 'expo-router';

import { ConfrontoComponenti } from '@/ui/sviluppo/ConfrontoComponenti';
import { COMPONENTI, type NomeComponente } from '@/ui/sviluppo/VariantiComponenti';

// balanced://sviluppo/confronto-componenti?componente=Pulsante (nomi in COMPONENTI)
export default function SchermataConfrontoComponenti() {
  const { componente } = useLocalSearchParams<{ componente?: string }>();
  const nome = COMPONENTI.find((c) => c.toLowerCase() === componente?.toLowerCase()) ?? 'Pulsante';
  return <ConfrontoComponenti componente={nome as NomeComponente} />;
}
