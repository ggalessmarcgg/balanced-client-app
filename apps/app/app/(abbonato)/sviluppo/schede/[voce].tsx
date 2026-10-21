import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';

import { PREFISSO_SCHEDE_SVILUPPO, type VoceNavigazione } from '@/core/navigazione/voci';
import { SchermataPianoSegnaposto } from '@/ui/schermate/SchermateSegnaposto';
import { AccountSviluppo } from '@/ui/sviluppo/AccountSviluppo';
import { OggiSviluppo } from '@/ui/sviluppo/OggiSviluppo';
import { RevisioniSviluppo } from '@/ui/sviluppo/RevisioniSviluppo';

// Solo in sviluppo: le quattro schede con dati finti dentro il layout del gruppo (barra persistente), per verificare
// l'animazione della barra senza accesso. /sviluppo/schede/oggi?ciclo=1 passa da sola alla scheda successiva ogni 2 s.
const CICLO: VoceNavigazione[] = ['oggi', 'piano', 'revisioni', 'account'];
const PASSO_CICLO_MS = 2000;

export default function SchedeSviluppo() {
  const { voce, ciclo } = useLocalSearchParams<{ voce: string; ciclo?: string }>();
  const router = useRouter();
  useEffect(() => {
    if (!ciclo) return;
    const i = CICLO.indexOf(voce as VoceNavigazione);
    const prossima = CICLO[(i + 1) % CICLO.length] ?? 'oggi';
    const timer = setTimeout(() => router.replace(`${PREFISSO_SCHEDE_SVILUPPO}${prossima}?ciclo=${ciclo}` as never), PASSO_CICLO_MS);
    return () => clearTimeout(timer);
  }, [voce, ciclo, router]);
  if (!__DEV__) return <Redirect href="/" />;
  switch (voce) {
    case 'oggi':
      return <OggiSviluppo scenario="daIniziare" />;
    case 'piano':
      return <SchermataPianoSegnaposto />;
    case 'revisioni':
      return <RevisioniSviluppo scenario="inCorso" />;
    case 'account':
      return <AccountSviluppo scenario="account" />;
    default:
      return <Redirect href="/sviluppo/stati" />;
  }
}
