import { useState } from 'react';

import type { AutoreRevisione } from '@/core/revisioni/autore';
import type { RigaRevisione } from '@/core/revisioni/letture';
import { sezioneRevisioni } from '@/core/revisioni/stato';
import { testoRevisione } from '@/core/revisioni/testo';
import type { NuovaPerSchermata } from '@/servizi/useRevisioni';
import { SchermataLetturaRevisione } from '@/ui/schermate/SchermataLetturaRevisione';
import { SchermataRevisioni } from '@/ui/schermate/SchermataRevisioni';
import { SchermataCaricamento, SchermataErroreCaricamento, SchermataSenzaConnessione } from '@/ui/schermate/SchermateTrasversali';

// Sezione Revisioni con dati finti per i confronti con Figma (sezione "5 · Revisioni", 494:1944 … 494:2528) e per i
// casi limite. Interattiva (la card Nuova e l'elenco aprono la lettura), nessuna scrittura.

const AUTRICE: AutoreRevisione = { nome: 'Dott.ssa Margherita Chiadò', foto: null, iniziali: 'MC', fotoPronta: false };

const TESTO_13 = {
  generale:
    "Ottima settimana Giulia! Hai condiviso il diario con regolarità e si vede un bel miglioramento nella distribuzione dei pasti durante la giornata. Le colazioni sono diventate più complete e questo si riflette anche sull'energia del mattino.",
  correlazione:
    "Nelle giornate in cui hai fatto una colazione proteica hai riportato un'energia buona o alta e meno fame a metà mattina. Quando invece il pranzo è stato più leggero, lo spuntino del pomeriggio è diventato più abbondante.",
  spunti_consigli:
    "Prova ad aggiungere una porzione di cereali integrali alla cena due o tre volte a settimana. Continua con la camminata serale: è un ottimo modo per chiudere la giornata. Tieni una bottiglia d'acqua sulla scrivania per arrivare con più facilità ai due litri.",
};
/** Caso limite: elenchi puntati con i tre marcatori, a capo, "**" residuo e sezione Correlazione vuota (nascosta). */
const TESTO_ELENCHI = {
  generale: 'Settimana **impegnativa** ma hai mantenuto la costanza nel condividere il diario.\nTre cose che ho notato:\n- colazioni sempre presenti\n* cene più leggere\n• idratazione in crescita\nContinua così.',
  correlazione: '',
  spunti_consigli: 'Per la prossima settimana:\n\n- aggiungi una fonte proteica allo spuntino del pomeriggio\n- prova a cenare entro le 21\n\nSe hai dubbi scrivimi nel diario.',
};
const TESTI: Record<string, string> = {
  r12: 'Una settimana molto regolare: colazioni proteiche e cena leggera quasi ogni sera.',
  r11: "Bene l'idratazione in crescita, lavoriamo ancora sugli spuntini del pomeriggio.",
  r10: 'Settimana impegnativa ma hai mantenuto la costanza nel condividere il diario.',
  r9: 'Buon equilibrio tra i pasti; attenzione ai dolci dopo cena nel fine settimana.',
};

const riga = (n: number, status: string, extra: Partial<RigaRevisione> = {}): RigaRevisione => ({
  id: `r${n}`,
  review_number: n,
  status,
  submissions_count: status === 'on_going' ? 3 : 7,
  review_author_id: null,
  sent_at: null,
  opened_at: null,
  read_at: null,
  ...extra,
});
const PASSATE = [
  riga(12, 'read', { sent_at: '2026-10-02T09:00:00Z' }),
  riga(11, 'read', { sent_at: '2026-09-25T09:00:00Z' }),
  riga(10, 'opened', { sent_at: '2026-09-18T09:00:00Z' }),
];

export type ScenarioRevisioni =
  | 'inCorso'
  | 'nuova'
  | 'inPreparazione'
  | 'prima'
  | 'primaInizia'
  | 'piuNuove'
  | 'senzaPassate'
  | 'lettura'
  | 'letturaElenchi'
  | 'letturaConFoto'
  | 'letturaCaricamento'
  | 'letturaErrore'
  | 'caricamento'
  | 'senzaConnessione'
  | 'errore';

