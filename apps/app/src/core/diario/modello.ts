// Modello del diario giornaliero: i campi di daily_submissions che il cliente scrive, con gli stessi formati di
// oggi (censimento step 5, §1a e §2). Niente stati, enum o formati paralleli: CRM, trigger e cron li leggono così.

/** Valori di daily_submissions.sport_type scritti dalla web app (SportSlide.tsx); il CRM li mostra come testo grezzo. */
export const TIPI_SPORT = ['corsa', 'camminata', 'pesi', 'bici', 'nuoto', 'corpo-libero', 'danza', 'altro'] as const;
export type TipoSport = (typeof TIPI_SPORT)[number];

/** Nuovi valori di sport_duration (decisione step 5): contengono "min", così il CRM li mostra tali quali. */
export const DURATE_SPORT = ['15 min', '30 min', '45 min', '60 min', 'più di 60 min'] as const;
export type DurataSport = (typeof DURATE_SPORT)[number];

/** Etichette del passaggio Sport (Figma 449:921). */
export const ETICHETTE_SPORT: Record<TipoSport, string> = {
  corsa: 'Corsa',
  camminata: 'Camminata',
  pesi: 'Pesi',
  bici: 'Bici',
  nuoto: 'Nuoto',
  'corpo-libero': 'Corpo libero',
  danza: 'Danza',
  altro: 'Altro',
};
export const ETICHETTE_DURATA: Record<DurataSport, string> = {
  '15 min': '15 min',
  '30 min': '30 min',
  '45 min': '45 min',
  '60 min': '1 ora',
  'più di 60 min': 'Più di 1 ora',
};

/** energy_level 1..4 (CHECK nel database); etichette del passaggio Valori. */
export const LIVELLI_ENERGIA = [1, 2, 3, 4] as const;
export type LivelloEnergia = (typeof LIVELLI_ENERGIA)[number];
export const ETICHETTE_ENERGIA: Record<LivelloEnergia, string> = { 1: 'Bassa', 2: 'Discontinua', 3: 'Buona', 4: 'Alta' };

/** hydration_level 1..4 (nessun CHECK nel database, valori reali 1..4); il CRM mappa 1 "Meno di 1 L" … 4 "Più di 2.5 L". */
export const LIVELLI_IDRATAZIONE = [1, 2, 3, 4] as const;
export type LivelloIdratazione = (typeof LIVELLI_IDRATAZIONE)[number];
export const ETICHETTE_IDRATAZIONE: Record<LivelloIdratazione, string> = { 1: '< 1 L', 2: '1,5 L', 3: '2 L', 4: '> 2,5 L' };

/** satiety_level 1..10 (CHECK nel database). */
export const SAZIETA_MIN = 1;
export const SAZIETA_MAX = 10;

export const PASTI = ['breakfast', 'lunch', 'dinner', 'snacks'] as const;
export type Pasto = (typeof PASTI)[number];
export const ETICHETTE_PASTI: Record<Pasto, string> = { breakfast: 'Colazione', lunch: 'Pranzo', dinner: 'Cena', snacks: 'Spuntini' };

/** Contenuto del diario come lo tiene l'app: testi come stringhe (vuote = non compilato), valori numerici o null. */
export type Diario = {
  breakfast: string;
  lunch: string;
  dinner: string;
  snacks: string;
  day_comment: string;
  energy_level: LivelloEnergia | null;
  satiety_level: number | null;
  hydration_level: LivelloIdratazione | null;
  sport_type: TipoSport | null;
  sport_duration: DurataSport | null;
  /** "Oggi riposo" scelto esplicitamente (nel database è indistinguibile da "non risposto": entrambi null). */
  riposo: boolean;
};

export const DIARIO_VUOTO: Diario = {
  breakfast: '',
  lunch: '',
  dinner: '',
  snacks: '',
  day_comment: '',
  energy_level: null,
  satiety_level: null,
  hydration_level: null,
  sport_type: null,
  sport_duration: null,
  riposo: false,
};

/** Colonne di daily_submissions scritte dal cliente (le uniche: mai status qui, mai le colonne della nutrizionista). */
export type CampiDiarioDb = {
  breakfast: string | null;
  lunch: string | null;
  dinner: string | null;
  snacks: string | null;
  day_comment: string | null;
  energy_level: number | null;
  satiety_level: number | null;
  hydration_level: number | null;
  sport_type: string | null;
  sport_duration: string | null;
};

