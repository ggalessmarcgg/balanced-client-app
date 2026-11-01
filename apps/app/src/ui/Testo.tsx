import { PixelRatio, Platform, Text, type TextProps } from 'react-native';

import { colori, testi, type NomeStileTesto } from '@/ui/theme';
import { correzioneVerticale, correzioneVerticaleAndroid } from '@/ui/theme/testo-correzioni';

// Correzioni per piattaforma: su Android i glifi stanno già quasi centrati nel riquadro (vedi testo-correzioni.ts).
const CORREZIONI = Platform.OS === 'android' ? correzioneVerticaleAndroid : correzioneVerticale;

export type TestoProps = TextProps & {
  /** Stile di testo del design system (App/… in Figma), ad es. "body", "h1", "display". */
  stile: NomeStileTesto;
  /** Colore del testo; predefinito testo/primario. */
  colore?: string;
};

// Altezza naturale dei font del tema in em (ascendente + discendente: DM Sans 1,30, DM Serif Display ~1,3), con
// margine. Su iOS il testo viene ritagliato al riquadro di riga: con un'interlinea più bassa dell'altezza naturale
// (H1 e Accento serif 100 %, Display 105 %) accenti e discendenti finiscono fuori e spariscono (verificato il
// 19/10/2026 con /sviluppo/titoli: "Àgb" diventava "Agb"). Il riquadro si allarga con un padding verticale
// compensato da margini negativi uguali: il layout non cambia, i glifi restano visibili.
const ALTEZZA_NATURALE_EM = 1.35;

/**
 * Limite unico all'ingrandimento del testo di sistema (decisione del 1/11/2026, dopo il primo test interno): oltre
 * 1,3 i testi restano come a 1,3, su Android (scala fino a 2,0) e iOS (fino ad AX5). Vale per `Testo`, per i campi
 * (`PROPRIETA_CAMPO`) e per i rari `Text` annidati; a 1,0 e 1,3 non cambia nulla. Sopra 1,3 barra di navigazione, card delle
 * statistiche e titoli andavano a capo o venivano troncati.
 */
export const LIMITE_INGRANDIMENTO_TESTO = 1.3;

/**
 * Android (correzione del 31/10/2026): con l'interlinea sotto l'altezza naturale la discesa dell'ultima riga si riduce
 * (span dell'interlinea di React Native) e il testo viene disegnato ritagliato al riquadro delle righe, anche con il
 * padding: la "g" di "giornata!" nella Card diario finiva piatta. Con `overflow: 'visible'` React Native disegna il
 * layout del testo senza il ritaglio della TextView e le discendenti escono nel padding già previsto (verifica a pixel
 * in /sviluppo/titoli con strumenti/profilo-g.mjs). Su iOS non cambia nulla.
 */
const TRABOCCA_ANDROID = Platform.OS === 'android' ? ({ overflow: 'visible' } as const) : null;

/**
 * Spazio in più sopra e sotto, in punti già scalati: con il testo ingrandito dal sistema (Dimensione testo, scala dei
 * font) corpo e interlinea crescono ma il padding no, e i glifi tornavano a essere tagliati (step 6, 31/10/2026).
 */
function spazioExtra(stile: NomeStileTesto): number {
  const { fontSize, lineHeight } = testi[stile] as { fontSize: number; lineHeight?: number };
  if (lineHeight === undefined) return 0;
  return Math.max(0, Math.ceil((fontSize * ALTEZZA_NATURALE_EM - lineHeight) * Math.min(PixelRatio.getFontScale(), LIMITE_INGRANDIMENTO_TESTO)));
}

/**
 * Testo del design system: applica font, corpo, interlinea e spaziatura dello stile Figma, il colore dai
 * token e la correzione verticale misurata per lo stile (vedi theme/testo-correzioni.ts), così che la
 * posizione dei glifi coincida con Figma. Tutte le altre proprietà passano a Text (numberOfLines, ecc.).
 */
export function Testo({ stile, colore = colori.testo.primario, style, children, ...resto }: TestoProps) {
  const delta = CORREZIONI[stile] ?? 0;
  const extra = spazioExtra(stile);
  return (
    <Text
      {...resto}
      maxFontSizeMultiplier={LIMITE_INGRANDIMENTO_TESTO}
      style={[
        testi[stile],
        { color: colore },
        extra > 0 && { paddingTop: extra, paddingBottom: extra, marginTop: -extra, marginBottom: -extra },
        extra > 0 && TRABOCCA_ANDROID,
        delta !== 0 && { transform: [{ translateY: delta }] },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
