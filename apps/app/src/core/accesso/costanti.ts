// Costanti dell'accesso condivise con web app e funnel: cambiare un valore qui senza cambiare gli altri
// repo rompe i link (censimento step 3, §1a e §6).

/** Dove atterra il link di conferma email (stesso di client-signup-v2 e del reinvio del funnel). */
export const URL_CONFERMA_EMAIL = 'https://client.joinbalanced.it/calendar';
/** Dove atterra il link di recupero password (pagina web; nell'app non esiste la schermata di nuova password). */
export const URL_RECUPERO_PASSWORD = 'https://client.joinbalanced.it/auth?mode=reset';
/** Attesa tra due reinvii del link di conferma (stessa della web app e del funnel). */
export const ATTESA_REINVIO_SECONDI = 60;
/** Password minima accettata da Supabase per questo progetto (il funnel ne chiede 8, ma esistono account a 6). */
export const PASSWORD_MINIMA = 6;

/** Contatti del supporto (gli stessi della web app: mailto e link wa.me). */
export const SUPPORTO = {
  email: 'supporto@joinbalanced.it',
  telefono: '+39 328 6415345',
  whatsapp: '393286415345',
} as const;

export function linkEmailSupporto(): string {
  return `mailto:${SUPPORTO.email}`;
}
export function linkWhatsAppSupporto(testo = 'Ciao!'): string {
  return `https://wa.me/${SUPPORTO.whatsapp}?text=${encodeURIComponent(testo)}`;
}
