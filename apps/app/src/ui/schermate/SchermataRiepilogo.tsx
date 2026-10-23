import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import type { Diario } from '@/core/diario/modello';
import { BloccoCommento, BloccoPasti, BloccoSport, BloccoValori } from '@/ui/diario/Blocchi';
import { CardSfumata } from '@/ui/diario/CardDiario';
import { Intestazione } from '@/ui/Intestazione';
import type { NotificaBreveProps } from '@/ui/NotificaBreve';
import { Pulsante } from '@/ui/Pulsante';
import { NotificaInBasso } from '@/ui/schermate/NotificaInBasso';
import { Pagina } from '@/ui/schermate/Pagina';
import { TESTI_TUTORIAL } from '@/ui/schermate/SchermataRacconta';
import { margine, spazio } from '@/ui/theme';
import { Tutorial, useRiquadroTutorial } from '@/ui/Tutorial';

export type SchermataRiepilogoProps = {
  diario: Diario;
  inviando: boolean;
  /** Tutorial · 6 (758:7773) su "Invia alla nutrizionista": al primo arrivo, una volta per account. */
  tutorial: boolean;
  onAggiorna: (diario: Diario) => void;
  onCondividi: () => void;
  /** "Chiudi" e freccia indietro: torna a Oggi con la bozza salvata. */
  onChiudi: () => void;
  onHoCapito: () => void;
  notifica?: NotificaBreveProps & { chiave?: string };
  /** Campo del commento a fuoco all'avvio (pagina di sviluppo: verifica della tastiera). */
  commentoAFuoco?: boolean;
  /** Pagina di sviluppo: parte scorsa in fondo. */
  scorriInFondoAllAvvio?: boolean;
  sovrapposti?: ReactNode;
};

const TITOLO = 'Modifica e invia';
const nulla = () => {};

/**
 * Racconta · 8 · Il tuo diario, riepilogo modificabile (Figma 747:7517): intestazione "Modifica e invia" e una sola
 * card con la sfumatura del diario che scorre con tutti i blocchi già aperti (Pasti con le quattro righe aperte,
 * Valori, Sport con riposo, Commento con "Invia alla nutrizionista") e "Chiudi" in fondo. Gli stessi componenti della
 * Card diario di Oggi, con la stessa regola della tastiera (Pagina). Card: padding 32, blocchi uno sotto l'altro
 * (padding verticale 32, nessun gap); contenuto 16 sopra, 32 sotto, margini 20.
 */
export function SchermataRiepilogo({ diario, inviando, tutorial, onAggiorna, onCondividi, onChiudi, onHoCapito, notifica, commentoAFuoco = false, scorriInFondoAllAvvio = false, sovrapposti }: SchermataRiepilogoProps) {
  // "Invia alla nutrizionista" sta nel contenuto scorrevole: la misura passa dalla Pagina (vedi MisuraNellaFinestra).
  const misura = useRiquadroTutorial(tutorial);
  const { chiave: chiaveNotifica, ...propsNotifica } = notifica ?? { chiave: undefined, testo: '', tipo: 'conferma' as const };
  return (
    <Pagina
      // Con il tutorial la pagina parte in fondo, dove sta "Invia alla nutrizionista", e lo rimisura dopo lo scorrimento.
      scorriInFondoAllAvvio={tutorial || scorriInFondoAllAvvio}
      onScorsoInFondo={tutorial ? misura.onLayout : undefined}
      collegaMisura={misura.collegaMisura}
      sovrapposti={
        <>
          {tutorial && <Tutorial riquadro={misura.riquadro} elemento={<Pulsante etichetta="Invia alla nutrizionista" />} testo={TESTI_TUTORIAL.riepilogo} onHoCapito={onHoCapito} />}
          {notifica && <NotificaInBasso key={chiaveNotifica ?? notifica.testo} {...propsNotifica} />}
          {sovrapposti}
        </>
      }
    >
      <View style={stili.intestazione}>
        <Intestazione titolo={TITOLO} onIndietro={onChiudi} />
      </View>
      <View style={stili.contenuto}>
        <CardSfumata>
          <BloccoPasti diario={diario} onChange={onAggiorna} pastoAperto={null} onApri={nulla} tuttiAperti />
          <BloccoValori diario={diario} onChange={onAggiorna} />
          <BloccoSport diario={diario} onChange={onAggiorna} />
          <BloccoCommento
            diario={diario}
            onChange={onAggiorna}
            onCondividi={onCondividi}
            inviando={inviando}
            aFuoco={commentoAFuoco}
            misuraInvio={tutorial ? { ref: misura.ref, onLayout: misura.onLayout } : undefined}
          />
          <Pulsante etichetta="Chiudi" livello="terziarioCompatto" onPress={onChiudi} accessibilityHint="Chiude il riepilogo e tiene il diario come bozza" />
        </CardSfumata>
      </View>
    </Pagina>
  );
}

const stili = StyleSheet.create({
  intestazione: { paddingTop: spazio[12], paddingHorizontal: margine.pagina },
  contenuto: { paddingTop: spazio[16], paddingBottom: spazio[32], paddingHorizontal: margine.pagina },
});
