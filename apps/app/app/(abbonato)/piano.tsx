import { Redirect } from 'expo-router';

import { statoCorrente } from '@/servizi/statoCliente';
import { SchermataPianoSegnaposto } from '@/ui/schermate/SchermateSegnaposto';

/** Scheda Piano: segnaposto fino allo step del piano alimentare (sezione Figma 4). Solo per l'abbonato. */
export default function RottaPiano() {
  const stato = statoCorrente();
  if (stato?.codice !== 'J') return <Redirect href="/" />;
  return <SchermataPianoSegnaposto />;
}
