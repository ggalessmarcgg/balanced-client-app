import { useRouter } from 'expo-router';
import { useCallback, useState, type ReactNode } from 'react';

import { esci } from '@/servizi/accesso';
import { inviaModificheInAttesa } from '@/servizi/attesa';
import { copiaContattoSupporto, TESTO_COPIATO, type ContattoCopiato } from '@/servizi/contatti';
import { Dialogo } from '@/ui/Dialogo';
import { NotificaInBasso } from '@/ui/schermate/NotificaInBasso';

export const TESTI_USCITA = {
  titolo: 'Hai modifiche non ancora salvate',
  testo: 'Se esci ora andranno perse.',
  esciComunque: 'Esci comunque',
  annulla: 'Annulla',
} as const;

/**
 * Azioni comuni alle schermate di stato e all'Account: Esci (prima prova a inviare le modifiche in attesa; se ne
 * restano chiede conferma con il Dialogo), copia dei contatti del supporto (con Notifica breve di conferma) e Account.
 * `sovrapposti` va passato alla schermata: contiene dialogo e notifica.
 */
export function useAzioniStato(): {
  onEsci: () => void;
  onAccount: () => void;
  onNutrizionista: () => void;
  onEmailSupporto: () => void;
  onTelefonoSupporto: () => void;
  sovrapposti: ReactNode;
} {
  const router = useRouter();
  const [copiato, setCopiato] = useState<ContattoCopiato | null>(null);
  const [chiediConferma, setChiediConferma] = useState(false);
  const [uscendo, setUscendo] = useState(false);

  const esegui = useCallback(async () => {
    setChiediConferma(false);
    await esci();
    router.replace('/accesso');
  }, [router]);

  const onEsci = useCallback(async () => {
    if (uscendo) return;
    setUscendo(true);
    try {
      // Con la rete tutto si invia e si esce subito; altrimenti si avvisa che le modifiche andrebbero perse.
      const tuttoInviato = await inviaModificheInAttesa();
      if (tuttoInviato) await esegui();
      else setChiediConferma(true);
    } finally {
      setUscendo(false);
    }
  }, [uscendo, esegui]);
  const annullaUscita = useCallback(() => setChiediConferma(false), []);
  const onAccount = useCallback(() => router.push('/account'), [router]);
  const onNutrizionista = useCallback(() => router.push('/nutrizionista'), [router]);
  const copia = useCallback(async (contatto: ContattoCopiato) => {
    setCopiato(null);
    if (await copiaContattoSupporto(contatto)) setCopiato(contatto);
  }, []);
  const onEmailSupporto = useCallback(() => void copia('email'), [copia]);
  const onTelefonoSupporto = useCallback(() => void copia('telefono'), [copia]);
  const nascondi = useCallback(() => setCopiato(null), []);

  const sovrapposti = (
    <>
      <Dialogo
        aperto={chiediConferma}
        titolo={TESTI_USCITA.titolo}
        testo={TESTI_USCITA.testo}
        annulla={{ etichetta: TESTI_USCITA.annulla, onPress: annullaUscita }}
        conferma={{ etichetta: TESTI_USCITA.esciComunque, onPress: () => void esegui() }}
      />
      {copiato ? <NotificaInBasso key={copiato} tipo="conferma" testo={TESTO_COPIATO[copiato]} onScomparsa={nascondi} /> : null}
    </>
  );
  return { onEsci, onAccount, onNutrizionista, onEmailSupporto, onTelefonoSupporto, sovrapposti };
}
