import { Fragment, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import type { Notifica } from '@/core/notifiche/notifiche';
import { ErroreCaricamento } from '@/ui/ErroreCaricamento';
import { Intestazione } from '@/ui/Intestazione';
import { RigaElenco } from '@/ui/RigaElenco';
import { Pagina } from '@/ui/schermate/Pagina';
import { Segnaposto } from '@/ui/Segnaposto';
import { Separatore } from '@/ui/Separatore';
import { Testo } from '@/ui/Testo';
import { colori, margine, spazio } from '@/ui/theme';

export type SchermataNotificheProps = {
  fase: { tipo: 'caricamento' } | { tipo: 'rete' | 'errore'; onRiprova: () => void } | { tipo: 'pronto'; elenco: Notifica[] };
  onIndietro: () => void;
  /** Tocco su una riga con destinazione (le righe senza non sono toccabili). */
  onApri?: (notifica: Notifica) => void;
  sovrapposti?: ReactNode;
};

export const TESTI_NOTIFICHE = {
  titolo: 'Notifiche',
  periodo: 'Ultimi 7 giorni',
  vuoto: 'Nessuna notifica negli ultimi 7 giorni.',
  errore: 'Non riusciamo a caricare le tue notifiche. Riprova tra poco.',
} as const;

/**
 * Menu · 2 · Notifiche (Figma 508:2699): intestazione 12 sopra con Indietro e titolo; contenuto 16 sopra, margini 20,
 * "Ultimi 7 giorni" (Body details al 60 %), 8 di spazio e le righe Notifica (titolo, testo all'80 % su una riga, ora
 * al 50 % a destra) separate dal Separatore. Senza barra di navigazione: pagina a tutta altezza dal gruppo dell'abbonato.
 */
export function SchermataNotifiche({ fase, onIndietro, onApri, sovrapposti }: SchermataNotificheProps) {
  return (
    <Pagina sovrapposti={sovrapposti}>
      <View style={stili.intestazione}>
        <Intestazione titolo={TESTI_NOTIFICHE.titolo} onIndietro={onIndietro} />
      </View>
      <View style={stili.contenuto}>
        <Testo stile="bodyDetails" colore={colori.testo.secondario}>
          {TESTI_NOTIFICHE.periodo}
        </Testo>
        <View style={stili.spazio} />
        {fase.tipo === 'caricamento' ? (
          <View style={stili.segnaposti}>
            <Segnaposto altezza={72} />
            <Segnaposto altezza={72} />
            <Segnaposto altezza={72} />
          </View>
        ) : fase.tipo === 'pronto' ? (
          fase.elenco.length === 0 ? (
            <Testo stile="body" colore={colori.testo.corpoAttenuato} style={stili.vuoto}>
              {TESTI_NOTIFICHE.vuoto}
            </Testo>
          ) : (
            <View style={stili.elenco} accessibilityRole="list">
              {fase.elenco.map((n, i) => (
                <Fragment key={n.id}>
                  {i > 0 && <Separatore />}
                  <RigaElenco tipo="notifica" titolo={n.titolo} testo={n.testo} ora={n.ora} onPress={n.destinazione && onApri ? () => onApri(n) : undefined} />
                </Fragment>
              ))}
            </View>
          )
        ) : (
          <ErroreCaricamento descrizione={TESTI_NOTIFICHE.errore} onRiprova={fase.onRiprova} />
        )}
      </View>
    </Pagina>
  );
}

const stili = StyleSheet.create({
  intestazione: { paddingTop: spazio[12], paddingHorizontal: margine.pagina },
  contenuto: { flex: 1, paddingTop: spazio[16], paddingHorizontal: margine.pagina, paddingBottom: spazio[40] },
  spazio: { height: spazio[8] },
  elenco: { alignSelf: 'stretch' },
  segnaposti: { alignSelf: 'stretch', gap: spazio[12] },
  vuoto: { paddingVertical: spazio[14] },
});
