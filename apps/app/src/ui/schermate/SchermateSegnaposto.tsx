import { StyleSheet, View } from 'react-native';

import type { StatoCliente } from '@/core/stato/stato';
import { NOMI_STATI } from '@/core/stato/stato';
import { BarraSuperiore } from '@/ui/BarraSuperiore';
import { Pulsante } from '@/ui/Pulsante';
import { Pagina } from '@/ui/schermate/Pagina';
import { BarraNavigazioneFissa } from '@/ui/schermate/SchermateTrasversali';
import { TitoloAccento } from '@/ui/schermate/TitoloAccento';
import { Testo } from '@/ui/Testo';
import { colori, margine, spazio } from '@/ui/theme';

type StatoPrenotazione = Extract<StatoCliente, { codice: 'C' | 'D' | 'F' | 'G' }>;

function descrizione(stato: StatoPrenotazione | { codice: 'E' }): string {
  switch (stato.codice) {
    case 'C':
      return `La tua consulenza è da confermare: ${stato.slot.data} alle ${stato.slot.ora}.`;
    case 'D':
      return stato.slot
        ? `L'orario che avevi scelto (${stato.slot.data} alle ${stato.slot.ora}) è passato: scegli un nuovo orario.`
        : 'Non hai ancora un orario per la consulenza: scegline uno.';
    case 'E':
      return "L'orario non è più disponibile: scegline un altro.";
    case 'F':
      return stato.appuntamento
        ? `La tua consulenza è prenotata: ${stato.appuntamento.data} alle ${stato.appuntamento.ora}.`
        : 'La tua consulenza è prenotata. Il dettaglio arriva con lo step 12.';
    case 'G':
      return 'Prenotazione della consulenza confermata!';
  }
}

export type SchermataSegnapostoPrenotazioneProps = {
  stato: StatoPrenotazione | { codice: 'E' };
  nome: string;
  onEsci: () => void;
};

/** Segnaposto provvisorio degli stati C, D, E, F, G (schermate vere allo step 12): titolo, descrizione e "Esci". */
export function SchermataSegnapostoPrenotazione({ stato, nome, onEsci }: SchermataSegnapostoPrenotazioneProps) {
  return (
    <Pagina
      piede={
        <View style={stili.comandi}>
          <Pulsante etichetta="Esci" livello="terziario" onPress={onEsci} style={stili.centrato} />
        </View>
      }
    >
      <BarraSuperiore notifiche="nascosta" azione="nascosta" />
      <View style={stili.contenuto}>
        <View style={stili.saluto}>
          <TitoloAccento prima="Ciao " accento={`${nome},`} />
          <Testo stile="body" colore={colori.testo.corpoAttenuato}>
            {descrizione(stato)}
          </Testo>
        </View>
        <Testo stile="caption" colore={colori.testo.secondario}>
          {`Segnaposto · stato ${stato.codice} · ${stato.codice === 'E' ? 'Orario non più disponibile' : NOMI_STATI[stato.codice]} · schermata dello step 12`}
        </Testo>
      </View>
    </Pagina>
  );
}

export type SchermataAbbonatoProps = { nome: string; onEsci: () => void };

/** Segnaposto dello stato J (app dell'abbonato, dallo step 5): barra superiore, saluto e barra di navigazione. */
export function SchermataAbbonato({ nome, onEsci }: SchermataAbbonatoProps) {
  return (
    <Pagina sovrapposti={<BarraNavigazioneFissa attiva="oggi" />}>
      <BarraSuperiore />
      <View style={stili.contenuto}>
        <View style={stili.saluto}>
          <TitoloAccento prima="Ciao " accento={`${nome},`} dopo=" come è andata oggi?" />
          <Testo stile="body" colore={colori.testo.corpoAttenuato}>
            {"L'app dell'abbonato arriva con lo step 5. Per ora qui c'è solo la barra di navigazione."}
          </Testo>
        </View>
        <Pulsante etichetta="Esci" livello="terziario" onPress={onEsci} style={stili.centrato} />
      </View>
    </Pagina>
  );
}

const stili = StyleSheet.create({
  contenuto: { flex: 1, paddingTop: spazio[16], paddingHorizontal: margine.pagina, gap: spazio[24] },
  saluto: { gap: spazio[8] },
  centrato: { alignSelf: 'center' },
  comandi: { paddingTop: spazio[12], paddingBottom: spazio[8], paddingHorizontal: margine.pagina, gap: spazio[4], alignItems: 'center' },
});
