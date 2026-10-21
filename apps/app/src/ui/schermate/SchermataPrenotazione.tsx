import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { TESTI_CONFERMA } from '@/core/prenotazione/conferma';
import type { Profilo, Slot } from '@/core/stato/stato';
import { BarraSuperiore } from '@/ui/BarraSuperiore';
import { CardConsulenza, CardProfiloNutrizionista, CardTuoiDati } from '@/ui/prenotazione/CardPrenotazione';
import { Pulsante } from '@/ui/Pulsante';
import { Pagina } from '@/ui/schermate/Pagina';
import { TitoloAccento } from '@/ui/schermate/TitoloAccento';
import { margine, spazio } from '@/ui/theme';

export type SchermataPrenotazioneProps = {
  /** C: orario futuro da confermare (quello del lead o quello scelto con "Modifica"). D: orario passato o assente. */
  variante: 'daConfermare' | 'orarioPassato';
  profilo: Profilo;
  slot: Pick<Slot, 'data' | 'ora'> | null;
  /** "Conferma la consulenza" (C): durante la chiamata il pulsante mostra il caricamento. */
  confermando?: boolean;
  onConferma?: () => void;
  /** "Modifica" (C): apre il pannello "Cambia orario". */
  onModifica?: () => void;
  /** "Scegli un nuovo orario" (D): apre il pannello con l'avviso dell'orario passato. */
  onScegliNuovo?: () => void;
  onMenu?: () => void;
  /** Pannello di scelta e Notifica breve. */
  sovrapposti?: ReactNode;
};

/**
 * Stati · 1 · Consulenza da confermare (Figma 550:3636, stato C) e Stati · 3 · Orario passato senza conferma
 * (550:3754, stato D): barra superiore con il solo Menu, saluto "Ciao Giulia, ci siamo quasi!", card "I tuoi dati",
 * "La tua Nutrizionista" e "La tua consulenza" (barrata in D); in fondo "Conferma la consulenza" + "Modifica" (C)
 * oppure "Scegli un nuovo orario" (D).
 */
export function SchermataPrenotazione({ variante, profilo, slot, confermando = false, onConferma, onModifica, onScegliNuovo, onMenu, sovrapposti }: SchermataPrenotazioneProps) {
  return (
    <Pagina
      sovrapposti={sovrapposti}
      piede={
        <View style={stili.comandi}>
          {variante === 'daConfermare' ? (
            <>
              <Pulsante etichetta={TESTI_CONFERMA.conferma} stato={confermando ? 'caricamento' : 'normale'} onPress={onConferma} />
              <View style={stili.azioni}>
                <Pulsante etichetta={TESTI_CONFERMA.modifica} livello="terziario" onPress={confermando ? undefined : onModifica} accessibilityHint="Cambia giorno e orario della consulenza" style={stili.centrato} />
              </View>
            </>
          ) : (
            <Pulsante etichetta={TESTI_CONFERMA.scegliNuovo} onPress={onScegliNuovo} />
          )}
        </View>
      }
    >
      <BarraSuperiore notifiche="nascosta" azione="menu" onAzione={onMenu} />
      <View style={stili.contenuto}>
        <TitoloAccento prima="Ciao " accento={`${profilo.nome}, `} dopo="ci siamo quasi!" />
        <View style={stili.gruppo}>
          <CardTuoiDati nome={profilo.nomeCompleto} email={profilo.account.email} telefono={profilo.telefono} />
          {profilo.nutrizionista && <CardProfiloNutrizionista nutrizionista={profilo.nutrizionista} />}
          <CardConsulenza slot={slot} passato={variante === 'orarioPassato'} />
        </View>
      </View>
    </Pagina>
  );
}

// Misure da Figma 550:3636: Contenuto pt 16 / px 20, gap 24; gruppo delle card gap 12; Comandi pt 12 / pb 8 / px 20, gap 4.
const stili = StyleSheet.create({
  contenuto: { flex: 1, paddingTop: spazio[16], paddingHorizontal: margine.pagina, paddingBottom: spazio[16], gap: spazio[24] },
  gruppo: { alignSelf: 'stretch', gap: spazio[12] },
  comandi: { paddingTop: spazio[12], paddingBottom: spazio[8], paddingHorizontal: margine.pagina, gap: spazio[4], alignItems: 'stretch' },
  azioni: { alignSelf: 'stretch', alignItems: 'center', gap: spazio[4] },
  centrato: { alignSelf: 'center' },
});
