import { Redirect, useRouter } from 'expo-router';

import { useNuovaRevisione } from '@/servizi/memoriaRevisioni';
import { useNotificheNuove } from '@/servizi/notifiche';
import { statoCorrente } from '@/servizi/statoCliente';
import { SchermataPianoSegnaposto } from '@/ui/schermate/SchermateSegnaposto';

/** Scheda Piano: segnaposto fino allo step del piano alimentare (sezione Figma 4). Solo per l'abbonato. */
export default function RottaPiano() {
  const stato = statoCorrente();
  const router = useRouter();
  const notificheNuove = useNotificheNuove();
  const revisioneNuova = useNuovaRevisione();
  if (stato?.codice !== 'J') return <Redirect href="/" />;
  return <SchermataPianoSegnaposto onMenu={() => router.push('/menu')} onNotifiche={() => router.push('/notifiche')} notificheNuove={notificheNuove} revisioneNuova={revisioneNuova} />;
}
