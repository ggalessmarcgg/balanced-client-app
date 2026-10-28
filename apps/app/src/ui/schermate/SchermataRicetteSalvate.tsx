import { Fragment, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { TESTI_RICETTE_SALVATE, type RicettaSalvata } from '@/core/ricette/salvate';
import { sottotitoloElenco } from '@/core/ricette/tempo';
import { AvvisoConnessione } from '@/ui/AvvisoConnessione';
import { ErroreCaricamento } from '@/ui/ErroreCaricamento';
import { Intestazione } from '@/ui/Intestazione';
import { RigaElenco } from '@/ui/RigaElenco';
import { Pagina } from '@/ui/schermate/Pagina';
import { Segnaposto } from '@/ui/Segnaposto';
import { Separatore } from '@/ui/Separatore';
import { Testo } from '@/ui/Testo';
import { colori, margine, raggio, spazio } from '@/ui/theme';

export type SchermataRicetteSalvateProps = {
  fase: { tipo: 'caricamento' } | { tipo: 'rete' | 'errore'; onRiprova: () => void } | { tipo: 'pronto'; ricette: RicettaSalvata[]; daCache: boolean };
  onIndietro: () => void;
  onApri: (ricetta: RicettaSalvata) => void;
  sovrapposti?: ReactNode;
};

/**
 * Menu · 7 · Le tue ricette (Figma 539:3724) e 7.1 vuoto (539:3777): intestazione con titolo (12 sopra), contenuto 20
 * sopra, margini 20: righe a due righe (titolo in Etichetta piccola, "pasto · tempo" in Body details secondario) con il
 * Separatore, dalla più recente; senza ricette la card sfondo/card (padding 32, gap 16) con Etichetta e Body details attenuato.
 */
export function SchermataRicetteSalvate({ fase, onIndietro, onApri, sovrapposti }: SchermataRicetteSalvateProps) {
  return (
    <Pagina scorrevole={false} sovrapposti={sovrapposti}>
      <View style={stili.intestazione}>
        <Intestazione titolo={TESTI_RICETTE_SALVATE.titolo} onIndietro={onIndietro} />
      </View>
      <ScrollView style={stili.scorrimento} contentContainerStyle={stili.contenuto} showsVerticalScrollIndicator={false}>
        {fase.tipo === 'pronto' ? (
          <>
            {fase.daCache && <AvvisoConnessione posizione="nelContenuto" />}
            {fase.ricette.length === 0 ? (
              <View style={stili.vuoto} accessibilityLiveRegion="polite">
                <Testo stile="etichetta" accessibilityRole="header">
                  {TESTI_RICETTE_SALVATE.vuoto.titolo}
                </Testo>
                <Testo stile="bodyDetails" colore={colori.testo.attenuato}>
                  {TESTI_RICETTE_SALVATE.vuoto.testo}
                </Testo>
              </View>
            ) : (
              <View style={stili.elenco}>
                {fase.ricette.map((r, i) => (
                  <Fragment key={r.id}>
                    {i > 0 && <Separatore />}
                    <RigaElenco tipo="dueRighe" titolo={r.ricetta.titolo} sottotitolo={sottotitoloElenco(r.pasto, r.ricetta.tempoMinuti)} onPress={() => onApri(r)} />
                  </Fragment>
                ))}
              </View>
            )}
          </>
        ) : fase.tipo === 'caricamento' ? (
          <View style={stili.caricamento}>
            <Segnaposto righe={[220, 100]} />
            <Segnaposto righe={[180, 100]} />
            <Segnaposto righe={[200, 100]} />
          </View>
        ) : (
          <View style={stili.errore}>
            <ErroreCaricamento
              descrizione={fase.tipo === 'rete' ? 'Sei offline: non riusciamo a caricare le tue ricette. Controlla la connessione e riprova.' : 'Non riusciamo a caricare le tue ricette. Riprova tra poco.'}
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
  contenuto: { paddingTop: spazio[20], paddingHorizontal: margine.pagina, paddingBottom: spazio[40], gap: spazio[16] },
  elenco: { alignSelf: 'stretch' },
  vuoto: { alignSelf: 'stretch', padding: spazio[32], gap: spazio[16], borderRadius: raggio.card, backgroundColor: colori.sfondo.card },
  caricamento: { alignSelf: 'stretch', gap: spazio[8] },
  errore: { paddingTop: spazio[24] },
});
