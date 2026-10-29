import { Platform, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

export type AloneProps = {
  /** Diametro del cerchio attorno al quale sta l'alone. */
  diametro: number;
  /** Sfocatura dell'ombra in Figma (es. 6,4 per il giorno di oggi, 3,2 per il pallino della revisione). */
  sfocatura: number;
  colore: string;
};

/**
 * Alone sfumato attorno a un cerchio: in Figma è un'ombra esterna dello stesso colore del cerchio, offset 0 e
 * sfocatura data. Su iOS la rende `shadowColor`/`shadowRadius`; su Android `elevation` produce solo un'ombra grigia
 * direzionale, quindi l'alone si disegna con una sfumatura radiale (react-native-svg) da mettere sotto il cerchio,
 * nella stessa posizione (correzione Android del 30/10/2026). Su iOS non rende nulla.
 *
 * Profilo misurato sul rendering Figma della Card settimana (449:253, sfocatura 6,4): l'alone si estende per circa
 * 1,6 × sfocatura oltre il bordo e l'opacità scende 0,40 → 0,30 → 0,21 → 0,14 → 0,07 → 0 a passi uguali.
 */
export function Alone({ diametro, sfocatura, colore }: AloneProps) {
  if (Platform.OS !== 'android') return null;
  const estensione = sfocatura * ESTENSIONE_PER_SFOCATURA;
  const raggioTotale = diametro / 2 + estensione;
  const lato = raggioTotale * 2;
  const bordo = diametro / 2 / raggioTotale;
  return (
    <Svg width={lato} height={lato} style={[stili.alone, { left: -estensione, top: -estensione }]} pointerEvents="none">
      <Defs>
        <RadialGradient id="alone" cx="50%" cy="50%" r="50%">
          {[
            <Stop key="centro" offset={0} stopColor={colore} stopOpacity={PROFILO[0]} />,
            ...PROFILO.map((opacita, i) => <Stop key={i} offset={bordo + ((1 - bordo) * i) / (PROFILO.length - 1)} stopColor={colore} stopOpacity={opacita} />),
          ]}
        </RadialGradient>
      </Defs>
      <Circle cx={raggioTotale} cy={raggioTotale} r={raggioTotale} fill="url(#alone)" />
    </Svg>
  );
}

/** Estensione dell'alone oltre il bordo del cerchio, in multipli della sfocatura (6,4 → circa 10). */
const ESTENSIONE_PER_SFOCATURA = 1.6;
/** Opacità dal bordo del cerchio verso l'esterno, a passi uguali fino all'estensione. */
const PROFILO = [0.4, 0.3, 0.21, 0.14, 0.07, 0] as const;

const stili = StyleSheet.create({
  alone: { position: 'absolute' },
});
