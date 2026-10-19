import { Redirect } from 'expo-router';

import { statoCorrente } from '@/servizi/statoCliente';
import { useAzioniStato } from '@/servizi/useAzioniStato';
import { SchermataPercorsoConcluso } from '@/ui/schermate/SchermateStato';

export default function Rotta() {
  const stato = statoCorrente();
  const azioni = useAzioniStato();
  if (!stato || !(stato.codice === 'K')) return <Redirect href="/" />;
  return <SchermataPercorsoConcluso profilo={stato.profilo} {...azioni} />;
}
