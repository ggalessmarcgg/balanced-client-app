import { useEffect, useState } from 'react';

import { cambiaPromemoria, TESTI_ELIMINAZIONE, type Promemoria } from '@/core/account/account';
import { elencoNotifiche, type RigaNotifica } from '@/core/notifiche/notifiche';
import { PannelloEliminaAccount } from '@/ui/account/PannelloEliminaAccount';
import { NotificaInBasso } from '@/ui/schermate/NotificaInBasso';
import { SchermataAccount, type SchermataAccountProps } from '@/ui/schermate/SchermataAccount';
import { SchermataNotifiche } from '@/ui/schermate/SchermataNotifiche';
import { INGOMBRO_BARRA_NAVIGAZIONE } from '@/ui/schermate/SchermateTrasversali';

// Account e Notifiche con dati finti per i confronti con Figma (499:2145, 499:2568, 499:2709, 508:2699) e per i
// casi limite. Nessuna lettura, nessuna scrittura.

const nulla = () => {};
const ADESSO = new Date('2026-10-15T10:00:00.000Z'); // giovedì 15 ottobre 2026, 12:00 a Roma

const ACCOUNT: SchermataAccountProps = {
  nomeCompleto: 'Giulia Rossi',
  iniziali: 'GR',
  email: 'giulia.rossi@email.it',
  giornateCondivise: 142,
  revisioniRicevute: 18,
  nutrizionista: { nome: 'Dott.ssa Margherita Chiadò', foto: null },
  promemoria: { diario: true, weekend: true },
  abbonamento: { tipo: 'pronto', abbonamento: { piano: '6 mesi', stato: 'Attivo', rinnovo: '15 marzo 2027' } },
  versione: '1.0.0',
  onPromemoria: nulla,
  onEsci: nulla,
};

function riga(id: string, tipo: string, createdAt: string, extra: Partial<RigaNotifica> = {}): RigaNotifica {
  return { id, notification_type: tipo, reference_id: id, reference_table: 'daily_submissions', title: '', body: null, viewed_at: null, clicked_at: null, created_at: createdAt, ...extra };
}
const RIGHE: RigaNotifica[] = [
  riga('g1', 'nutritionist_comment', '2026-10-15T07:12:00.000Z'),
  riga('r13', 'review_sent', '2026-10-14T16:40:00.000Z', { reference_table: 'client_reviews' }),
  riga('r14', 'review_unlocked', '2026-10-14T19:15:00.000Z', { reference_table: 'client_reviews' }),
  riga('s1', 'food_suggestion_approved', '2026-10-12T09:02:00.000Z', { reference_table: 'meal_plan_food_suggestions', body: 'Il tuo suggerimento per lo spuntino è stato aggiunto al piano.' }),
  riga('g2', 'nutritionist_comment', '2026-10-12T06:47:00.000Z'),
  riga('f1', 'holiday_replacement', '2026-10-10T08:00:00.000Z', { reference_table: 'nutritionist_holidays' }),
  // Un promemoria: escluso dall'elenco (nella lettura vera non arriva neppure).
  riga('p1', 'diary_reminder', '2026-10-14T19:35:00.000Z', { reference_table: 'clients' }),
];
const CONTESTO = {
  nomeNutrizionista: 'Margherita',
  dataGiornata: (id: string) => (id === 'g1' ? '2026-10-15' : id === 'g2' ? '2026-10-11' : null),
  revisione: (id: string) => (id === 'r13' ? { numero: 13, diari: 7 } : id === 'r14' ? { numero: 14, diari: 7 } : null),
  ferie: { al: '2026-10-20', sostituta: 'Dott.ssa Veronica Gritti' },
};
const ELENCO = elencoNotifiche(RIGHE, CONTESTO, ADESSO);

