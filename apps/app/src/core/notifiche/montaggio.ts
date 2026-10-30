// Conteggio delle istanze montate del layout del gruppo dell'abbonato (step 6, difetto del 31/10/2026): al rimontaggio
// (per esempio dopo un `router.replace` sulla stessa scheda) il nuovo layout si monta prima che il vecchio si smonti,
// quindi un booleano resterebbe a falso e la destinazione di una notifica toccata non si aprirebbe più. Logica pura.

/** Nuovo conteggio dopo un montaggio (+1) o uno smontaggio (−1, mai sotto zero). */
export function contaMontaggio(istanze: number, montato: boolean): number {
  return Math.max(0, istanze + (montato ? 1 : -1));
}

/** Il gruppo è montato finché almeno un'istanza del layout lo è. */
export function gruppoMontato(istanze: number): boolean {
  return istanze > 0;
}
