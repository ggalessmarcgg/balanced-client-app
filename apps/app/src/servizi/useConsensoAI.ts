// Consenso alle funzioni AI nelle schermate (step 6): stato dall'ultima riga in memoria (letta all'avvio o qui),
// "Accetto" → granted, interruttore spento → revoked. L'effetto che legge dipende solo dal cliente.
import { useCallback, useEffect } from 'react';

import { consensoValido } from '@/core/consenso/consenso';
import { leggiConsenso, registraConsensoAI, useMemoriaConsenso } from '@/servizi/consenso';

export type ConsensoAI = {
  /** true/false dall'ultima riga; null finché non è nota (senza rete resta null: non si blocca nulla). */
  valido: boolean | null;
  accetta: () => Promise<boolean>;
  revoca: () => Promise<boolean>;
};

export function useConsensoAI(clientId: string): ConsensoAI {
  const memoria = useMemoriaConsenso();
  useEffect(() => {
    void leggiConsenso(clientId);
  }, [clientId]);
  const accetta = useCallback(() => registraConsensoAI(clientId, 'granted'), [clientId]);
  const revoca = useCallback(() => registraConsensoAI(clientId, 'revoked'), [clientId]);
  const valido = memoria.clientId === clientId && memoria.letto ? consensoValido(memoria.ultima) : null;
  return { valido, accetta, revoca };
}
