import { StyleSheet, View } from 'react-native';

import { Testo } from '@/ui/Testo';
import { colori, spazio, type NomeStileTesto } from '@/ui/theme';

// Tavola per il confronto a pixel con Figma (usa il componente Testo). Le prime 10 righe riproducono lo
// specimen 416:12 (testo largo 500 come in Figma, textAutoResize HEIGHT); le altre riproducono un testo
// reale delle schermate per gli stili senza specimen (stessa larghezza e allineamento del nodo Figma;
// `hug` = nodo a larghezza automatica). Ogni riga sta su fondo crema con 8 di distacco per il ritaglio
// automatico (strumenti/ritaglia-celle.mjs); la riga con testo bianco ha il fondo azione/primaria.
export const RIGHE_SPECIMEN: readonly {
  stile: NomeStileTesto;
  testo: string;
  figma: string;
  larghezza?: number;
  centrato?: boolean;
  suAzione?: boolean;
}[] = [
  { stile: 'display', testo: 'Ciao Alessandro', figma: '416:14', larghezza: 500 },
  { stile: 'h1', testo: 'Il tuo diario di oggi', figma: '416:17', larghezza: 500 },
  { stile: 'h2', testo: 'Pranzo', figma: '416:20', larghezza: 500 },
  { stile: 'heading', testo: 'Commento della nutrizionista', figma: '416:23', larghezza: 500 },
  { stile: 'bodyLarge', testo: 'Racconta cosa hai mangiato oggi.', figma: '416:26', larghezza: 500 },
  { stile: 'body', testo: "Pasta al pomodoro con un filo d'olio e insalata mista.", figma: '416:29', larghezza: 500 },
  { stile: 'bodyDetails', testo: 'Inviato alle 13:42 · Margherita ha commentato', figma: '416:32', larghezza: 500 },
  { stile: 'caption', testo: 'Ultimo aggiornamento 2 minuti fa', figma: '416:35', larghezza: 500 },
  { stile: 'accentoSerif', testo: 'Alessandro', figma: '416:38', larghezza: 500 },
  { stile: 'citazione', testo: '"Finalmente un percorso che non mi fa sentire a dieta."', figma: '416:41', larghezza: 500 },
  { stile: 'h1Accesso', testo: 'Inserisci il codice', figma: '425:310', larghezza: 329 },
  { stile: 'etichetta', testo: 'Preparando il tuo diario', figma: '459:955', larghezza: 353, centrato: true },
  { stile: 'link', testo: 'Disponibile con il percorso attivo', figma: '515:2947' },
  { stile: 'etichettaPiccola', testo: 'Colazione', figma: '474:1550', larghezza: 353 },
  { stile: 'captionSemiBold', testo: 'Revisioni', figma: 'I494:1971;495:293' },
  { stile: 'etichettaAI', testo: 'Genera ricetta', figma: 'I536:3463;532:3429' },
  { stile: 'bodyDetails130', testo: 'oppure', figma: '518:3333', larghezza: 289, centrato: true },
  { stile: 'etichettaPiccola130', testo: 'Prossimi giorni', figma: 'I556:3821;555:235', suAzione: true },
];

export function ConfrontoTesti() {
  return (
    <View style={stili.pagina}>
      {RIGHE_SPECIMEN.map((r) => (
        <View key={r.stile} style={[stili.riga, r.suAzione && stili.rigaSuAzione]}>
          <Testo
            stile={r.stile}
            colore={r.suAzione ? colori.testo.suAzione : undefined}
            style={[r.larghezza !== undefined && { width: r.larghezza }, r.centrato && stili.centrato, r.suAzione && stili.testoSuAzione]}
          >
            {r.testo}
          </Testo>
        </View>
      ))}
    </View>
  );
}

const stili = StyleSheet.create({
  // nessun margine sinistro: le righe larghe 500 devono stare nei 402 pt dello schermo il più possibile
  pagina: { flex: 1, backgroundColor: colori.sfondo.pagina, paddingTop: 60, gap: spazio[8] },
  riga: { backgroundColor: colori.sfondo.card, alignSelf: 'flex-start' },
  // fondo crema come cella (per il ritaglio) con dentro il blocco verde del testo bianco
  rigaSuAzione: { padding: spazio[4] },
  centrato: { textAlign: 'center' },
  testoSuAzione: { backgroundColor: colori.azione.primaria },
});