export type ScenarioAccount = 'account' | 'accountInterruttori' | 'accountSenzaAbbonamento' | 'accountCaricamento' | 'accountPromemoriaSpenti' | 'accountSenzaBarra' | 'accountNuove' | 'eliminaAvviso' | 'eliminaConferma' | 'eliminaNotifica' | 'notifiche' | 'notificheVuote' | 'notificheCaricamento' | 'notificheErrore';

export function AccountSviluppo({ scenario }: { scenario: ScenarioAccount }) {
  switch (scenario) {
    case 'account':
      return <SchermataAccount {...ACCOUNT} />;
    case 'accountInterruttori':
      return <AccountInterruttori />;
    case 'accountSenzaAbbonamento':
      return <SchermataAccount {...ACCOUNT} abbonamento={{ tipo: 'pronto', abbonamento: null }} />;
    case 'accountCaricamento':
      return <SchermataAccount {...ACCOUNT} abbonamento={{ tipo: 'caricamento' }} revisioniRicevute={0} />;
    case 'accountPromemoriaSpenti':
      return <SchermataAccount {...ACCOUNT} promemoria={{ diario: false, weekend: false }} />;
    case 'accountSenzaBarra':
      return <SchermataAccount {...ACCOUNT} conBarra={false} nutrizionista={null} abbonamento={{ tipo: 'pronto', abbonamento: null }} />;
    case 'accountNuove':
      return <SchermataAccount {...ACCOUNT} notificheNuove revisioneNuova />;
    case 'eliminaAvviso':
      return <SchermataAccount {...ACCOUNT} sovrapposti={<PannelloEliminaAccount passo="avviso" onIndietro={nulla} onContinua={nulla} onElimina={nulla} />} />;
    case 'eliminaConferma':
      return <SchermataAccount {...ACCOUNT} sovrapposti={<PannelloEliminaAccount passo="conferma" onIndietro={nulla} onContinua={nulla} onElimina={nulla} passwordIniziale="••••••••••" />} />;
    case 'eliminaNotifica':
      return <SchermataAccount {...ACCOUNT} sovrapposti={<NotificaInBasso tipo="conferma" testo={TESTI_ELIMINAZIONE.nonDisponibile} sopra={INGOMBRO_BARRA_NAVIGAZIONE} />} />;
    case 'notifiche':
      return <SchermataNotifiche fase={{ tipo: 'pronto', elenco: ELENCO }} onIndietro={nulla} onApri={nulla} />;
    case 'notificheVuote':
      return <SchermataNotifiche fase={{ tipo: 'pronto', elenco: [] }} onIndietro={nulla} />;
    case 'notificheCaricamento':
      return <SchermataNotifiche fase={{ tipo: 'caricamento' }} onIndietro={nulla} />;
    case 'notificheErrore':
      return <SchermataNotifiche fase={{ tipo: 'rete', onRiprova: nulla }} onIndietro={nulla} />;
  }
}

const PASSO_INTERRUTTORI_MS = 2000;

/** I promemoria cambiano da soli ogni 2 s (weekend off → diario off, che spegne anche il weekend → diario on → weekend on): per vedere l'animazione degli interruttori. */
function AccountInterruttori() {
  const [promemoria, setPromemoria] = useState<Promemoria>({ diario: true, weekend: true });
  const [passo, setPasso] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => {
      const sequenza: [keyof Promemoria, boolean][] = [
        ['weekend', false],
        ['diario', false],
        ['diario', true],
        ['weekend', true],
      ];
      const [campo, valore] = sequenza[passo % sequenza.length]!;
      setPromemoria((p) => cambiaPromemoria(p, campo, valore).promemoria);
      setPasso((n) => n + 1);
    }, PASSO_INTERRUTTORI_MS);
    return () => clearTimeout(timer);
  }, [passo]);
  return <SchermataAccount {...ACCOUNT} promemoria={promemoria} onPromemoria={(campo, valore) => setPromemoria((p) => cambiaPromemoria(p, campo, valore).promemoria)} />;
}
