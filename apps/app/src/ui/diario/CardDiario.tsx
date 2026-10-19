import { useState, type ReactNode } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { Pulsante } from '@/ui/Pulsante';
import { TitoloAccento } from '@/ui/schermate/TitoloAccento';
import { Testo } from '@/ui/Testo';
import { colori, gradienti, raggio, spazio } from '@/ui/theme';

export type CardDiarioProps = {
  children: ReactNode;
  /** Aperta (un passaggio del diario): gap 32 tra saluto, indicatore, blocco e comandi. Chiusa / condivisa: gap 24. */
  aperta?: boolean;
};

/**
 * Card del diario (Figma 449:979, proprietà "Passaggio"): l'unica card con la sfumatura App/Gradiente card diario
 * (sfondo/card → sfondo/campo al 30 %, dall'alto in basso), padding 32, raggio card. La sfumatura è disegnata con
 * react-native-svg dai token del gradiente (nessuna dipendenza nuova).
 */
export function CardDiario({ children, aperta = false }: CardDiarioProps) {
  // La sfumatura SVG ha bisogno delle misure in punti: si misura la card e si ridisegna al cambio di misura.
  const [misura, setMisura] = useState({ larghezza: 0, altezza: 0 });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setMisura((m) => (m.larghezza === width && m.altezza === height ? m : { larghezza: width, altezza: height }));
  };
  return (
    <View style={[stili.card, aperta ? stili.gapAperta : stili.gapChiusa]} onLayout={onLayout}>
      {misura.larghezza > 0 && <Sfumatura larghezza={misura.larghezza} altezza={misura.altezza} />}
      {children}
    </View>
  );
}

function Sfumatura({ larghezza, altezza }: { larghezza: number; altezza: number }) {
  const g = gradienti.cardDiario;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants">
      <Svg width={larghezza} height={altezza}>
        <Defs>
          <LinearGradient id="cardDiario" x1={g.inizio.x * larghezza} y1={g.inizio.y * altezza} x2={g.fine.x * larghezza} y2={g.fine.y * altezza} gradientUnits="userSpaceOnUse">
            {g.tappe.map((t) => (
              <Stop key={t.posizione} offset={t.posizione} stopColor={t.colore} />
            ))}
          </LinearGradient>
        </Defs>
        <Rect width={larghezza} height={altezza} rx={raggio.card} ry={raggio.card} fill="url(#cardDiario)" />
      </Svg>
    </View>
  );
}

export type SalutoDiarioProps = {
  prima: string;
  accento: string;
  dopo?: string;
  /** "Venerdì 9 ottobre" */
  dataEtichetta: string;
};

/** Saluto della card: titolo H1 con la parola in serif e la data in Body details al 60 %, gap 8. */
export function SalutoDiario({ prima, accento, dopo, dataEtichetta }: SalutoDiarioProps) {
  return (
    <View style={stili.saluto}>
      <TitoloAccento prima={prima} accento={accento} dopo={dopo} />
      <Testo stile="bodyDetails" colore={colori.testo.secondario}>
        {dataEtichetta}
      </Testo>
    </View>
  );
}

export type ComandiDiarioProps = {
  onChiudi: () => void;
  /** Assente nell'ultimo passaggio (Commento), dove c'è "Invia alla nutrizionista". */
  onAvanti?: () => void;
};

/** Riga dei comandi in fondo alla card: "Chiudi" (terziario compatto) a sinistra, "Avanti" (evidenziato) a destra. */
export function ComandiDiario({ onChiudi, onAvanti }: ComandiDiarioProps) {
  return (
    <View style={stili.comandi}>
      <Pulsante etichetta="Chiudi" livello="terziarioCompatto" onPress={onChiudi} accessibilityHint="Chiude il diario e salva la bozza" />
      {onAvanti && <Pulsante etichetta="Avanti" livello="terziarioCompattoEvidenziato" onPress={onAvanti} accessibilityHint="Passa al blocco successivo" />}
    </View>
  );
}

const stili = StyleSheet.create({
  card: { alignSelf: 'stretch', padding: spazio[32], borderRadius: raggio.card, overflow: 'hidden' },
  gapAperta: { gap: spazio[32] },
  gapChiusa: { gap: spazio[24] },
  saluto: { alignSelf: 'stretch', gap: spazio[8] },
  comandi: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
