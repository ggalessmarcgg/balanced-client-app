import { StyleSheet, Text, View } from 'react-native';

import { colori, spazio, testi, type NomeStileTesto } from '@/ui/theme';

// Tavola per il confronto a pixel con lo specimen Figma 416:12: stesse frasi, testo largo 500 come in
// Figma (textAutoResize HEIGHT), ogni riga su fondo crema con 8 di distacco per essere ritagliata
// automaticamente dallo strumento di confronto (strumenti/ritaglia-celle.mjs).
export const RIGHE_SPECIMEN: readonly { stile: NomeStileTesto; testo: string; figma: string }[] = [
  { stile: 'display', testo: 'Ciao Alessandro', figma: '416:14' },
  { stile: 'h1', testo: 'Il tuo diario di oggi', figma: '416:17' },
  { stile: 'h2', testo: 'Pranzo', figma: '416:20' },
  { stile: 'heading', testo: 'Commento della nutrizionista', figma: '416:23' },
  { stile: 'bodyLarge', testo: 'Racconta cosa hai mangiato oggi.', figma: '416:26' },
  { stile: 'body', testo: "Pasta al pomodoro con un filo d'olio e insalata mista.", figma: '416:29' },
  { stile: 'bodyDetails', testo: 'Inviato alle 13:42 · Margherita ha commentato', figma: '416:32' },
  { stile: 'caption', testo: 'Ultimo aggiornamento 2 minuti fa', figma: '416:35' },
  { stile: 'accentoSerif', testo: 'Alessandro', figma: '416:38' },
  { stile: 'citazione', testo: '"Finalmente un percorso che non mi fa sentire a dieta."', figma: '416:41' },
];

export function ConfrontoTesti() {
  return (
    <View style={stili.pagina}>
      {RIGHE_SPECIMEN.map((r) => (
        <View key={r.stile} style={stili.riga}>
          <Text style={[testi[r.stile], stili.testo]}>{r.testo}</Text>
        </View>
      ))}
    </View>
  );
}

const stili = StyleSheet.create({
  pagina: { flex: 1, backgroundColor: colori.sfondo.pagina, paddingTop: 80, paddingLeft: spazio[20], gap: spazio[8] },
  riga: { backgroundColor: colori.sfondo.card, alignSelf: 'flex-start' },
  testo: { color: colori.testo.primario, width: 500 },
});
