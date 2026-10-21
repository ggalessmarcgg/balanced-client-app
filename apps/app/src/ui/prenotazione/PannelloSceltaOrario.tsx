import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SUPPORTO } from '@/core/accesso/costanti';
import { TESTI_CONFERMA, TESTI_NESSUN_ORARIO, TESTI_PANNELLO, type MotivoPannello } from '@/core/prenotazione/conferma';
import { ETICHETTE_SCHEDE, giorniDagliOrari, giorniDellaScheda, NOTA_ANTICIPO, raggruppaPerData, SCHEDE, stessoOrario, type GiornoGriglia, type OrarioDisponibile, type StatoOrari } from '@/core/prenotazione/orari';
import { useAreaToccabile } from '@/ui/areaToccabile';
import { ErroreCaricamento } from '@/ui/ErroreCaricamento';
import { Messaggio } from '@/ui/Messaggio';
import { PannelloDalBasso } from '@/ui/PannelloDalBasso';
import { Pulsante } from '@/ui/Pulsante';
import { RigaElenco } from '@/ui/RigaElenco';
import { Segnaposto } from '@/ui/Segnaposto';
import { Testo } from '@/ui/Testo';
import { colori, raggio, spazio, testi } from '@/ui/theme';

export type PannelloSceltaOrarioProps = {
  aperto: boolean;
  /** Variante del componente Figma 555:422: avviso in alto per orario passato e non disponibile, nessuno per la modifica. */
  motivo: MotivoPannello;
  orari: StatoOrari;
  scheda: number;
  scelta: OrarioDisponibile | null;
  /** Durante la chiamata di conferma il pulsante mostra il caricamento e la griglia non si tocca. */
  confermando?: boolean;
  onScheda: (scheda: number) => void;
  onOrario: (orario: OrarioDisponibile) => void;
  onConferma: () => void;
  onAnnulla: () => void;
  onRiprova: () => void;
  /** Variante "Nessun orario" (738:7440): contatti del supporto da copiare. */
  onEmailSupporto?: () => void;
  onTelefonoSupporto?: () => void;
};

// Misure dal componente Figma 555:422: pannello pt 12 / px 20 / pb 34, gap 20; selettore gap 16; schede e chip
// px 16 / py 8 con raggio badge (10), bordo 1 azione/primaria da non selezionate, piene da selezionate; griglia a 5
// colonne con gap 8, testata del giorno su sfondo/card (py 8, raggio 10) con Etichetta piccola 130 + Caption; "N/A" in
// Caption al 40 %; nota con "Nota:" in grassetto; azioni "Conferma orario" + "Annulla" (gap 4).
const BORDO = 1;
const nulla = () => {};

export function PannelloSceltaOrario({ aperto, motivo, orari, scheda, scelta, confermando = false, onScheda, onOrario, onConferma, onAnnulla, onRiprova, onEmailSupporto, onTelefonoSupporto }: PannelloSceltaOrarioProps) {
  const giorni = useMemo(() => (orari.tipo === 'pronto' ? giorniDagliOrari(orari.orari) : []), [orari]);
  const perData = useMemo(() => (orari.tipo === 'pronto' ? raggruppaPerData(orari.orari) : new Map<string, string[]>()), [orari]);
  const nessunOrario = orari.tipo === 'pronto' && orari.orari.length === 0;
  const testi = TESTI_PANNELLO[motivo];

  if (nessunOrario) {
    return (
      <PannelloDalBasso aperto={aperto} onChiudi={onAnnulla} etichetta={TESTI_NESSUN_ORARIO.titolo}>
        <Testo stile="h2" accessibilityRole="header">
          {TESTI_NESSUN_ORARIO.titolo}
        </Testo>
        <Messaggio tipo="info" testo={TESTI_NESSUN_ORARIO.avviso} />
        <View style={stili.supporto}>
          <RigaElenco tipo="copia" etichetta={SUPPORTO.email} onPress={onEmailSupporto} />
          <RigaElenco tipo="copia" etichetta={SUPPORTO.telefono} onPress={onTelefonoSupporto} />
        </View>
        <View style={stili.azioni}>
          <Pulsante etichetta={TESTI_CONFERMA.chiudi} livello="terziario" onPress={onAnnulla} style={stili.centrato} />
        </View>
      </PannelloDalBasso>
    );
  }

  const confermabile = orari.tipo === 'pronto' && scelta !== null;
  return (
    <PannelloDalBasso aperto={aperto} onChiudi={confermando ? nulla : onAnnulla} etichetta={testi.titolo}>
      <Testo stile="h2" accessibilityRole="header">
        {testi.titolo}
      </Testo>
      {testi.avviso ? <Messaggio tipo="info" testo={testi.avviso} /> : null}
      {orari.tipo === 'caricamento' ? (
        <View style={stili.selettore}>
          <Testo stile="heading" accessibilityRole="header">
            {TESTI_CONFERMA.selezionaGiorno}
          </Testo>
          <Segnaposto altezza={40} righe={[]} />
          <Segnaposto altezza={220} />
        </View>
      ) : orari.tipo === 'errore' ? (
        <ErroreCaricamento descrizione={TESTI_CONFERMA.erroreOrari} onRiprova={onRiprova} />
      ) : (
        <View style={stili.selettore}>
          <Testo stile="heading" accessibilityRole="header">
            {TESTI_CONFERMA.selezionaGiorno}
          </Testo>
          <View style={stili.schede} accessibilityRole="tablist">
            {Array.from({ length: SCHEDE }, (_, i) => (
              <Scheda key={i} etichetta={ETICHETTE_SCHEDE[i] ?? ''} selezionata={scheda === i} onPress={() => onScheda(i)} />
            ))}
          </View>
          <View style={stili.griglia}>
            {giorniDellaScheda(giorni, scheda).map((giorno) => (
              <Colonna key={giorno.data} giorno={giorno} ore={perData.get(giorno.data) ?? []} scelta={scelta} disabilitata={confermando} onOrario={onOrario} />
            ))}
          </View>
        </View>
      )}
      <Testo stile="bodyDetails130">
        <Text style={stiliTesto.grassetto}>{NOTA_ANTICIPO.etichetta}</Text>
        {NOTA_ANTICIPO.testo}
      </Testo>
      {/* Le azioni stanno nel contenuto, come in Figma (gap 20 dalla nota, 34 dal bordo): con molti orari scorrono con la griglia. */}
      <View style={stili.azioni}>
        <Pulsante etichetta={TESTI_CONFERMA.confermaOrario} stato={confermando ? 'caricamento' : confermabile ? 'normale' : 'disabilitato'} onPress={onConferma} />
        <Pulsante etichetta={TESTI_CONFERMA.annulla} livello="terziario" onPress={confermando ? undefined : onAnnulla} style={stili.centrato} />
      </View>
    </PannelloDalBasso>
  );
}

