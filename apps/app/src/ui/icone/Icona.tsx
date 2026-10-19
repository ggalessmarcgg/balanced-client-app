import * as Lucide from 'lucide-react-native';

import { IconaSostituisci } from './svg/IconaSostituisci';
import { IconaWhatsApp } from './svg/IconaWhatsApp';
import { colori, icone, trattoPerMisura, type ChiaveIcona, type IconaPerMisura, type MisuraIcona } from '@/ui/theme';

/**
 * Icona del design system: nome italiano del componente Figma → icona Lucide
 * (nome Lucide letto dalla descrizione del componente, in tokens.generated.ts).
 * Misura e spessore del tratto sono quelli di Figma; il colore viene dai token
 * (predefinito: la variabile legata al componente, di norma icona/primaria).
 * Le icone non Lucide (Sostituisci con gradiente AI, WhatsApp) sono SVG dedicati.
 */
export type IconaProps<M extends MisuraIcona = MisuraIcona> = {
  misura: M;
  nome: IconaPerMisura[M];
  /** Colore del tratto; se omesso usa quello del componente Figma. */
  colore?: string;
  /** Spessore del tratto in pixel; se omesso usa quello del componente Figma. */
  tratto?: number;
  /** Etichetta di accessibilità. Se assente l'icona è decorativa e viene ignorata dallo screen reader. */
  etichetta?: string;
  /**
   * Misura di resa quando il componente Figma è usato come istanza ridimensionata (es. "Icona / 24 / Avviso"
   * a 16 nei campi, a 20 nei messaggi). Il tratto segue la misura di resa (2 × misura / 24), come in Figma.
   */
  dimensione?: number;
};

export function Icona<M extends MisuraIcona>({ misura, nome, colore, tratto, etichetta, dimensione }: IconaProps<M>) {
  const chiave = `${misura}/${nome}` as ChiaveIcona;
  const voce = icone[chiave];
  const trattoEffettivo = tratto ?? (dimensione === undefined ? voce.tratto : trattoDellaMisura(dimensione));

  if (voce.resa === 'svg') {
    if (voce.ai) return <IconaSostituisci misura={dimensione ?? misura} tratto={trattoEffettivo} etichetta={etichetta} />;
    return <IconaWhatsApp misura={dimensione ?? misura} colore={colore} etichetta={etichetta} />;
  }

  const Componente = (Lucide as unknown as Record<string, Lucide.LucideIcon | undefined>)[voce.lucideComponente];
  if (!Componente) {
    if (__DEV__) throw new Error(`Icona Lucide non trovata: ${voce.lucideComponente} (${chiave})`);
    return null;
  }
  return (
    <Componente
      size={dimensione ?? misura}
      color={colore ?? voce.colore ?? colori.icona.primaria}
      strokeWidth={trattoEffettivo}
      absoluteStrokeWidth
      accessible={Boolean(etichetta)}
      accessibilityLabel={etichetta}
      accessibilityRole={etichetta ? 'image' : undefined}
      importantForAccessibility={etichetta ? 'yes' : 'no-hide-descendants'}
    />
  );
}

/** Tratto per una misura di resa: il valore dei token se la misura è nella scala, altrimenti 2 × misura / 24 (regola Figma "Icone"). */
function trattoDellaMisura(dimensione: number): number {
  const daToken = (trattoPerMisura as Record<string, number>)[String(dimensione)];
  return daToken ?? Math.round((dimensione / 12) * 100) / 100;
}
