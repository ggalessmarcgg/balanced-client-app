import { Redirect } from 'expo-router';

import { statoCorrente } from '@/servizi/statoCliente';
import { useAzioniStato } from '@/servizi/useAzioniStato';
import { SchermataConsulenzaNonSvolta } from '@/ui/schermate/SchermateStato';

export default function Rotta() {
  const stato = statoCorrente();
  const azioni = useAzioniStato();
  if (!stato || !(stato.codice === 'I')) return <Redirect href="/" />;
  return <SchermataConsulenzaNonSvolta profilo={stato.profilo} {...azioni} />;
}
