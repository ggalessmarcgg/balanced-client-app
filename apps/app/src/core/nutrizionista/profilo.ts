// "La tua nutrizionista" (censimento step 11, §1): profilo da nutritionist_profiles incorporato nella riga clients
// (mai profile_image_url: immagine base64 da mezzo megabyte; mai email), ferie in corso e sostituta da
// holiday_replacements con le ferie incorporate. "Oggi" per le ferie è la data italiana, come
// is_active_replacement_for_client nel database. Le competenze sono chiavi del matching: etichette in competenze.ts.
import { etichettaCompetenza } from './competenze.ts';
export const TABELLA_CLIENTI = 'clients';
export const TABELLA_SOSTITUZIONI = 'holiday_replacements';

/** Colonne del profilo (tutte leggibili da chi è autenticato; il telefono si mostra solo all'abbonato). */
export const SELEZIONE_PROFILO_NUTRIZIONISTA = [
  'nutritionist_id',
  'nutritionist_profiles!clients_nutritionist_id_fkey(id,title,full_name,expertise,registration_number,app_photo_url,app_square_photo_url,who_are_you,competences,certifications,working_hours,phone)',
].join(',');

export type RigaProfiloNutrizionista = {
  id: string;
  title: string | null;
  full_name: string | null;
  expertise: string | null;
  registration_number: string | null;
  app_photo_url: string | null;
  app_square_photo_url: string | null;
  who_are_you: string | null;
  competences: string[] | null;
  certifications: string[] | null;
  working_hours: unknown;
  phone: string | null;
};
export type RigaClienteConProfilo = { nutritionist_id: string | null; nutritionist_profiles: RigaProfiloNutrizionista | null };

/** Sostituzione in corso: una richiesta su holiday_replacements per client_id con le ferie (inner, filtrate su oggi) e la sostituta. */
export const SELEZIONE_SOSTITUZIONE = [
  'holiday_id',
  'nutritionist_holidays!holiday_replacements_holiday_id_fkey!inner(start_date,end_date)',
  'sostituta:nutritionist_profiles!holiday_replacements_replacement_nutritionist_id_fkey(id,title,full_name,app_square_photo_url,phone)',
].join(',');
export const FILTRO_FERIE = { inizio: 'nutritionist_holidays.start_date', fine: 'nutritionist_holidays.end_date' } as const;

export type RigaSostituzione = {
  holiday_id: string;
  nutritionist_holidays: { start_date: string; end_date: string } | null;
  sostituta: { id: string; title: string | null; full_name: string | null; app_square_photo_url: string | null; phone: string | null } | null;
};

// ---- Modello per la schermata --------------------------------------------------------------------------------

export type OrarioGiorno = { giorno: string; orario: string };

export type Sostituta = { nome: string; cognomeConTitolo: string; foto: string | null; iniziali: string; telefono: Telefono | null };
export type Ferie = { dal: string; al: string; etichetta: string; sostituta: Sostituta | null };

export type ProfiloNutrizionista = {
  nome: string;
  specializzazione: string | null;
  numeroAlbo: string | null;
  foto: string | null;
  fotoQuadrata: string | null;
  chiSono: string | null;
  competenze: string[];
  certificazioni: string[];
  orari: OrarioGiorno[];
  telefono: Telefono | null;
};

export type Telefono = { formattato: string; cifre: string };

const GIORNI: { chiave: string; nome: string }[] = [
  { chiave: 'Lun', nome: 'Lunedì' },
  { chiave: 'Mar', nome: 'Martedì' },
  { chiave: 'Mer', nome: 'Mercoledì' },
  { chiave: 'Gio', nome: 'Giovedì' },
  { chiave: 'Ven', nome: 'Venerdì' },
  { chiave: 'Sab', nome: 'Sabato' },
  { chiave: 'Dom', nome: 'Domenica' },
];

export function nomeConTitolo(title: string | null | undefined, fullName: string | null | undefined): string {
  return [title, fullName]
    .map((p) => (p ?? '').trim())
    .filter(Boolean)
    .join(' ');
}

/** "Dott.ssa Gritti": titolo e cognome (ultima parola del nome completo). */
export function cognomeConTitolo(title: string | null | undefined, fullName: string | null | undefined): string {
  const parti = (fullName ?? '').trim().split(/\s+/).filter(Boolean);
  return nomeConTitolo(title, parti[parti.length - 1] ?? '');
}

function iniziali(nome: string): string {
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join('');
}