/** Stringa vuota (o solo spazi) → null, come la web app. */
export function normalizzaTesto(testo: string): string | null {
  const pulito = testo.trim();
  return pulito === '' ? null : pulito;
}

export function tipoSportValido(valore: string | null | undefined): valore is TipoSport {
  return (TIPI_SPORT as readonly string[]).includes(valore ?? '');
}
export function durataSportValida(valore: string | null | undefined): valore is DurataSport {
  return (DURATE_SPORT as readonly string[]).includes(valore ?? '');
}
function livello4(valore: number | null | undefined): LivelloEnergia | null {
  return valore === 1 || valore === 2 || valore === 3 || valore === 4 ? valore : null;
}
function sazieta(valore: number | null | undefined): number | null {
  return typeof valore === 'number' && Number.isInteger(valore) && valore >= SAZIETA_MIN && valore <= SAZIETA_MAX ? valore : null;
}

/**
 * Campi da scrivere nel database. Formati identici a oggi: testi (vuoto → null), energia 1–4, sazietà 1–10,
 * idratazione 1–4; sport_type e sport_duration SEMPRE insieme (se manca uno dei due si scrivono entrambi null,
 * perché il CRM nasconde la durata se il tipo è nullo); "Oggi riposo" = entrambi null.
 */
export function campiDaSalvare(diario: Diario): CampiDiarioDb {
  const sportCompleto = !diario.riposo && tipoSportValido(diario.sport_type) && durataSportValida(diario.sport_duration);
  return {
    breakfast: normalizzaTesto(diario.breakfast),
    lunch: normalizzaTesto(diario.lunch),
    dinner: normalizzaTesto(diario.dinner),
    snacks: normalizzaTesto(diario.snacks),
    day_comment: normalizzaTesto(diario.day_comment),
    energy_level: livello4(diario.energy_level),
    satiety_level: sazieta(diario.satiety_level),
    hydration_level: livello4(diario.hydration_level),
    sport_type: sportCompleto ? diario.sport_type : null,
    sport_duration: sportCompleto ? diario.sport_duration : null,
  };
}

/** Vero se il diario ha almeno un contenuto che finirebbe nel database (mai una bozza vuota: alle 23:50 verrebbe condivisa). */
export function haContenuto(diario: Diario): boolean {
  const c = campiDaSalvare(diario);
  return (
    c.breakfast !== null ||
    c.lunch !== null ||
    c.dinner !== null ||
    c.snacks !== null ||
    c.day_comment !== null ||
    c.energy_level !== null ||
    c.satiety_level !== null ||
    c.hydration_level !== null ||
    c.sport_type !== null
  );
}

/** Vero se i campi salvati sarebbero identici (per non riscrivere una bozza invariata). */
export function stessiCampi(a: CampiDiarioDb, b: CampiDiarioDb): boolean {
  return (Object.keys(a) as (keyof CampiDiarioDb)[]).every((k) => a[k] === b[k]);
}

/** Diario dall'insieme dei campi letti dal database (tollera i valori storici fuori formato, es. durate "<20m"). */
export function diarioDaCampi(campi: Partial<CampiDiarioDb>): Diario {
  const tipo = tipoSportValido(campi.sport_type) ? campi.sport_type : null;
  const durata = durataSportValida(campi.sport_duration) ? campi.sport_duration : null;
  return {
    breakfast: campi.breakfast ?? '',
    lunch: campi.lunch ?? '',
    dinner: campi.dinner ?? '',
    snacks: campi.snacks ?? '',
    day_comment: campi.day_comment ?? '',
    energy_level: livello4(campi.energy_level),
    satiety_level: sazieta(campi.satiety_level),
    hydration_level: livello4(campi.hydration_level),
    sport_type: tipo,
    sport_duration: tipo ? durata : null,
    riposo: false,
  };
}

/** Passaggi del diario a blocchi (Figma: Card diario, proprietà "Passaggio"). */
export const BLOCCHI = ['pasti', 'valori', 'sport', 'commento'] as const;
export type Blocco = (typeof BLOCCHI)[number];
export const TITOLI_BLOCCHI: Record<Blocco, string> = { pasti: 'Pasti', valori: 'Valori', sport: 'Sport', commento: 'Commento' };

export function bloccoSuccessivo(blocco: Blocco): Blocco | null {
  const i = BLOCCHI.indexOf(blocco);
  return BLOCCHI[i + 1] ?? null;
}
