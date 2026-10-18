import { useLocalSearchParams } from 'expo-router';

import { PaginaComponenti } from '@/ui/sviluppo/PaginaComponenti';

// balanced://sviluppo/componenti?sezione=Testi (Colori | Misure | Testi | Icone)
export default function SchermataComponenti() {
  const { sezione } = useLocalSearchParams<{ sezione?: string }>();
  return <PaginaComponenti sezioneIniziale={sezione} />;
}
