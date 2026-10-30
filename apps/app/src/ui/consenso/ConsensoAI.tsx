import { StyleSheet, View } from 'react-native';

import { TESTI_CONSENSO, type FunzioneAI } from '@/core/consenso/consenso';
import { PannelloDalBasso } from '@/ui/PannelloDalBasso';
import { EtichettaAI } from '@/ui/piano/EtichettaAI';
import { Pulsante } from '@/ui/Pulsante';
import { Testo } from '@/ui/Testo';
import { colori, raggio, spazio } from '@/ui/theme';

export type ConsensoAIProps = {
  funzione: FunzioneAI;
  onAccetto: () => void;
  onNonOra: () => void;
  /** "Informativa": la stessa informativa privacy della voce in Account. */
  onInformativa: () => void;
  /** Scrittura del consenso in corso: "Accetto" con i pallini. */
  inCorso?: boolean;
};

/**
 * Consenso alle funzioni AI al primo uso (Figma Piano · 4.6 831:8486, contratto §8): "Card informativa" (sfondo/card,
 * padding 16, gap 4, raggio foto) con "Prima di iniziare" in Etichetta, il testo adattato alla funzione in Body details
 * attenuato e "Informativa" (Terziario compatto evidenziato); sotto, con gap 24 dal pannello, "Accetto" (primario) e
 * "Non ora" (terziario centrato) a gap 8.
 */
export function CardConsensoAI({ funzione, onAccetto, onNonOra, onInformativa, inCorso = false }: ConsensoAIProps) {
  return (
    <>
      <View style={stili.card} accessibilityLiveRegion="polite">
        <Testo stile="etichetta" accessibilityRole="header">
          {TESTI_CONSENSO.pannello.titolo}
        </Testo>
        <Testo stile="bodyDetails" colore={colori.testo.attenuato}>
          {TESTI_CONSENSO.pannello.testo[funzione]}
        </Testo>
        <Pulsante etichetta={TESTI_CONSENSO.pannello.informativa} livello="terziarioCompattoEvidenziato" onPress={onInformativa} accessibilityHint="Apre l’informativa privacy" />
      </View>
      <View style={stili.azioni}>
        <Pulsante etichetta={TESTI_CONSENSO.pannello.accetto} onPress={onAccetto} stato={inCorso ? 'caricamento' : 'normale'} accessibilityHint="Registra il consenso e continua" />
        <Pulsante etichetta={TESTI_CONSENSO.pannello.nonOra} livello="terziario" onPress={onNonOra} style={stili.centrato} />
      </View>
    </>
  );
}

export type PannelloConsensoAIProps = ConsensoAIProps & {
  aperto: boolean;
  /** Titolo in Heading sotto la testata (l'alimento del piano, il nome della funzione). */
  titolo?: string;
};

/**
 * Pannello del consenso al primo uso (831:8486) fuori dal Piano (diario vocale): Pannello dal basso con la testata
 * Etichetta AI, il titolo in Heading e la card del consenso; chiuderlo (velo, maniglia, gesto) vale "Non ora".
 */
export function PannelloConsensoAI({ aperto, titolo, funzione, onAccetto, onNonOra, onInformativa, inCorso }: PannelloConsensoAIProps) {
  return (
    <PannelloDalBasso aperto={aperto} onChiudi={onNonOra} etichetta="Consenso alle funzioni con intelligenza artificiale" spaziatura={spazio[24]}>
      {aperto && (
        <>
          <EtichettaAI etichetta={TESTI_CONSENSO.pannello.testata[funzione]} />
          {titolo ? (
            <Testo stile="heading" accessibilityRole="header">
              {titolo}
            </Testo>
          ) : null}
          <CardConsensoAI funzione={funzione} onAccetto={onAccetto} onNonOra={onNonOra} onInformativa={onInformativa} inCorso={inCorso} />
        </>
      )}
    </PannelloDalBasso>
  );
}

const stili = StyleSheet.create({
  card: { alignSelf: 'stretch', padding: spazio[16], gap: spazio[4], borderRadius: raggio.foto, backgroundColor: colori.sfondo.card },
  azioni: { alignSelf: 'stretch', gap: spazio[8] },
  centrato: { alignSelf: 'center' },
});
