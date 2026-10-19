import { Redirect } from 'expo-router';

import { statoCorrente } from '@/servizi/statoCliente';
import { useAzioniStato } from '@/servizi/useAzioniStato';
import { SchermataAbbonato } from '@/ui/schermate/SchermateSegnaposto';

/** Stato J: segnaposto dell'app dell'abbonato (solo barra di navigazione, dallo step 5). */
export default function RottaAbbonato() {
  const stato = statoCorrente();
  const { onEsci } = useAzioniStato();
  if (stato?.codice !== 'J') return <Redirect href="/" />;
  return <SchermataAbbonato nome={stato.profilo.nome} onEsci={onEsci} />;
}
