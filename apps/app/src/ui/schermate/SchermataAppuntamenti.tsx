import { Fragment, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { etichettaPassato, type Visita } from '@/core/appuntamenti/appuntamenti';
import { ContenutoAppuntamento, type NutrizionistaAppuntamento } from '@/ui/appuntamenti/CardAppuntamento';
import { ErroreCaricamento } from '@/ui/ErroreCaricamento';
import { Intestazione } from '@/ui/Intestazione';
import { CardSezione } from '@/ui/menu/CardSezione';
import { Pulsante } from '@/ui/Pulsante';
import { RigaElenco } from '@/ui/RigaElenco';
import { Pagina } from '@/ui/schermate/Pagina';
import { Segnaposto } from '@/ui/Segnaposto';
import { Separatore } from '@/ui/Separatore';
import { Testo } from '@/ui/Testo';
import { colori, margine, spazio } from '@/ui/theme';
import { PROPRIETA_SCORRIMENTO } from '@/ui/scorrimento';

export type { NutrizionistaAppuntamento } from '@/ui/appuntamenti/CardAppuntamento';

export type SchermataAppuntamentiProps = {
  fase: { tipo: 'caricamento' } | { tipo: 'rete' | 'errore'; onRiprova: () => void } | { tipo: 'pronto'; prossimo: Visita | null; passati: Visita[]; adesso: Date };
  nutrizionista: NutrizionistaAppuntamento | null;
  onIndietro: () => void;
  /** "Entra": apre il link della videochiamata (solo se esiste). */
  onEntra?: (link: string) => void;
  /** "Gestisci appuntamento": copia il numero WhatsApp del supporto. */
  onGestisci?: () => void;
  sovrapposti?: ReactNode;
};

// Menu · 4 (Figma 517:2616): intestazione 12 sopra; contenuto 24 sopra, margini 20, gap 12. Card appuntamento padding
// 32 gap 12 (contenuto in ui/appuntamenti/CardAppuntamento.tsx, condiviso con lo stato F). 4.2: "Nessuna visita in
// programma al momento." e primario disabilitato.
export function SchermataAppuntamenti({ fase, nutrizionista, onIndietro, onEntra, onGestisci, sovrapposti }: SchermataAppuntamentiProps) {
  return (
    <Pagina scorrevole={false} sovrapposti={sovrapposti}>
      <View style={stili.intestazione}>
        <Intestazione titolo="Appuntamenti" onIndietro={onIndietro} />
      </View>
      <ScrollView {...PROPRIETA_SCORRIMENTO} style={stili.scorrimento} contentContainerStyle={stili.contenuto} showsVerticalScrollIndicator={false}>
        {fase.tipo === 'pronto' ? (
          <>
            <CardSezione titolo="Prossimo appuntamento">
              {fase.prossimo ? (
                <ContenutoAppuntamento visita={fase.prossimo} adesso={fase.adesso} nutrizionista={nutrizionista} onEntra={onEntra} onGestisci={onGestisci} />
              ) : (
                <>
                  <Testo stile="bodyDetails" colore={colori.testo.secondario}>
                    Nessuna visita in programma al momento.
                  </Testo>
                  <Pulsante etichetta="Prenota una consulenza" stato="disabilitato" />
                </>
              )}
            </CardSezione>
            {fase.passati.length > 0 && (
              <CardSezione titolo="Appuntamenti passati">
                <View style={stili.elenco} accessibilityRole="list">
                  {fase.passati.map((v, i) => (
                    <Fragment key={v.id}>
                      {i > 0 && <Separatore />}
                      <RigaElenco tipo="valore" etichetta={etichettaPassato(v)} valore="" />
                    </Fragment>
                  ))}
                </View>
              </CardSezione>
            )}
          </>
        ) : fase.tipo === 'caricamento' ? (
          <>
            <Segnaposto altezza={300} />
            <Segnaposto altezza={200} />
          </>
        ) : (
          <View style={stili.errore}>
            <ErroreCaricamento
              descrizione={fase.tipo === 'rete' ? 'Sei offline: non riusciamo a caricare gli appuntamenti. Controlla la connessione e riprova.' : 'Non riusciamo a caricare gli appuntamenti. Riprova tra poco.'}
              onRiprova={fase.onRiprova}
            />
          </View>
        )}
      </ScrollView>
    </Pagina>
  );
}

const stili = StyleSheet.create({
  intestazione: { paddingTop: spazio[12], paddingHorizontal: margine.pagina },
  scorrimento: { flex: 1 },
  contenuto: { paddingTop: spazio[24], paddingHorizontal: margine.pagina, paddingBottom: spazio[40], gap: spazio[12] },
  elenco: { alignSelf: 'stretch' },
  errore: { paddingTop: spazio[24] },
});
