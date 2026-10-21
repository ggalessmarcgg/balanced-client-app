import { Redirect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Linking } from 'react-native';

import { iniziali } from '@/core/diario/commento';
import type { Profilo } from '@/core/stato/stato';
import { statoCorrente } from '@/servizi/statoCliente';
import { useAzioniStato } from '@/servizi/useAzioniStato';
import { useAppuntamenti } from '@/servizi/useMenu';
import { SchermataAppuntamenti } from '@/ui/schermate/SchermataAppuntamenti';

/** Appuntamenti (step 11): prossima visita con "Entra" (apre il link della videochiamata) e visite passate. Dal menu dell'abbonato. */
export default function RottaAppuntamenti() {
  const router = useRouter();
  const stato = statoCorrente();
  const onIndietro = useCallback(() => (router.canGoBack() ? router.back() : router.replace('/')), [router]);
  if (!stato || !('profilo' in stato)) return <Redirect href="/" />;
  return <Appuntamenti profilo={stato.profilo} onIndietro={onIndietro} />;
}

function Appuntamenti({ profilo, onIndietro }: { profilo: Profilo; onIndietro: () => void }) {
  const { fase, dati, ricarica } = useAppuntamenti(profilo.clientId);
  // "Gestisci appuntamento": il numero WhatsApp del supporto si copia negli appunti, come negli stati.
  const { onTelefonoSupporto, sovrapposti } = useAzioniStato();
  const onEntra = useCallback((link: string) => {
    Linking.openURL(link).catch(() => {});
  }, []);
  const n = profilo.nutrizionista;
  const faseSchermata =
    fase.tipo === 'pronto' && dati ? { tipo: 'pronto' as const, prossimo: dati.prossimo, passati: dati.passati, adesso: new Date() } : fase.tipo === 'caricamento' || fase.tipo === 'pronto' ? { tipo: 'caricamento' as const } : { tipo: fase.tipo, onRiprova: ricarica };
  return (
    <SchermataAppuntamenti
      fase={faseSchermata}
      nutrizionista={n ? { nome: n.nome, foto: n.foto, iniziali: iniziali(n.nome) } : null}
      onIndietro={onIndietro}
      onEntra={onEntra}
      onGestisci={onTelefonoSupporto}
      sovrapposti={sovrapposti}
    />
  );
}