function Scheda({ etichetta, selezionata, onPress }: { etichetta: string; selezionata: boolean; onPress: () => void }) {
  const { hitSlop, onLayout } = useAreaToccabile();
  return (
    <Pressable onPress={onPress} hitSlop={hitSlop} onLayout={onLayout} accessibilityRole="tab" accessibilityState={{ selected: selezionata }} style={[stili.scheda, selezionata ? stili.pieno : stili.contorno]}>
      <Testo stile={selezionata ? 'etichettaPiccola130' : 'bodyDetails130'} colore={selezionata ? colori.testo.suAzione : colori.testo.primario}>
        {etichetta}
      </Testo>
    </Pressable>
  );
}

function Colonna({ giorno, ore, scelta, disabilitata, onOrario }: { giorno: GiornoGriglia; ore: string[]; scelta: OrarioDisponibile | null; disabilitata: boolean; onOrario: (orario: OrarioDisponibile) => void }) {
  return (
    <View style={stili.colonna}>
      <View style={stili.testataGiorno} accessible accessibilityLabel={`${giorno.giorno} ${giorno.etichetta}`}>
        <Testo stile="etichettaPiccola130">{giorno.giorno}</Testo>
        <Testo stile="caption">{giorno.etichetta}</Testo>
      </View>
      {ore.length === 0 ? (
        <Testo stile="caption" colore={colori.testo.disabilitato} style={stili.nonDisponibile} accessibilityLabel="Nessun orario">
          {TESTI_CONFERMA.nonDisponibile}
        </Testo>
      ) : (
        ore.map((ora) => {
          const orario = { date: giorno.data, time: ora };
          return <Chip key={ora} etichetta={ora} selezionato={stessoOrario(scelta, orario)} disabilitato={disabilitata} onPress={() => onOrario(orario)} />;
        })
      )}
    </View>
  );
}

function Chip({ etichetta, selezionato, disabilitato, onPress }: { etichetta: string; selezionato: boolean; disabilitato: boolean; onPress: () => void }) {
  const { hitSlop, onLayout } = useAreaToccabile();
  return (
    <Pressable onPress={onPress} disabled={disabilitato} hitSlop={hitSlop} onLayout={onLayout} accessibilityRole="button" accessibilityLabel={etichetta} accessibilityState={{ selected: selezionato, disabled: disabilitato }} style={[stili.chip, selezionato ? stili.pieno : stili.contorno]}>
      <Testo stile={selezionato ? 'etichettaPiccola130' : 'bodyDetails130'} colore={selezionato ? colori.testo.suAzione : colori.testo.primario}>
        {etichetta}
      </Testo>
    </Pressable>
  );
}

const stili = StyleSheet.create({
  selettore: { alignSelf: 'stretch', gap: spazio[16] },
  schede: { flexDirection: 'row', gap: spazio[8] },
  // Il bordo sta dentro il riquadro: il padding si riduce di 1 così la pillola selezionata (piena) ha la stessa misura.
  scheda: { paddingHorizontal: spazio[16] - BORDO, paddingVertical: spazio[8] - BORDO, borderRadius: raggio.badge, borderWidth: BORDO, alignItems: 'center', justifyContent: 'center' },
  contorno: { backgroundColor: colori.sfondo.pagina, borderColor: colori.azione.primaria },
  pieno: { backgroundColor: colori.azione.primaria, borderColor: colori.azione.primaria },
  griglia: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'flex-start', gap: spazio[8] },
  colonna: { flex: 1, gap: spazio[8] },
  testataGiorno: { alignSelf: 'stretch', alignItems: 'center', paddingVertical: spazio[8], borderRadius: raggio.badge, backgroundColor: colori.sfondo.card },
  chip: { alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', paddingVertical: spazio[8] - BORDO, borderRadius: raggio.badge, borderWidth: BORDO },
  nonDisponibile: { alignSelf: 'stretch', textAlign: 'center' },
  azioni: { alignSelf: 'stretch', alignItems: 'center', gap: spazio[4] },
  centrato: { alignSelf: 'center' },
  supporto: { alignSelf: 'stretch' },
});
const stiliTesto = StyleSheet.create({ grassetto: { ...testi.etichettaPiccola130 } });
