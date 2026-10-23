import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Reanimated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { riquadroDalContenuto } from '@/core/tutorial/riquadro';
import { useSovrappostiNelPortale } from '@/ui/schermate/Sovrapposti';
import { colori } from '@/ui/theme';
import { ChiudiCampiAlTocco, FornitoreCampi, useScorrimentoConTastiera } from '@/ui/tastiera';
import type { CollegaMisura, MisuraNellaFinestra } from '@/ui/Tutorial';

export type PaginaProps = {
  children: ReactNode;
  /** Blocco fisso in fondo (Azioni / Comandi di Figma), sopra l'area sicura inferiore. Resta al suo posto anche con la tastiera aperta (regola in CLAUDE.md). */
  piede?: ReactNode;
  /** Colore di fondo: sfondo/pagina (in-app) o sfondo/card (schermate di accesso). */
  sfondo?: string;
  /** Il contenuto scorre se non entra (predefinito); false per schermate fisse. */
  scorrevole?: boolean;
  /** Elementi sopra tutto (pannello dal basso, notifica breve): posizionati da chi li passa. Nel gruppo dell'abbonato vanno al portale del layout, sopra la barra persistente. */
  sovrapposti?: ReactNode;
  /** All'avvio scorre fino in fondo: tutorial su un elemento in fondo (riepilogo di Racconta) e screenshot del contenuto sotto la piega nelle pagine di sviluppo. */
  scorriInFondoAllAvvio?: boolean;
  /** Chiamata poco dopo lo scorrimento in fondo all'avvio (per rimisurare un elemento da evidenziare). */
  onScorsoInFondo?: () => void;
  /** Da `useRiquadroTutorial` quando l'elemento da evidenziare sta nel contenuto scorrevole: la Pagina gli dà la sua misura. */
  collegaMisura?: CollegaMisura;
};

/**
 * Impalcatura di una schermata: area sicura in alto e in basso (Figma: barra di stato 59, indicatore home 34),
 * contenuto che cresce e scorre, piede fisso. Tastiera (regola unica dell'app): il contenuto scorre insieme alla
 * comparsa della tastiera perché il campo a fuoco stia per intero subito sopra (src/ui/tastiera.tsx); lo scorrimento
 * non chiude la tastiera; un tocco fuori dai campi la chiude; il piede non sale sopra la tastiera.
 */
export function Pagina({ children, piede, sfondo = colori.sfondo.pagina, scorrevole = true, sovrapposti, scorriInFondoAllAvvio = false, onScorsoInFondo, collegaMisura }: PaginaProps) {
  const insets = useSafeAreaInsets();
  const [scorsoInFondo, setScorsoInFondo] = useState(false);
  // Il piede sta sotto lo scorrimento: la tastiera copre lo scorrimento solo per la parte che supera piede e area sicura.
  const [altezzaPiede, setAltezzaPiede] = useState(0);
  const { riferimento: scorrimento, posizione, onScroll: segnaPosizione, stileSpazio: spazioTastiera, contesto: campi } = useScorrimentoConTastiera(altezzaPiede + insets.bottom);
  const nelPortale = useSovrappostiNelPortale(sovrapposti);
  // Scorre in fondo (idempotente) e, poco dopo, fa rimisurare l'elemento da evidenziare. Si ripete una seconda volta
  // perché il primo scorrimento può arrivare prima che il contenuto sia completo (difetto del 23/10/2026).
  const scorriInFondo = useCallback(() => {
    setScorsoInFondo(true);
    for (const ritardo of RITARDI_SCORRIMENTO_MS) {
      setTimeout(() => {
        scorrimento.current?.scrollToEnd({ animated: false });
        if (onScorsoInFondo) setTimeout(onScorsoInFondo, RITARDO_MISURA_MS);
      }, ritardo);
    }
  }, [scorrimento, onScorsoInFondo]);
  useEffect(() => {
    if (!scorriInFondoAllAvvio || !scorrevole) return;
    // Se la misura del contenuto non arriva (o arriva tardi), si scorre comunque dopo un breve ritardo.
    const timer = setTimeout(() => {
      if (!scorsoInFondo) scorriInFondo();
    }, RITARDO_SCORRIMENTO_SENZA_MISURA_MS);
    return () => clearTimeout(timer);
  }, [scorriInFondoAllAvvio, scorrevole, scorsoInFondo, scorriInFondo]);
  // Misura nella finestra di un elemento del contenuto (tutorial) senza dipendere dallo stato dello scorrimento
  // nell'albero di Fabric, che dopo uno scorrimento programmato può restare indietro: posizione nel contenuto + posizione
  // dello ScrollView nella finestra − spostamento letto dagli eventi di scorrimento (src/core/tutorial/riquadro.ts).
  const misuraNellaFinestra = useCallback<MisuraNellaFinestra>(
    (vista, esito) => {
      const contenuto = scorrimento.current?.getInnerViewRef();
      const cornice = scorrimento.current?.getNativeScrollRef();
      if (!contenuto || !cornice) {
        esito(null);
        return;
      }
      vista.measureLayout(
        contenuto,
        (x, y, larghezza, altezza) => cornice.measureInWindow((sx, sy) => esito(riquadroDalContenuto({ x, y, larghezza, altezza }, { x: sx, y: sy }, posizione.value))),
        () => esito(null),
      );
    },
    [scorrimento, posizione],
  );
  useEffect(() => {
    if (!collegaMisura || !scorrevole) return;
    collegaMisura(misuraNellaFinestra);
    return () => collegaMisura(null);
  }, [collegaMisura, misuraNellaFinestra, scorrevole]);
  return (
    // Un tocco fuori dai campi, ovunque nella pagina (contenuto o piede), chiude il campo a fuoco e la tastiera.
    <ChiudiCampiAlTocco style={[stili.pagina, { backgroundColor: sfondo }]}>
      <View style={[stili.pagina, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        {scorrevole ? (
          <Reanimated.ScrollView
            ref={scorrimento}
            onScroll={segnaPosizione}
            scrollEventThrottle={16}
            style={stili.pagina}
            contentContainerStyle={stili.contenuto}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="none"
            onContentSizeChange={scorriInFondoAllAvvio && !scorsoInFondo ? scorriInFondo : undefined}
          >
            <FornitoreCampi value={campi}>{children}</FornitoreCampi>
            <Reanimated.View style={spazioTastiera} />
          </Reanimated.ScrollView>
        ) : (
          <View style={stili.contenuto}>{children}</View>
        )}
        {piede && <View onLayout={(e) => setAltezzaPiede(e.nativeEvent.layout.height)}>{piede}</View>}
      </View>
      {nelPortale ? null : sovrapposti}
    </ChiudiCampiAlTocco>
  );
}

// Lo scorrimento nativo si applica dopo qualche fotogramma: si misura dopo un breve ritardo (con misuraNellaFinestra,
// che legge lo spostamento dagli eventi di scorrimento).
const RITARDO_MISURA_MS = 150;
/** Due scorrimenti in fondo: subito e dopo che il contenuto ha avuto il tempo di completarsi. */
const RITARDI_SCORRIMENTO_MS = [0, 400];
/** Senza una misura del contenuto entro questo tempo si scorre comunque. */
const RITARDO_SCORRIMENTO_SENZA_MISURA_MS = 500;

const stili = StyleSheet.create({
  pagina: { flex: 1 },
  contenuto: { flexGrow: 1 },
});
