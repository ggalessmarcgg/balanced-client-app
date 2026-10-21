// Etichette italiane delle competenze (nutritionist_profiles.competences contiene le chiavi del matching, es.
// "weight-loss"). Copia della mappa BADGE_LABEL del funnel (~/Desktop/onboarding-v2/src/ui/pages/NutritionistPage.tsx,
// blocco 5): il cliente vede le stesse etichette durante la prenotazione. Il test competenze.test.ts confronta le due
// copie e segnala quando divergono.

export const ETICHETTE_COMPETENZE: Record<string, string> = {
  'vegetarian-vegan': 'Alimentazione vegetariana e vegana',
  'glp1-medical-path': 'Percorso medico con GLP-1',
  'gut-health': 'Benessere intestinale',
  'insulin-resistance-metabolic': 'Insulino-resistenza e patologie metaboliche',
  'clinical-nutrition': 'Nutrizione clinica',
  'womens-health': 'Salute femminile',
  'pregnancy-breastfeeding': 'Gravidanza e allattamento',
  'overweight-obesity': 'Gestione sovrappeso e obesità',
  'weight-loss': 'Dimagrimento',
  'sports-nutrition': 'Nutrizione sportiva',
  'nutrition-education-counseling': 'Educazione alimentare e counseling nutrizionale',
};

/** Etichetta di una competenza; una chiave non in mappa (competenza nuova) si mostra ripulita ("new-key" → "New key"). */
export function etichettaCompetenza(chiave: string): string {
  const nota = ETICHETTE_COMPETENZE[chiave];
  if (nota) return nota;
  const testo = chiave.trim().replace(/[-_]+/g, ' ');
  return testo.charAt(0).toUpperCase() + testo.slice(1);
}
