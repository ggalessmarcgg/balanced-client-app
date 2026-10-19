// Classificazione degli errori di Supabase Auth per le schermate di accesso. La web app li nasconde tutti
// dietro un messaggio generico: qui si legge error.code di GoTrue (censimento step 3, §2 e §6).

export type TipoErroreAccesso = 'credenzialiErrate' | 'emailNonConfermata' | 'limiteInvio' | 'rete' | 'sconosciuto';

/** Campi di AuthError / AuthApiError / AuthRetryableFetchError che servono alla classificazione. */
export type ErroreGrezzo = { code?: string | null; status?: number | null; message?: string | null; name?: string | null };

export function classificaErrore(errore: unknown): TipoErroreAccesso {
  const e = (typeof errore === 'object' && errore !== null ? errore : {}) as ErroreGrezzo;
  const code = e.code ?? '';
  if (code === 'invalid_credentials') return 'credenzialiErrate';
  if (code === 'email_not_confirmed') return 'emailNonConfermata';
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit' || e.status === 429) return 'limiteInvio';
  const messaggio = (e.message ?? '').toLowerCase();
  if (e.name === 'AuthRetryableFetchError' || e.status === 0 || messaggio.includes('network request failed') || messaggio.includes('failed to fetch')) {
    return 'rete';
  }
  return 'sconosciuto';
}

export const MESSAGGI_ERRORE: Record<TipoErroreAccesso, string> = {
  credenzialiErrate: 'Email o password non corrette.',
  emailNonConfermata: 'Devi ancora confermare la tua email. Controlla la posta, anche nella cartella spam, e tocca il link che ti abbiamo inviato.',
  limiteInvio: 'Hai chiesto troppi link in poco tempo. Aspetta qualche minuto e riprova.',
  rete: 'Sembra che tu sia offline. Controlla la connessione e riprova.',
  sconosciuto: 'Qualcosa non ha funzionato. Riprova tra poco.',
};

/** Testo del messaggio "link inviato" (Figma 562:4319). */
export function messaggioLinkInviato(email: string): string {
  return `Ti abbiamo inviato un nuovo link a ${email}. Toccalo per confermare l'email, poi torna qui ad accedere. Se non arriva, potrai rinviarlo tra poco.`;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizzaEmail(valore: string): string {
  return valore.trim().toLowerCase();
}

export function emailValida(valore: string): boolean {
  return EMAIL.test(normalizzaEmail(valore));
}
