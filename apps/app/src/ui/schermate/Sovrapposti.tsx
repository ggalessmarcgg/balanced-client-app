import { createContext, useContext, useEffect, useId, useMemo, useState, type ReactNode } from 'react';

// Nel gruppo dell'abbonato (app/(abbonato)/_layout.tsx) la barra di navigazione è una sola, persistente, sopra le
// schermate che cambiano. Gli elementi sovrapposti di una schermata (pannello della giornata, Notifica breve) devono
// però stare sopra la barra: la schermata li affida a questo portale, che il layout rende dopo la barra.

/** 'conBarra' / 'senzaBarra' dentro il gruppo dell'abbonato (la barra la decide il layout); null fuori dal gruppo. */
export const BarraPersistenteContesto = createContext<'conBarra' | 'senzaBarra' | null>(null);

type Registro = { registra: (id: string, nodo: ReactNode) => void; rimuovi: (id: string) => void };
const RegistroContesto = createContext<Registro | null>(null);
const NodiContesto = createContext<ReadonlyMap<string, ReactNode>>(new Map());

export function FornitoreSovrapposti({ children }: { children: ReactNode }) {
  const [nodi, setNodi] = useState<ReadonlyMap<string, ReactNode>>(new Map());
  const registro = useMemo<Registro>(
    () => ({
      registra: (id, nodo) =>
        setNodi((m) => {
          const n = new Map(m);
          n.set(id, nodo);
          return n;
        }),
      rimuovi: (id) =>
        setNodi((m) => {
          if (!m.has(id)) return m;
          const n = new Map(m);
          n.delete(id);
          return n;
        }),
    }),
    [],
  );
  return (
    <RegistroContesto.Provider value={registro}>
      <NodiContesto.Provider value={nodi}>{children}</NodiContesto.Provider>
    </RegistroContesto.Provider>
  );
}

/** Dove il layout rende gli elementi sovrapposti delle schermate (dopo la barra, così le stanno sopra). */
export function PortaleSovrapposti() {
  const nodi = useContext(NodiContesto);
  return <>{[...nodi.entries()].map(([id, nodo]) => (nodo ? <PerChiave key={id}>{nodo}</PerChiave> : null))}</>;
}

function PerChiave({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

/**
 * Affida gli elementi sovrapposti al portale del layout, se c'è. Vero se il portale li mostra (la schermata non deve
 * renderli da sé), falso fuori dal gruppo dell'abbonato.
 */
export function useSovrappostiNelPortale(nodo: ReactNode): boolean {
  const registro = useContext(RegistroContesto);
  const id = useId();
  useEffect(() => {
    if (!registro) return;
    registro.registra(id, nodo);
  }, [registro, id, nodo]);
  useEffect(() => {
    if (!registro) return;
    return () => registro.rimuovi(id);
  }, [registro, id]);
  return registro !== null;
}

/** Vero se il layout del gruppo mostra la barra di navigazione sotto questa schermata (spazio da lasciare in fondo). */
export function useBarraPersistente(): boolean {
  return useContext(BarraPersistenteContesto) === 'conBarra';
}
