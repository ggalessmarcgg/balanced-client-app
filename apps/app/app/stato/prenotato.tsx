import { Redirect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking, type AppStateStatus } from 'react-native';

import { DURATA_VISITA_MINUTI, oraPiuMinuti, type Visita } from '@/core/appuntamenti/appuntamenti';
import { iniziali } from '@/core/diario/commento';
import { istanteRoma } from '@/core/stato/orarioRoma';
import type { Appuntamento, StatoCliente } from '@/core/stato/stato';
import { leggiStato, statoCorrente } from '@/servizi/statoCliente';
import { useAzioniStato } from '@/servizi/useAzioniStato';
import { SchermataConsulenzaConfermata } from '@/ui/schermate/SchermataConsulenzaConfermata';
import { SchermataPrenotato } from '@/ui/schermate/SchermataPrenotato';

type StatoPrenotato = Extract<StatoCliente, { codice: 'F' | 'G' }>;

/** La prima visita dello stato come Visita della card (durata della visita, non del blocco; la fine reale decide se è in corso). */
function visitaDa(a: Appuntamento): Visita {
  const istanteFine = (a.fine ? istanteRoma(a.data, a.fine) : null) ?? a.istante;
  return { id: a.id, tipo: 'prima', data: a.data, inizio: a.ora, fine: oraPiuMinuti(a.ora, DURATA_VISITA_MINUTI.prima), durataMinuti: DURATA_VISITA_MINUTI.prima, linkVideochiamata: a.linkVideochiamata, istanteInizio: a.istante, istanteFine };
}

/**
 * Stati F (prenotato, prima della consulenza) e G (consulenza appena confermata nell'app), step 12. G compare solo
 * dopo una conferma fatta nell'app: "Torna alla home" rilegge lo stato (così il link della videochiamata, scritto
 * qualche secondo dopo dal calendario, è già presente) e mostra F. In F, se il link manca ancora, lo stato si rilegge
 * al ritorno in primo piano.
 */
export default function Rotta() {
  const [stato, setStato] = useState<StatoCliente | null>(() => statoCorrente());
  const router = useRouter();
  const tornaAllaHome = useCallback(() => router.replace('/'), [router]);

  const linkMancante = stato?.codice === 'F' && stato.appuntamento !== null && !stato.appuntamento.linkVideochiamata;
  useEffect(() => {
    if (!linkMancante) return;
    const sub = AppState.addEventListener('change', (s: AppStateStatus) => {
      if (s !== 'active') return;
      leggiStato({ forza: true }).then((esito) => {
        if (esito.tipo === 'ok') setStato(esito.stato);
      });
    });
    return () => sub.remove();
  }, [linkMancante]);

  if (!stato || !(stato.codice === 'F' || stato.codice === 'G')) return <Redirect href="/" />;
  if (stato.codice === 'G') return <SchermataConsulenzaConfermata onTornaAllaHome={tornaAllaHome} />;
  return <Prenotato stato={stato} />;
}

function Prenotato({ stato }: { stato: Extract<StatoPrenotato, { codice: 'F' }> }) {
  const router = useRouter();
  const { onNutrizionista, onTelefonoSupporto, sovrapposti } = useAzioniStato();
  const onMenu = useCallback(() => router.push('/menu'), [router]);
  const onEntra = useCallback((link: string) => {
    Linking.openURL(link).catch(() => {});
  }, []);
  const n = stato.profilo.nutrizionista;
  return (
    <SchermataPrenotato
      profilo={stato.profilo}
      visita={stato.appuntamento ? visitaDa(stato.appuntamento) : null}
      adesso={new Date()}
      nutrizionista={n ? { nome: n.nome, foto: n.foto, iniziali: iniziali(n.nome) } : null}
      onEntra={onEntra}
      onGestisci={onTelefonoSupporto}
      onNutrizionista={onNutrizionista}
      onMenu={onMenu}
      sovrapposti={sovrapposti}
    />
  );
}
