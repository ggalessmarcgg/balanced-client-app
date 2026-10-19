import type { ReactNode } from 'react';
import { Image, Pressable, StyleSheet, View, type ImageSourcePropType, type StyleProp, type ViewStyle } from 'react-native';

import { Icona } from '@/ui/icone';
import { Interruttore } from '@/ui/Interruttore';
import { Testo } from '@/ui/Testo';
import { colori, opacita, raggio, spazio, tocco, type IconaPerMisura } from '@/ui/theme';

/** Tipi della Riga elenco (Figma 498:220, proprietà "Tipo"); le proprietà di testo seguono il disegno di ogni tipo. */
export type RigaElencoProps =
  | { tipo: 'freccia'; etichetta: string; onPress?: () => void }
  | { tipo: 'interruttore'; etichetta: string; acceso: boolean; onChange?: (acceso: boolean) => void }
  | { tipo: 'valore'; etichetta: string; valore: string }
  | { tipo: 'copia'; etichetta: string; onPress?: () => void }
  | { tipo: 'frecciaConIcona'; etichetta: string; icona: IconaPerMisura[24]; onPress?: () => void }
  | { tipo: 'dueRighe'; titolo: string; sottotitolo: string; onPress?: () => void }
  | { tipo: 'conAvatar'; etichetta: string; nome: string; avatar?: ImageSourcePropType; onPress?: () => void }
  | { tipo: 'notifica'; titolo: string; testo: string; ora: string };

/**
 * Riga di un elenco dentro una card crema. Separatori a cura del contenitore (componente Separatore).
 * Le righe con azione sono toccabili per intero (altezza ≥ 44); le icone freccia e copia sono a 20 e al 40 %.
 */
export function RigaElenco(props: RigaElencoProps) {
  switch (props.tipo) {
    case 'freccia':
      return (
        <Toccabile onPress={props.onPress} etichetta={props.etichetta} style={stili.rigaSemplice}>
          <Testo stile="body" style={stili.cresce}>
            {props.etichetta}
          </Testo>
          <IconaAttenuata nome="Avanti" />
        </Toccabile>
      );
    case 'interruttore':
      return (
        <View style={stili.rigaSemplice}>
          <Testo stile="body" style={stili.cresce}>
            {props.etichetta}
          </Testo>
          <Interruttore acceso={props.acceso} onChange={props.onChange} etichetta={props.etichetta} />
        </View>
      );
    case 'valore':
      return (
        <View style={stili.rigaSemplice} accessible accessibilityLabel={`${props.etichetta}: ${props.valore}`}>
          <Testo stile="body" style={stili.cresce}>
            {props.etichetta}
          </Testo>
          <Testo stile="body" colore={colori.testo.secondario}>
            {props.valore}
          </Testo>
        </View>
      );
    case 'copia':
      return (
        <Toccabile onPress={props.onPress} etichetta={props.etichetta} suggerimento="Copia il valore" style={stili.rigaSemplice}>
          <Testo stile="body" style={stili.cresce}>
            {props.etichetta}
          </Testo>
          <IconaAttenuata nome="Copia" />
        </Toccabile>
      );
    case 'frecciaConIcona':
      return (
        <Toccabile onPress={props.onPress} etichetta={props.etichetta} style={stili.rigaSemplice}>
          <Icona misura={24} nome={props.icona} />
          <Testo stile="body" style={stili.cresce}>
            {props.etichetta}
          </Testo>
          <IconaAttenuata nome="Avanti" />
        </Toccabile>
      );
    case 'dueRighe':
      return (
        <Toccabile onPress={props.onPress} etichetta={`${props.titolo}. ${props.sottotitolo}`} style={stili.rigaDueRighe}>
          <View style={stili.testi}>
            <Testo stile="etichettaPiccola">{props.titolo}</Testo>
            <Testo stile="bodyDetails" colore={colori.testo.secondario} numberOfLines={1}>
              {props.sottotitolo}
            </Testo>
          </View>
          <IconaAttenuata nome="Avanti" />
        </Toccabile>
      );
    case 'conAvatar':
      return (
        <Toccabile onPress={props.onPress} etichetta={`${props.etichetta}: ${props.nome}`} style={stili.rigaConAvatar}>
          {props.avatar ? <Image source={props.avatar} style={stili.avatar} accessible={false} /> : <View style={stili.avatar} />}
          <View style={stili.testi}>
            <Testo stile="bodyDetails" colore={colori.testo.secondario}>
              {props.etichetta}
            </Testo>
            <Testo stile="etichettaPiccola">{props.nome}</Testo>
          </View>
          <IconaAttenuata nome="Avanti" />
        </Toccabile>
      );
    case 'notifica':
      return (
        <View style={stili.rigaNotifica} accessible accessibilityLabel={`${props.titolo}. ${props.testo}. ${props.ora}`}>
          <Testo stile="etichettaPiccola">{props.titolo}</Testo>
          <Testo stile="bodyDetails" colore={colori.testo.corpoAttenuato} numberOfLines={1}>
            {props.testo}
          </Testo>
          <Testo stile="caption" colore={colori.testo.terziario} style={stili.ora}>
            {props.ora}
          </Testo>
        </View>
      );
  }
}

function Toccabile({
  onPress,
  etichetta,
  suggerimento,
  style,
  children,
}: {
  onPress?: () => void;
  etichetta: string;
  suggerimento?: string;
  style: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={etichetta}
      accessibilityHint={suggerimento}
      style={({ pressed }) => [style, pressed && stili.premuta]}
    >
      {children}
    </Pressable>
  );
}

// Icona "Avanti" / "Copia": componente 24 ridimensionato a 20, opacità di livello 40 % (Figma).
function IconaAttenuata({ nome }: { nome: 'Avanti' | 'Copia' }) {
  return (
    <View style={stili.iconaAttenuata}>
      <Icona misura={24} nome={nome} dimensione={20} />
    </View>
  );
}

const RIGA = { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: spazio[12] } as const;
const stili = StyleSheet.create({
  rigaSemplice: { ...RIGA, minHeight: 52, paddingVertical: spazio[14] },
  rigaDueRighe: { ...RIGA, paddingVertical: spazio[14] },
  rigaConAvatar: { ...RIGA, minHeight: tocco.minimoIos },
  rigaNotifica: { alignSelf: 'stretch', paddingVertical: spazio[14], gap: spazio[4] },
  cresce: { flex: 1 },
  testi: { flex: 1, gap: spazio[2] },
  iconaAttenuata: { opacity: opacita.iconaRigaAttenuata },
  avatar: { width: tocco.minimoIos, height: tocco.minimoIos, borderRadius: raggio.pieno, backgroundColor: colori.sfondo.foto },
  ora: { textAlign: 'right' },
  premuta: { opacity: opacita.pulsantePremuto },
});
