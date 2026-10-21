import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import type { Visita } from '@/core/appuntamenti/appuntamenti';
import type { Profilo } from '@/core/stato/stato';
import { CardAppuntamento, type NutrizionistaAppuntamento } from '@/ui/appuntamenti/CardAppuntamento';
import { BarraSuperiore } from '@/ui/BarraSuperiore';
import { CardNutrizionista } from '@/ui/CardNutrizionista';
import { Pulsante } from '@/ui/Pulsante';
import { Pagina } from '@/ui/schermate/Pagina';
import { TitoloAccento } from '@/ui/schermate/TitoloAccento';
import { Testo } from '@/ui/Testo';
import { colori, margine, raggio, spazio } from '@/ui/theme';

export type SchermataPrenotatoProps = {
  profilo: Profilo;
  /** Prima visita in programma (dall'appuntamento dello stato); null se il cliente è prenotato senza una visita futura. */
  visita: Visita | null;
  adesso: Date;
  nutrizionista: NutrizionistaAppuntamento | null;
  onEntra?: (link: string) => void;
  onGestisci?: () => void;
  onNutrizionista?: () => void;
  onMenu?: () => void;
  sovrapposti?: ReactNode;
};

/**
 * Stati · 2 · Prima della consulenza (Figma 550:3694, stato F): barra superiore con il solo Menu, saluto
 * "Ciao Giulia, manca poco alla consulenza!", card dell'appuntamento (la stessa di Appuntamenti: Entra, oppure,
 * Gestisci appuntamento) e card della nutrizionista → /nutrizionista.
 */
export function SchermataPrenotato({ profilo, visita, adesso, nutrizionista, onEntra, onGestisci, onNutrizionista, onMenu, sovrapposti }: SchermataPrenotatoProps) {
  return (
    <Pagina sovrapposti={sovrapposti}>
      <BarraSuperiore notifiche="nascosta" azione="menu" onAzione={onMenu} />
      <View style={stili.contenuto}>
        <TitoloAccento prima="Ciao " accento={`${profilo.nome}, `} dopo="manca poco alla consulenza!" />
        <View style={stili.gruppo}>
          {visita ? (
            <CardAppuntamento visita={visita} adesso={adesso} nutrizionista={nutrizionista} onEntra={onEntra} onGestisci={onGestisci} />
          ) : (
            <View style={stili.cardVuota}>
              <Testo stile="bodyDetails" colore={colori.testo.secondario}>
                Nessuna visita in programma al momento.
              </Testo>
              <View style={stili.gestisci}>
                <Pulsante etichetta="Gestisci appuntamento" livello="secondario" onPress={onGestisci} accessibilityHint="Copia il numero WhatsApp del supporto" />
                <Testo stile="caption" style={stili.centrato}>
                  Puoi gestire il tuo appuntamento scrivendoci su WhatsApp
                </Testo>
              </View>
            </View>
          )}
          {profilo.nutrizionista && <CardNutrizionista nome={profilo.nutrizionista.nome} foto={profilo.nutrizionista.foto} onPress={onNutrizionista} />}
        </View>
      </View>
    </Pagina>
  );
}

// Misure da Figma 550:3694: Contenuto pt 16 / px 20, gap 24; gruppo gap 12.
const stili = StyleSheet.create({
  contenuto: { flex: 1, paddingTop: spazio[16], paddingHorizontal: margine.pagina, paddingBottom: spazio[24], gap: spazio[24] },
  gruppo: { alignSelf: 'stretch', gap: spazio[12] },
  cardVuota: { alignSelf: 'stretch', padding: spazio[32], gap: spazio[12], backgroundColor: colori.sfondo.card, borderRadius: raggio.card },
  gestisci: { alignSelf: 'stretch', gap: spazio[8] },
  centrato: { alignSelf: 'stretch', textAlign: 'center' },
});
