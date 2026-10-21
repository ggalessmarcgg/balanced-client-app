import { Redirect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Linking } from 'react-native';

import { linkWhatsApp } from '@/core/nutrizionista/profilo';
import { statoCorrente } from '@/servizi/statoCliente';
import { useNutrizionista } from '@/servizi/useMenu';
import { SchermataNutrizionista } from '@/ui/schermate/SchermataNutrizionista';

/**
 * La tua nutrizionista (step 11): dal menu dell'abbonato e dalla card degli stati. Il contatto diretto si vede solo
 * con il percorso attivo (stato J); negli altri stati è oscurato come in Figma 514:2530.
 */
export default function RottaNutrizionista() {
  const router = useRouter();
  const stato = statoCorrente();
  const onIndietro = useCallback(() => (router.canGoBack() ? router.back() : router.replace('/')), [router]);
  if (!stato || !('profilo' in stato)) return <Redirect href="/" />;
  return <Nutrizionista clientId={stato.profilo.clientId} contatto={stato.codice === 'J' ? 'visibile' : 'oscurato'} onIndietro={onIndietro} />;
}

function Nutrizionista({ clientId, contatto, onIndietro }: { clientId: string; contatto: 'visibile' | 'oscurato'; onIndietro: () => void }) {
  const { fase, dati, ricarica } = useNutrizionista(clientId);
  const onScrivi = useCallback((cifre: string) => {
    Linking.openURL(linkWhatsApp({ formattato: '', cifre })).catch(() => {});
  }, []);
  const faseSchermata =
    fase.tipo === 'pronto' && dati ? { tipo: 'pronto' as const, profilo: dati.profilo, ferie: dati.ferie } : fase.tipo === 'caricamento' || fase.tipo === 'pronto' ? { tipo: 'caricamento' as const } : { tipo: fase.tipo, onRiprova: ricarica };
  return <SchermataNutrizionista fase={faseSchermata} contatto={contatto} onIndietro={onIndietro} onScrivi={onScrivi} />;
}
