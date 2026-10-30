import { useState } from 'react';

import { PAGINA, riduci, type EventoCarosello } from '@/core/primoAccesso/carosello';
import { SchermataPrimoAccesso } from '@/ui/primoAccesso/SchermataPrimoAccesso';

// Carosello del primo accesso con dati finti per i confronti con Figma (Primo accesso · 1–5, 586:4905 … 586:5154).
// Interattivo ("Avanti", "Salta", "Non ora" cambiano pagina), nessuna scrittura: "Accetto", "Attiva le notifiche" e
// "Più tardi" non fanno nulla.

const nulla = () => {};

export function PrimoAccessoSviluppo({ pagina: iniziale }: { pagina: number }) {
  const [pagina, setPagina] = useState(iniziale);
  const applica = (evento: EventoCarosello) => setPagina(riduci(pagina, evento).pagina);
  return (
    <SchermataPrimoAccesso
      pagina={pagina}
      onAvanti={() => applica('avanti')}
      onSalta={() => applica('salta')}
      onAccetto={nulla}
      onNonOra={() => applica('nonOra')}
      onInformativa={nulla}
      onAttiva={nulla}
      onPiuTardi={() => setPagina(PAGINA.benvenuto)}
    />
  );
}
