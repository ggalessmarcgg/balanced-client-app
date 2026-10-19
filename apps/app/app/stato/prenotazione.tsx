import { Redirect } from 'expo-router';

import { statoCorrente } from '@/servizi/statoCliente';
import { useAzioniStato } from '@/servizi/useAzioniStato';
import { SchermataSegnapostoPrenotazione } from '@/ui/schermate/SchermateSegnaposto';

export default function Rotta() {
  const stato = statoCorrente();
  const azioni = useAzioniStato();
  if (!stato || !(stato.codice === 'C' || stato.codice === 'D')) return <Redirect href="/" />;
  return <SchermataSegnapostoPrenotazione stato={stato} nome={stato.profilo.nome} onEsci={azioni.onEsci} />;
}
