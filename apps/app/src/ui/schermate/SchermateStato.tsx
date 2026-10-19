import type { Genere, Profilo } from '@/core/stato/stato';
import { SchermataStatoSupporto, type SchermataStatoSupportoProps } from '@/ui/schermate/SchermataStatoSupporto';
import { TitoloAccento } from '@/ui/schermate/TitoloAccento';
import { Testo } from '@/ui/Testo';

type Azioni = Pick<SchermataStatoSupportoProps, 'onAccount' | 'onEsci' | 'onEmailSupporto' | 'onTelefonoSupporto' | 'onNutrizionista' | 'sovrapposti'>;
export type SchermataStatoProps = Azioni & { profilo: Profilo };

/** Saluto declinato per genere (clients.gender: female | male | other | null). */
function bentornata(genere: Genere | null): string {
  if (genere === 'female') return 'Bentornata ';
  if (genere === 'male') return 'Bentornato ';
  return 'Ciao ';
}
function nonPresentata(genere: Genere | null): string {
  if (genere === 'female') return 'sembra che tu non ti sia presentata alla consulenza.';
  if (genere === 'male') return 'sembra che tu non ti sia presentato alla consulenza.';
  return 'sembra che tu non abbia partecipato alla consulenza.';
}

/** Stati · 6 · Percorso non ancora attivo (Figma 558:4206) — stato H. */
export function SchermataPercorsoNonAttivo({ profilo, ...azioni }: SchermataStatoProps) {
  return (
    <SchermataStatoSupporto
      titolo={<TitoloAccento prima="Ciao " accento={`${profilo.nome},`} />}
      testo="il tuo percorso non è ancora attivo. Ti abbiamo inviato via email le indicazioni per proseguire."
      nutrizionista={profilo.nutrizionista}
      {...azioni}
    />
  );
}

/** Stati · 12 · Consulenza non svolta (Figma 562:4195) — stato I. */
export function SchermataConsulenzaNonSvolta({ profilo, ...azioni }: SchermataStatoProps) {
  return (
    <SchermataStatoSupporto
      titolo={<TitoloAccento prima="Ciao " accento={`${profilo.nome},`} />}
      testo={`${nonPresentata(profilo.genere)} Puoi prenotarne una nuova contattando il nostro supporto.`}
      nutrizionista={profilo.nutrizionista}
      {...azioni}
    />
  );
}

/** Stati · 7 · Percorso concluso (Figma 558:4260) — stato K. */
export function SchermataPercorsoConcluso({ profilo, ...azioni }: SchermataStatoProps) {
  return (
    <SchermataStatoSupporto
      titolo={<TitoloAccento prima={bentornata(profilo.genere)} accento={`${profilo.nome},`} />}
      testo="il tuo percorso si è concluso. Quando vuoi, puoi riprenderlo contattando direttamente il nostro supporto."
      nutrizionista={profilo.nutrizionista}
      {...azioni}
    />
  );
}

/** Stati · 11 · Account non collegato (Figma 558:4316) — stato L: nessun profilo, solo "Esci". */
export function SchermataAccountNonCollegato(azioni: Omit<Azioni, 'onAccount' | 'onNutrizionista'>) {
  return (
    <SchermataStatoSupporto
      titolo={
        <Testo stile="h2" accessibilityRole="header">
          Non troviamo il tuo percorso
        </Testo>
      }
      testo="Il tuo account esiste, ma non è collegato a un percorso Balanced. Scrivici e lo sistemiamo subito."
      {...azioni}
    />
  );
}
