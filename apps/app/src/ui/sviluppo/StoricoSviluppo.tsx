import { useCallback, useState } from 'react';

import { giorniMese, type Mese, type MeseCalendario, type RigaStorico } from '@/core/diario/storico';
import type { StatoPannello } from '@/servizi/usePannelloGiornata';
import { PannelloGiornata } from '@/ui/diario/PannelloGiornata';
import { SchermataStorico } from '@/ui/schermate/SchermataStorico';
import { pannelloDiProva } from '@/ui/sviluppo/OggiSviluppo';

// Storico con dati finti per i confronti con Figma (Giornate · 6, 475:1917): venerdì 9 ottobre 2026 come nei disegni.
// "mesi": ottobre (1–3, 5, 6, 8 condivisi; 4 e 7 no; 9 oggi) e settembre con 25 giornate condivise (6, 13, 19, 20,
// 27 non condivise). "nuovo": cliente senza diari, solo il mese corrente.

const OGGI = '2026-10-09';
const NON_CONDIVISI_SETTEMBRE = new Set([6, 13, 19, 20, 27]);
const CONDIVISI_OTTOBRE = [1, 2, 3, 5, 6, 8];

function righe(mese: Mese, giorni: number[]): RigaStorico[] {
  return giorni.map((g) => ({ submission_date: `${mese}-${String(g).padStart(2, '0')}`, status: 'submitted' }));
}

const RIGHE: Record<Mese, RigaStorico[]> = {
  '2026-10': righe('2026-10', CONDIVISI_OTTOBRE),
  '2026-09': righe(
    '2026-09',
    Array.from({ length: 30 }, (_, i) => i + 1).filter((g) => !NON_CONDIVISI_SETTEMBRE.has(g)),
  ),
};

export type ScenarioStorico = 'mesi' | 'nuovo' | 'caricamento';

export function StoricoSviluppo({ scenario }: { scenario: ScenarioStorico }) {
  const [pannello, setPannello] = useState<StatoPannello | null>(null);
  const mesi: Mese[] = scenario === 'nuovo' ? ['2026-10'] : ['2026-10', '2026-09'];
  const calendarioDi = useCallback(
    (mese: Mese): MeseCalendario | null => {
      if (scenario === 'caricamento') return mese === '2026-10' ? giorniMese(mese, RIGHE[mese] ?? [], OGGI) : null;
      return giorniMese(mese, scenario === 'nuovo' ? [] : (RIGHE[mese] ?? []), OGGI);
    },
    [scenario],
  );
  const nulla = useCallback(() => {}, []);
  const apriGiorno = useCallback((data: string) => setPannello(pannelloDiProva(data)), []);
  return (
    <SchermataStorico
      mesi={mesi}
      calendarioDi={calendarioDi}
      onMeseVisibile={nulla}
      onApriGiorno={apriGiorno}
      onIndietro={nulla}
      sovrapposti={
        <PannelloGiornata
          pannello={pannello}
          onChiudi={() => setPannello(null)}
          onRiprova={nulla}
          onModifica={() => setPannello((p) => (p ? { ...p, modifica: 'pasti' } : p))}
          onChiudiModifica={() => setPannello((p) => (p ? { ...p, modifica: null } : p))}
          onAvanti={nulla}
          onIndietro={nulla}
          onVaiA={(b) => setPannello((p) => (p ? { ...p, modifica: b } : p))}
          onAggiorna={nulla}
        />
      }
    />
  );
}
