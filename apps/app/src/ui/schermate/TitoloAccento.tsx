import { Text, type TextProps } from 'react-native';

import { Testo } from '@/ui/Testo';
import { testi } from '@/ui/theme';

export type TitoloAccentoProps = {
  /** Parte in DM Sans (es. "Ciao ", "Accedi al tuo "). */
  prima?: string;
  /** Parte in DM Serif Display corsivo (es. "Giulia,", "percorso"). */
  accento: string;
  dopo?: string;
  /** app: H1 32 + Accento serif (saluti in-app). accesso: H1 Accesso 36 + Accento serif 36 (schermate di accesso). */
  contesto?: 'app' | 'accesso';
} & Pick<TextProps, 'accessibilityRole'>;

/** Titolo con la parola in corsivo serif, come i saluti e i titoli delle schermate di accesso in Figma. */
export function TitoloAccento({ prima = '', accento, dopo = '', contesto = 'app', accessibilityRole = 'header' }: TitoloAccentoProps) {
  const accesso = contesto === 'accesso';
  return (
    <Testo stile={accesso ? 'h1Accesso' : 'h1'} accessibilityRole={accessibilityRole}>
      {prima}
      <Text style={accesso ? testi.accentoSerifAccesso : testi.accentoSerif}>{accento}</Text>
      {dopo}
    </Testo>
  );
}