function righeDi(scenario: ScenarioRevisioni): RigaRevisione[] {
  switch (scenario) {
    case 'inCorso':
      return [riga(13, 'on_going', { submissions_count: 5 }), ...PASSATE];
    case 'nuova':
      return [riga(13, 'sent', { sent_at: '2026-10-09T09:00:00Z', review_author_id: 'autrice' }), ...PASSATE.slice(0, 2)];
    case 'inPreparazione':
      return [riga(13, 'unlocked'), ...PASSATE];
    case 'prima':
      return [riga(1, 'on_going', { submissions_count: 5 })];
    case 'primaInizia':
      return [];
    case 'piuNuove':
      return [
        riga(15, 'on_going', { submissions_count: 2 }),
        riga(14, 'draft'),
        riga(13, 'sent', { sent_at: '2026-10-09T09:00:00Z', review_author_id: 'autrice' }),
        riga(9, 'sent', { sent_at: '2026-09-11T09:00:00Z' }),
        ...PASSATE,
      ];
    case 'senzaPassate':
      return [riga(1, 'on_going', { submissions_count: 3 })];
    default:
      return [];
  }
}

const nulla = () => {};

export function RevisioniSviluppo({ scenario }: { scenario: ScenarioRevisioni }) {
  const [aperta, setAperta] = useState<string | null>(null);

  if (scenario === 'caricamento') return <SchermataCaricamento barraSuperiore="completa" barraNavigazione="revisioni" />;
  if (scenario === 'senzaConnessione') return <SchermataSenzaConnessione onRiprova={nulla} barraSuperiore="completa" barraNavigazione="revisioni" revisioneNuova />;
  if (scenario === 'errore') return <SchermataErroreCaricamento onRiprova={nulla} titolo="Revisioni" barraSuperiore="completa" barraNavigazione="revisioni" />;

  if (scenario === 'letturaCaricamento') return <SchermataLetturaRevisione numero={null} fase={{ tipo: 'caricamento' }} onIndietro={nulla} />;
  if (scenario === 'letturaErrore') return <SchermataLetturaRevisione numero={13} fase={{ tipo: 'rete', onRiprova: nulla }} onIndietro={nulla} />;
  if (scenario === 'lettura' || scenario === 'letturaElenchi' || scenario === 'letturaConFoto' || aperta) {
    const elenchi = scenario === 'letturaElenchi' || aperta === 'r10';
    const autore = scenario === 'letturaConFoto' ? { ...AUTRICE, foto: 'https://picsum.photos/seed/balanced/160' } : AUTRICE;
    return (
      <SchermataLetturaRevisione
        numero={aperta ? Number(aperta.slice(1)) : 13}
        fase={{ tipo: 'pronto', data: '2026-10-09', autore, testo: testoRevisione(elenchi ? TESTO_ELENCHI : TESTO_13) }}
        onIndietro={() => setAperta(null)}
        onFondoRaggiunto={nulla}
      />
    );
  }

  const righe = righeDi(scenario);
  const sezione = sezioneRevisioni(righe);
  const nuove: Record<string, NuovaPerSchermata> = {};
  for (const c of sezione.attive) {
    if (c.tipo === 'nuova') nuove[c.id] = { id: c.id, numero: c.numero, autore: c.autoreId ? AUTRICE : { ...AUTRICE, nome: 'Dott.ssa Alessandra Marchina', iniziali: 'AM' }, anteprima: testoRevisione(TESTO_13).anteprima };
  }
  const passate = sezione.passate.map((p) => ({ ...p, incipit: TESTI[p.id] ?? '' }));
  return <SchermataRevisioni attive={sezione.attive} nuove={nuove} passate={passate} nuovaPresente={sezione.nuovaPresente} onApri={setAperta} onNavigazione={nulla} />;
}
