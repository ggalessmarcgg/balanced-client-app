import { Redirect } from 'expo-router';

import { statoCorrente } from '@/servizi/statoCliente';
import { useAzioniStato } from '@/servizi/useAzioniStato';
import { SchermataPercorsoNonAttivo } from '@/ui/schermate/SchermateStato';

export default function Rotta() {
  const stato = statoCorrente();
  const azioni = useAzioniStato();
  if (!stato || !(stato.codice === 'H')) return <Redirect href="/" />;
  return <SchermataPercorsoNonAttivo profilo={stato.profilo} {...azioni} />;
}
