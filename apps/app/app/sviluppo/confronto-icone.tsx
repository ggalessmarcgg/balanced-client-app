import { useLocalSearchParams } from 'expo-router';

import { ConfrontoIcone } from '@/ui/sviluppo/ConfrontoIcone';

// balanced://sviluppo/confronto-icone?da=0&quante=35
export default function SchermataConfrontoIcone() {
  const { da, quante } = useLocalSearchParams<{ da?: string; quante?: string }>();
  return <ConfrontoIcone da={da ? Number(da) : undefined} quante={quante ? Number(quante) : undefined} />;
}
