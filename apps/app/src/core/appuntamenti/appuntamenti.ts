// Appuntamenti (censimento step 11, §2): prime visite in appointments (v2, per client_id) e visite di controllo in
// control_visits (is_initial = prima visita v1). Date e orari sono "da orologio" dello studio: si leggono sempre in
// Europe/Rome (orarioRoma.ts), mai con il fuso del dispositivo. Nessuna scrittura: stati e link li gestiscono CRM e
// trigger del calendario (meeting_url può arrivare qualche secondo dopo la creazione).
import { etichettaData, etichettaGiornoMese } from '../diario/data.ts';
import { dataOraRoma, istanteRoma } from '../stato/orarioRoma.ts';

export const SELEZIONE_APPUNTAMENTI = [
  'id',
  'appointments!appointments_client_id_fkey(id,appointment_date,start_time,end_time,status,meeting_url)',
  'control_visits!control_visits_client_id_fkey(id,scheduled_date,start_time,end_time,status,is_initial,meeting_url)',
].join(',');
/** Le visite di controllo si leggono dalla più recente, con un limite (massimo reale oggi: poche decine per cliente). */
export const LIMITE_VISITE = 24;
export const LIMITE_PASSATI = 12;

export type RigaPrimaVisita = { id: string; appointment_date: string; start_time: string; end_time: string; status: string; meeting_url: string | null };
export type RigaVisitaControllo = { id: string; scheduled_date: string; start_time: string; end_time: string; status: string; is_initial: boolean | null; meeting_url: string | null };
export type RigaAppuntamenti = { id: string; appointments: RigaPrimaVisita[] | null; control_visits: RigaVisitaControllo[] | null };

export type TipoVisita = 'prima' | 'controllo';
export type Visita = {
  id: string;
  tipo: TipoVisita;
  /** YYYY-MM-DD (ora italiana). */
  data: string;
  inizio: string;
  fine: string;
  durataMinuti: number;
  linkVideochiamata: string | null;
  istanteInizio: Date;
  istanteFine: Date;
};

export const ETICHETTA_TIPO: Record<TipoVisita, string> = { prima: 'Prima visita', controllo: 'Visita di controllo' };

/**
 * Durate mostrate al cliente (decisione del 22/10/2026, vale in tutta l'app): la durata della visita, non quella
 * del blocco in calendario (appointments dura 60 minuti nel database, control_visits anche di più). Prima visita
 * 40 minuti, visita di controllo 20. La fascia mostrata è inizio – inizio + durata (es. 18:30 – 19:10).
 */
export const DURATA_VISITA_MINUTI: Record<TipoVisita, number> = { prima: 40, controllo: 20 };

const ORA = /^(\d{2}):(\d{2})/;

/** `HH:MM` più i minuti dati, nel giorno (le visite non scavalcano la mezzanotte); formato non valido → invariato. */
export function oraPiuMinuti(ora: string, minuti: number): string {
  const m = ORA.exec(ora);
  if (!m) return ora;
  const totale = ((Number(m[1]) * 60 + Number(m[2]) + minuti) % 1440 + 1440) % 1440;
  const due = (n: number) => String(n).padStart(2, '0');
  return `${due(Math.floor(totale / 60))}:${due(totale % 60)}`;
}

/** "18:30 – 19:10": fascia dall'inizio alla fine della visita (inizio + durata). */
export function fasciaOraria(inizio: string, durataMinuti: number): string {
  return `${inizio.slice(0, 5)} – ${oraPiuMinuti(inizio, durataMinuti)}`;
}

function visitaDa(id: string, tipo: TipoVisita, data: string, inizio: string, fine: string, link: string | null): Visita | null {
  const istanteInizio = istanteRoma(data, inizio);
  // La fine reale del blocco (end_time) serve solo a decidere se la visita è ancora in corso; al cliente si mostra
  // la fine della visita (inizio + durata).
  const istanteFine = istanteRoma(data, fine) ?? istanteInizio;
  if (!istanteInizio || !istanteFine) return null;
  const durataMinuti = DURATA_VISITA_MINUTI[tipo];
  return {
    id,
    tipo,
    data,
    inizio: inizio.slice(0, 5),
    fine: oraPiuMinuti(inizio, durataMinuti),
    durataMinuti,
    linkVideochiamata: link?.trim() || null,
    istanteInizio,
    istanteFine,
  };
}

type VisitaConStato = Visita & { stato: string };

function tutte(riga: RigaAppuntamenti | null): VisitaConStato[] {
  if (!riga) return [];
  const prime = (riga.appointments ?? []).flatMap((a) => {
    const v = visitaDa(a.id, 'prima', a.appointment_date, a.start_time, a.end_time, a.meeting_url);
    return v ? [{ ...v, stato: a.status }] : [];
  });
  const controlli = (riga.control_visits ?? []).flatMap((c) => {
    const v = visitaDa(c.id, c.is_initial ? 'prima' : 'controllo', c.scheduled_date, c.start_time, c.end_time, c.meeting_url);
    return v ? [{ ...v, stato: c.status }] : [];
  });
  return [...prime, ...controlli];
}

export type Appuntamenti = { prossimo: Visita | null; passati: Visita[] };

/**
 * Prossimo = scheduled con la fine non ancora trascorsa, il più vicino; passati = completed e no_show, più le
 * scheduled già finite (mai chiuse nel CRM), dalla più recente, al massimo LIMITE_PASSATI. Le cancellate non si mostrano.
 */
export function appuntamenti(riga: RigaAppuntamenti | null, adesso: Date): Appuntamenti {
  const visite = tutte(riga);
  const ora = adesso.getTime();
  const future = visite.filter((v) => v.stato === 'scheduled' && v.istanteFine.getTime() >= ora).sort((a, b) => a.istanteInizio.getTime() - b.istanteInizio.getTime());
  const passate = visite
    .filter((v) => v.stato === 'completed' || v.stato === 'no_show' || (v.stato === 'scheduled' && v.istanteFine.getTime() < ora))
    .sort((a, b) => b.istanteInizio.getTime() - a.istanteInizio.getTime())
    .slice(0, LIMITE_PASSATI);
  const spoglia = ({ stato: _s, ...v }: VisitaConStato): Visita => v;
  return { prossimo: future[0] ? spoglia(future[0]) : null, passati: passate.map(spoglia) };
}

/** "Oggi" se la visita è oggi in ora italiana, altrimenti "Giovedì 15 ottobre". */
export function etichettaQuando(visita: Visita, adesso: Date): string {
  return visita.data === dataOraRoma(adesso).data ? 'Oggi' : etichettaData(visita.data);
}

/** "18:30 – 19:10" (fine = inizio + durata della visita). */
export function etichettaOrario(visita: Visita): string {
  return fasciaOraria(visita.inizio, visita.durataMinuti);
}

/** "Videochiamata, 40 minuti" (durata della visita per tipo, DURATA_VISITA_MINUTI). */
export function etichettaVideochiamata(visita: Visita): string {
  return `Videochiamata, ${visita.durataMinuti} ${visita.durataMinuti === 1 ? 'minuto' : 'minuti'}`;
}

/** Riga dell'elenco dei passati: "Visita di controllo · 24 set". */
export function etichettaPassato(visita: Visita): string {
  const [giorno, mese] = etichettaGiornoMese(visita.data).split(' ');
  return `${ETICHETTA_TIPO[visita.tipo]} · ${giorno} ${(mese ?? '').slice(0, 3)}`;
}
