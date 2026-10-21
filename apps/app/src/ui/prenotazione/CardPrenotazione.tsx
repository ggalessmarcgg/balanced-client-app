import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { DURATA_VISITA_MINUTI, ETICHETTA_TIPO, fasciaOraria } from '@/core/appuntamenti/appuntamenti';
import { etichettaData } from '@/core/diario/data';
import { TESTI_CONFERMA } from '@/core/prenotazione/conferma';
import type { Nutrizionista, Slot } from '@/core/stato/stato';
import { Icona } from '@/ui/icone';
import { Testo } from '@/ui/Testo';
import { colori, opacita, raggio, spazio, type IconaPerMisura } from '@/ui/theme';

// Card delle schermate Stati · 1 e 3 (Figma 548:3830, 548:3843, 550:3670): crema con raggio card.
// "I tuoi dati" e "La tua Nutrizionista": padding 32 / 28, gap 16; "La tua consulenza": padding 24, gap 16.

export type CardTuoiDatiProps = { nome: string; email: string; telefono: string | null };

/** Card "I tuoi dati": Heading e tre righe Body (etichetta a sinistra, valore a destra, gap 12). */
export function CardTuoiDati({ nome, email, telefono }: CardTuoiDatiProps) {
  const righe: [string, string][] = [
    ['Nome:', nome],
    ['Email:', email],
    ['Telefono:', telefono ?? '—'],
  ];
  return (
    <View style={stili.cardLarga}>
      <Testo stile="heading" accessibilityRole="header">
        I tuoi dati
      </Testo>
      <View style={stili.righe}>
        {righe.map(([etichetta, valore]) => (
          <View key={etichetta} style={stili.riga} accessible accessibilityLabel={`${etichetta} ${valore}`}>
            <Testo stile="body">{etichetta}</Testo>
            <Testo stile="body" numberOfLines={1} style={stili.valore}>
              {valore}
            </Testo>
          </View>
        ))}
      </View>
    </View>
  );
}

const FOTO_PROFILO = 80;

/**
 * Card "La tua Nutrizionista" (548:3843): foto quadrata 80 con raggio foto, nome con titolo (Body), poi in basso
 * specializzazione e "N. Ordine …" (Body details, gap 4). Le righe vuote si nascondono.
 */
export function CardProfiloNutrizionista({ nutrizionista }: { nutrizionista: Nutrizionista }) {
  return (
    <View style={stili.cardLarga}>
      <Testo stile="heading" accessibilityRole="header">
        La tua Nutrizionista
      </Testo>
      <View style={stili.profilo}>
        <View style={stili.foto}>{nutrizionista.foto ? <Image source={{ uri: nutrizionista.foto }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" recyclingKey={nutrizionista.foto} accessible={false} /> : null}</View>
        <View style={stili.info}>
          <Testo stile="body" numberOfLines={2}>
            {nutrizionista.nome}
          </Testo>
          <View style={stili.credenziali}>
            {nutrizionista.specializzazione ? <Testo stile="bodyDetails">{nutrizionista.specializzazione}</Testo> : null}
            {nutrizionista.numeroAlbo ? <Testo stile="bodyDetails">{`N. Ordine ${nutrizionista.numeroAlbo}`}</Testo> : null}
          </View>
        </View>
      </View>
    </View>
  );
}

export type CardConsulenzaProps = {
  /** Orario da confermare (C) o scelto nell'app; null quando il lead non ha un orario (D senza slot). */
  slot: Pick<Slot, 'data' | 'ora'> | null;
  /** D: giorno e ora barrati al 40 % con la frase in testo/errore (Figma 552:4253). */
  passato?: boolean;
};

const RIGHE_DETTAGLIO: { icona: IconaPerMisura[20]; testo: string }[] = [
  { icona: 'Calendario', testo: ETICHETTA_TIPO.prima },
  { icona: 'Videochiamata', testo: `Videochiamata, ${DURATA_VISITA_MINUTI.prima} minuti` },
  { icona: 'Link', testo: 'Trovi il link in App' },
  { icona: 'Carta', testo: 'Gratuita e senza impegno' },
];

/** Card "La tua consulenza" (550:3670): "Quando" (H2 + Body large all'80 %, gap 2) e quattro righe dettaglio (icona 20 + Body, gap 8). */
export function CardConsulenza({ slot, passato = false }: CardConsulenzaProps) {
  return (
    <View style={stili.cardConsulenza}>
      {slot ? (
        <View style={[stili.quando, passato && stili.quandoPassato]}>
          <Testo stile="h2" style={passato && stili.barrato}>
            {etichettaData(slot.data)}
          </Testo>
          <Testo stile="bodyLarge" colore={colori.testo.corpoAttenuato} style={passato && stili.barrato}>
            {fasciaOraria(slot.ora, DURATA_VISITA_MINUTI.prima)}
          </Testo>
        </View>
      ) : null}
      {passato ? (
        <Testo stile="bodyDetails" colore={colori.testo.errore} accessibilityRole="alert">
          {slot ? TESTI_CONFERMA.orarioPassato : TESTI_CONFERMA.senzaOrario}
        </Testo>
      ) : null}
      {RIGHE_DETTAGLIO.map((riga) => (
        <View key={riga.testo} style={stili.dettaglio}>
          <Icona misura={20} nome={riga.icona} />
          <Testo stile="body" style={stili.cresce}>
            {riga.testo}
          </Testo>
        </View>
      ))}
    </View>
  );
}

const stili = StyleSheet.create({
  cardLarga: { alignSelf: 'stretch', paddingVertical: spazio[32], paddingHorizontal: spazio[28], gap: spazio[16], backgroundColor: colori.sfondo.card, borderRadius: raggio.card },
  cardConsulenza: { alignSelf: 'stretch', padding: spazio[24], gap: spazio[16], backgroundColor: colori.sfondo.card, borderRadius: raggio.card },
  righe: { alignSelf: 'stretch', gap: spazio[12] },
  riga: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spazio[12] },
  valore: { flexShrink: 1, textAlign: 'right' },
  profilo: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: spazio[16] },
  foto: { width: FOTO_PROFILO, height: FOTO_PROFILO, borderRadius: raggio.foto, backgroundColor: colori.sfondo.foto, overflow: 'hidden' },
  info: { flex: 1, alignSelf: 'stretch', justifyContent: 'space-between' },
  credenziali: { gap: spazio[4] },
  quando: { alignSelf: 'stretch', gap: spazio[2] },
  quandoPassato: { opacity: opacita.orarioPassato },
  barrato: { textDecorationLine: 'line-through' },
  dettaglio: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: spazio[8] },
  cresce: { flex: 1 },
});
