import { StyleSheet, View } from 'react-native';

import { TESTI_CONFERMA, TESTI_CONFERMATA } from '@/core/prenotazione/conferma';
import { Icona } from '@/ui/icone';
import { Intestazione } from '@/ui/Intestazione';
import { Pulsante } from '@/ui/Pulsante';
import { Pagina } from '@/ui/schermate/Pagina';
import { TitoloAccento } from '@/ui/schermate/TitoloAccento';
import { Testo } from '@/ui/Testo';
import { colori, margine, raggio, spazio } from '@/ui/theme';

export type SchermataConsulenzaConfermataProps = {
  /** "Torna alla home" e l'icona Indietro: portano a F rileggendo lo stato. */
  onTornaAllaHome: () => void;
};

/**
 * Stati · 5 · Consulenza prenotata (Figma 550:3890, stato G): compare solo dopo una conferma fatta nell'app.
 * Intestazione con la sola icona Indietro, contenuto centrato (icona Conferma 36, titolo con "confermata" in
 * serif, card "I prossimi passi:"), in fondo "Torna alla home".
 */
export function SchermataConsulenzaConfermata({ onTornaAllaHome }: SchermataConsulenzaConfermataProps) {
  return (
    <Pagina
      piede={
        <View style={stili.comandi}>
          <Pulsante etichetta={TESTI_CONFERMA.tornaAllaHome} onPress={onTornaAllaHome} />
        </View>
      }
    >
      <View style={stili.intestazione}>
        <Intestazione mostraTitolo={false} onIndietro={onTornaAllaHome} />
      </View>
      <View style={stili.contenuto}>
        <Icona misura={36} nome="Conferma" etichetta="Confermata" />
        <TitoloAccento prima={TESTI_CONFERMATA.titoloPrima} accento={TESTI_CONFERMATA.titoloAccento} dopo={TESTI_CONFERMATA.titoloDopo} allineamento="centro" />
        <View style={stili.card}>
          <Testo stile="heading" accessibilityRole="header">
            {TESTI_CONFERMATA.passi}
          </Testo>
          <View style={stili.righe}>
            {TESTI_CONFERMATA.righe.map((riga) => (
              <View key={riga.testo} style={stili.riga}>
                <Icona misura={20} nome={riga.icona} />
                <Testo stile="bodyDetails" style={stili.cresce}>
                  {riga.testo}
                </Testo>
              </View>
            ))}
          </View>
        </View>
      </View>
    </Pagina>
  );
}

// Misure da Figma 550:3890: Intestazione pt 12 / px 20; Contenuto centrato pt 20 / px 20, gap 24; card px 28 / py 32,
// gap 16, righe gap 12 (icona 20 + Body details, gap 8); Comandi pt 12 / pb 8 / px 20, gap 8.
const stili = StyleSheet.create({
  intestazione: { paddingTop: spazio[12], paddingHorizontal: margine.pagina },
  contenuto: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: spazio[20], paddingHorizontal: margine.pagina, paddingBottom: spazio[24], gap: spazio[24] },
  card: { alignSelf: 'stretch', paddingVertical: spazio[32], paddingHorizontal: spazio[28], gap: spazio[16], backgroundColor: colori.sfondo.card, borderRadius: raggio.card },
  righe: { alignSelf: 'stretch', gap: spazio[12] },
  riga: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: spazio[8] },
  cresce: { flex: 1 },
  comandi: { paddingTop: spazio[12], paddingBottom: spazio[8], paddingHorizontal: margine.pagina, gap: spazio[8] },
});