/** Numero italiano di cellulare: solo cifre con prefisso 39 e 9–10 cifre dopo (come normalizeItalianMobile della web app); altrimenti null. */
export function telefonoDa(valore: string | null | undefined): Telefono | null {
  const cifre = (valore ?? '').replace(/\D/g, '');
  const m = /^(?:00)?39(3\d{8,9})$/.exec(cifre) ?? /^(3\d{8,9})$/.exec(cifre);
  if (!m || !m[1]) return null;
  const mobile = m[1];
  const formattato = `+39 ${mobile.slice(0, 3)} ${mobile.slice(3, 6)} ${mobile.slice(6)}`;
  return { formattato, cifre: `39${mobile}` };
}

/** Numero oscurato per chi non è abbonato (Figma 514:2530): "+39 33• ••• ••••". */
export function telefonoOscurato(telefono: Telefono | null): string {
  const prime = telefono ? telefono.cifre.slice(2, 4) : '33';
  return `+39 ${prime}• ••• ••••`;
}

export function linkWhatsApp(telefono: Telefono, testo = 'Salve Dott.ssa'): string {
  return `https://wa.me/${telefono.cifre}?text=${encodeURIComponent(testo)}`;
}

/** "9:00 – 18:00" da "09:00 - 18:00" (valore libero: se non è nella forma attesa resta com'è, ripulito). */
export function orarioLeggibile(valore: string): string {
  const m = /^\s*(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})\s*$/.exec(valore);
  if (!m) return valore.trim();
  return `${Number(m[1])}:${m[2]} – ${Number(m[3])}:${m[4]}`;
}

/** Orari di lavoro da working_hours (oggetto {Lun..Dom: "HH:MM - HH:MM"}), nell'ordine della settimana, solo i giorni presenti. */
export function orariDiLavoro(workingHours: unknown): OrarioGiorno[] {
  if (typeof workingHours !== 'object' || workingHours === null || Array.isArray(workingHours)) return [];
  const oggetto = workingHours as Record<string, unknown>;
  const orari: OrarioGiorno[] = [];
  for (const { chiave, nome } of GIORNI) {
    const v = oggetto[chiave];
    if (typeof v === 'string' && v.trim()) orari.push({ giorno: nome, orario: orarioLeggibile(v) });
  }
  return orari;
}

function elenco(valori: unknown): string[] {
  return Array.isArray(valori) ? valori.filter((v): v is string => typeof v === 'string' && v.trim() !== '').map((v) => v.trim()) : [];
}

export function profiloNutrizionista(riga: RigaProfiloNutrizionista): ProfiloNutrizionista {
  return {
    nome: nomeConTitolo(riga.title, riga.full_name),
    specializzazione: riga.expertise?.trim() || null,
    numeroAlbo: riga.registration_number?.trim() || null,
    foto: riga.app_photo_url || null,
    fotoQuadrata: riga.app_square_photo_url || null,
    chiSono: riga.who_are_you?.trim() || null,
    competenze: elenco(riga.competences).map(etichettaCompetenza),
    certificazioni: elenco(riga.certifications),
    orari: orariDiLavoro(riga.working_hours),
    telefono: telefonoDa(riga.phone),
  };
}

/** "12.10" per le ferie (Figma 596:5846). */
export function giornoMesePuntato(data: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data);
  return m ? `${m[3]}.${m[2]}` : data;
}

/** Ferie in corso (la prima riga valida), con la frase per la schermata e la sostituta se assegnata. */
export function ferieInCorso(righe: RigaSostituzione[], nomeTitolare: string): Ferie | null {
  const riga = righe.find((r) => r.nutritionist_holidays);
  if (!riga || !riga.nutritionist_holidays) return null;
  const { start_date, end_date } = riga.nutritionist_holidays;
  const s = riga.sostituta;
  const sostituta: Sostituta | null =
    s && nomeConTitolo(s.title, s.full_name)
      ? { nome: nomeConTitolo(s.title, s.full_name), cognomeConTitolo: cognomeConTitolo(s.title, s.full_name), foto: s.app_square_photo_url, iniziali: iniziali((s.full_name ?? '').trim()), telefono: telefonoDa(s.phone) }
      : null;
  return { dal: start_date, al: end_date, etichetta: `${nomeTitolare || 'La tua nutrizionista'} è assente dal ${giornoMesePuntato(start_date)} al ${giornoMesePuntato(end_date)}.`, sostituta };
}

/** "La Dott.ssa Ludovica Damiani" per la frase delle ferie: articolo in base al titolo. */
export function conArticolo(nome: string): string {
  if (/^dott\.?\s/i.test(nome) || /^dr\.?\s/i.test(nome)) return `Il ${nome}`;
  return `La ${nome}`;
}
