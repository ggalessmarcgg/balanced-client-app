// Prima di uscire: l'app prova a inviare tutto ciò che è ancora in attesa (bozza del diario, giornate modificate,
// "letto" dei commenti, aperture e letture delle revisioni) e dice se è rimasto qualcosa di non confermato.
import { haModificheInAttesa } from '@/core/diario/attesa';
import { riprovaLetture, salvaBozzaInAttesa, salvaGiornateInAttesa } from '@/servizi/giornate';
import { memoriaDiario } from '@/servizi/memoriaDiario';
import { memoriaRevisioni } from '@/servizi/memoriaRevisioni';
import { riprovaScritture } from '@/servizi/revisioni';

/** Vero se qualcosa non è ancora stato confermato dal server. */
export function modificheInAttesa(): boolean {
  const m = memoriaDiario();
  return haModificheInAttesa({ locale: m.locale, giornate: m.giornate, lettureInAttesa: m.lettureInAttesa, scrittureRevisioni: memoriaRevisioni().scrittureInAttesa.length });
}

/** Invia le modifiche in attesa, una categoria alla volta; vero se dopo non resta nulla in attesa. */
export async function inviaModificheInAttesa(): Promise<boolean> {
  if (!modificheInAttesa()) return true;
  await salvaBozzaInAttesa();
  await salvaGiornateInAttesa();
  await riprovaLetture();
  await riprovaScritture();
  return !modificheInAttesa();
}
