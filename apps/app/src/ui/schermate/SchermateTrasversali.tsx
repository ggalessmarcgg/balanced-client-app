import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AvvisoConnessione } from '@/ui/AvvisoConnessione';
import { BarraNavigazione, type VoceNavigazione } from '@/ui/BarraNavigazione';
import { BarraSuperiore } from '@/ui/BarraSuperiore';
import { ErroreCaricamento } from '@/ui/ErroreCaricamento';
import { Pagina } from '@/ui/schermate/Pagina';
import { Segnaposto } from '@/ui/Segnaposto';
import { Testo } from '@/ui/Testo';
import { margine, spazio } from '@/ui/theme';

/** Barra di navigazione fissa al viewport: 8 sopra l'area sicura inferiore, margini laterali 20 (Figma 493:368). */
export function BarraNavigazioneFissa({ attiva, revisioneNuova = false, onSeleziona }: { attiva: VoceNavigazione; revisioneNuova?: boolean; onSeleziona?: (voce: VoceNavigazione) => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[stili.barraFissa, { bottom: insets.bottom + spazio[8] }]} pointerEvents="box-none">
      <BarraNavigazione attiva={attiva} revisioneNuova={revisioneNuova} onSeleziona={onSeleziona} />
    </View>
  );
}

/** Altezza della barra di navigazione più il suo distacco dall'area sicura: spazio da lasciare sotto il contenuto e sopra la Notifica breve. */
export const INGOMBRO_BARRA_NAVIGAZIONE = 64 + spazio[8];

/**
 * Struttura della pagina in cui compare uno stato trasversale: gli stati trasversali stanno dentro la pagina del
 * cliente e ne rispettano la struttura. La barra di navigazione c'è solo se la pagina ce l'ha (app dell'abbonato);
 * all'avvio, nell'accesso e nelle schermate dei non abbonati non c'è, e la barra superiore ha solo il logo.
 */
export type StrutturaPagina = {
  /** Barra superiore: solo logo (predefinito: avvio e non abbonati) o completa (app dell'abbonato). */
  barraSuperiore?: 'soloLogo' | 'completa';
  /** Voce attiva della barra di navigazione; assente = nessuna barra (predefinito). */
  barraNavigazione?: VoceNavigazione;
  /** Pallino rosso sulla voce Revisioni (almeno una revisione Nuova). */
  revisioneNuova?: boolean;
};

function Struttura({ barraSuperiore = 'soloLogo' }: StrutturaPagina) {
  return barraSuperiore === 'completa' ? <BarraSuperiore /> : <BarraSuperiore notifiche="nascosta" azione="nascosta" />;
}

function barraDi(struttura: StrutturaPagina) {
  return struttura.barraNavigazione ? <BarraNavigazioneFissa attiva={struttura.barraNavigazione} revisioneNuova={struttura.revisioneNuova} /> : undefined;
}

/** Trasversali · 2 · Caricamento (Figma 563:4751): tre segnaposti che pulsano dentro la struttura della pagina. */
export function SchermataCaricamento(struttura: StrutturaPagina) {
  return (
    <Pagina scorrevole={false} sovrapposti={barraDi(struttura)}>
      <Struttura {...struttura} />
      <View style={stili.contenutoCaricamento}>
        <Segnaposto altezza={230} />
        <Segnaposto altezza={130} />
        <Segnaposto altezza={240} />
      </View>
    </Pagina>
  );
}

export type SchermataSenzaConnessioneProps = StrutturaPagina & { onRiprova: () => void };

/**
 * Trasversali · 1 · Senza connessione (Figma 563:4517) all'avvio, quando non ci sono dati salvati da mostrare:
 * avviso in cima al contenuto e invito a riprovare.
 */
export function SchermataSenzaConnessione({ onRiprova, ...struttura }: SchermataSenzaConnessioneProps) {
  return (
    <Pagina scorrevole={false} sovrapposti={barraDi(struttura)}>
      <Struttura {...struttura} />
      <View style={stili.contenutoOffline}>
        <AvvisoConnessione posizione="nelContenuto" />
        <View style={stili.spazio} />
        <ErroreCaricamento descrizione="Sei offline: non riusciamo a caricare il tuo percorso. Controlla la connessione e riprova." onRiprova={onRiprova} />
      </View>
    </Pagina>
  );
}

export type SchermataErroreCaricamentoProps = StrutturaPagina & { onRiprova: () => void; titolo?: string; descrizione?: string };

/** Trasversali · 3 · Errore di caricamento (Figma 563:4978): titolo serif opzionale, spazio 120, blocco "Riprova". */
export function SchermataErroreCaricamento({ onRiprova, titolo, descrizione, ...struttura }: SchermataErroreCaricamentoProps) {
  return (
    <Pagina scorrevole={false} sovrapposti={barraDi(struttura)}>
      <Struttura {...struttura} />
      <View style={stili.contenutoErrore}>
        {titolo && (
          <Testo stile="accentoSerif" accessibilityRole="header">
            {titolo}
          </Testo>
        )}
        <View style={stili.spazio} />
        <ErroreCaricamento descrizione={descrizione} onRiprova={onRiprova} />
      </View>
    </Pagina>
  );
}

const SPAZIO_PRIMA_DELL_ERRORE = 120;
const stili = StyleSheet.create({
  barraFissa: { position: 'absolute', left: margine.pagina, right: margine.pagina },
  contenutoCaricamento: { paddingTop: spazio[16], paddingBottom: spazio[32], paddingHorizontal: margine.pagina, gap: spazio[12] },
  contenutoOffline: { paddingTop: spazio[16], paddingHorizontal: margine.pagina, gap: spazio[12] },
  contenutoErrore: { paddingTop: spazio[16], paddingHorizontal: margine.pagina, gap: spazio[24] },
  spazio: { height: SPAZIO_PRIMA_DELL_ERRORE },
});
