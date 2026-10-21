// Voci della barra di navigazione dell'abbonato e rotte corrispondenti (gruppo app/(abbonato)): la barra è una sola,
// nel layout del gruppo, e ricava la voce attiva dal percorso; toccando una voce si sostituisce la schermata sotto.

export type VoceNavigazione = 'oggi' | 'piano' | 'revisioni' | 'account';

export const PERCORSO_PER_VOCE: Record<VoceNavigazione, string> = {
  oggi: '/abbonato',
  piano: '/piano',
  revisioni: '/revisioni',
  account: '/account',
};

/** Rotte di sviluppo con la barra persistente: /sviluppo/schede/<voce> (solo in __DEV__). */
export const PREFISSO_SCHEDE_SVILUPPO = '/sviluppo/schede/';

export function percorsoDiSviluppo(percorso: string): boolean {
  return percorso.startsWith(PREFISSO_SCHEDE_SVILUPPO);
}

function voceValida(v: string): v is VoceNavigazione {
  return v === 'oggi' || v === 'piano' || v === 'revisioni' || v === 'account';
}

/** Voce attiva per il percorso corrente; null se il percorso non è una scheda (es. /revisione/<id>, /storico). */
export function voceDaPercorso(percorso: string): VoceNavigazione | null {
  if (percorsoDiSviluppo(percorso)) {
    const v = percorso.slice(PREFISSO_SCHEDE_SVILUPPO.length).split(/[/?]/)[0] ?? '';
    return voceValida(v) ? v : null;
  }
  const senzaQuery = percorso.split('?')[0] ?? percorso;
  for (const [voce, p] of Object.entries(PERCORSO_PER_VOCE)) if (p === senzaQuery) return voce as VoceNavigazione;
  return null;
}

/** Percorso da aprire per una voce, restando nelle rotte di sviluppo se si è lì. */
export function percorsoDiVoce(voce: VoceNavigazione, percorsoAttuale: string): string {
  return percorsoDiSviluppo(percorsoAttuale) ? `${PREFISSO_SCHEDE_SVILUPPO}${voce}` : PERCORSO_PER_VOCE[voce];
}
