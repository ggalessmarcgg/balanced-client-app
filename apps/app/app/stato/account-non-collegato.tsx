import { Redirect } from 'expo-router';

import { statoCorrente } from '@/servizi/statoCliente';
import { useAzioniStato } from '@/servizi/useAzioniStato';
import { SchermataAccountNonCollegato } from '@/ui/schermate/SchermateStato';

export default function Rotta() {
  const stato = statoCorrente();
  const azioni = useAzioniStato();
  if (!stato || !(stato.codice === 'L')) return <Redirect href="/" />;
  return <SchermataAccountNonCollegato onEsci={azioni.onEsci} onEmailSupporto={azioni.onEmailSupporto} onTelefonoSupporto={azioni.onTelefonoSupporto} />;
}
