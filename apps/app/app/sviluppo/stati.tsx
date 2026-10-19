import { useLocalSearchParams } from 'expo-router';

import { ElencoStatiSviluppo, SchermataSviluppo, STATI_SVILUPPO, type ChiaveStatoSviluppo } from '@/ui/sviluppo/PaginaStati';

// /sviluppo/stati → elenco; /sviluppo/stati?stato=H → la sola schermata (per gli screenshot di confronto).
export default function SchermataStati() {
  const { stato } = useLocalSearchParams<{ stato?: string }>();
  const chiave = STATI_SVILUPPO.find(([c]) => c.toLowerCase() === stato?.toLowerCase())?.[0];
  if (!chiave) return <ElencoStatiSviluppo />;
  return <SchermataSviluppo chiave={chiave as ChiaveStatoSviluppo} />;
}
