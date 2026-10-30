import { useState } from 'react';

import { PAGINA, riduci, type EventoCarosello } from '@/core/primoAccesso/carosello';
import { autoreRevisione } from '@/core/revisioni/autore';
import { SchermataPrimoAccesso } from '@/ui/primoAccesso/SchermataPrimoAccesso';

// Carosello del primo accesso con dati finti per i confronti con Figma (Primo accesso · 1–5, 586:4905 … 586:5154).
// Interattivo e senza scritture: "Avanti", "Salta" e "Accetto" vanno avanti; per vedere l'animazione delle tacchette
// al contrario, "Non ora" (pagina 4) torna alla 3 e "Più tardi" (pagina 5) alla 4. "Attiva le notifiche" non fa nulla.

const nulla = () => {};
/** Nutrizionista finta senza foto: nella Card revisione compaiono le iniziali, come nel resto dell'app. */
const NUTRIZIONISTA = autoreRevisione(null, { nome: 'Dott.ssa Margherita Chiadò', foto: null });

export function PrimoAccessoSviluppo({ pagina: iniziale }: { pagina: number }) {
  const [pagina, setPagina] = useState(iniziale);
  const applica = (evento: EventoCarosello) => setPagina(riduci(pagina, evento).pagina);
  return (
    <SchermataPrimoAccesso
      pagina={pagina}
      nutrizionista={NUTRIZIONISTA}
      onAvanti={() => applica('avanti')}
      onSalta={() => applica('salta')}
      onAccetto={() => applica('accetto')}
      onNonOra={() => setPagina(PAGINA.revisioni)}
      onInformativa={nulla}
      onAttiva={nulla}
      onPiuTardi={() => setPagina(PAGINA.ai)}
    />
  );
}
