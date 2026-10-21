import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { grigliaContenuti, type Contenuto } from '@/core/contenuti/contenuti';
import { ErroreCaricamento } from '@/ui/ErroreCaricamento';
import { Icona } from '@/ui/icone';
import { Intestazione } from '@/ui/Intestazione';
import { Pagina } from '@/ui/schermate/Pagina';
import { Segnaposto } from '@/ui/Segnaposto';
import { Testo } from '@/ui/Testo';
import { colori, margine, opacita, raggio, spazio, type IconaPerMisura } from '@/ui/theme';

export type SchermataContenutiProps = {
  fase: { tipo: 'caricamento' } | { tipo: 'rete' | 'errore'; onRiprova: () => void } | { tipo: 'pronto'; contenuti: Contenuto[] };
  onIndietro: () => void;
  onApri: (contenuto: Contenuto) => void;
  sovrapposti?: ReactNode;
};

/** Icona 16 della categoria (componenti Figma "Icona / 16 / <categoria>"); le categorie nuove restano senza icona. */
const ICONE_CATEGORIE: Record<string, IconaPerMisura[16]> = {
  'Imparando la nutrizione': 'Imparando la nutrizione',
  'Integrando nuove abitudini': 'Integrando nuove abitudini',
  'Scelte più consapevoli': 'Scelte più consapevoli',
};

// Menu · 5 (Figma 520:2883): intestazione 12 sopra; contenuto 20 sopra, margini 20, gap 5, 40 sotto. Gruppi di
// quattro card (padding 20, raggio contenuto 20, gap 30 tra testi e icona): una larga, poi una alta a sinistra
// (icona in fondo) e due impilate a destra, colonne da (353 − 5) / 2.
const GAP_GRIGLIA = spazio[5];

export function SchermataContenuti({ fase, onIndietro, onApri, sovrapposti }: SchermataContenutiProps) {
  return (
    <Pagina scorrevole={false} sovrapposti={sovrapposti}>
      <View style={stili.intestazione}>
        <Intestazione titolo="Contenuti" onIndietro={onIndietro} />
      </View>
      <ScrollView style={stili.scorrimento} contentContainerStyle={stili.contenuto} showsVerticalScrollIndicator={false}>
        {fase.tipo === 'pronto' ? (
          grigliaContenuti(fase.contenuti).map((g) => (
            <View key={g.larga.id} style={stili.gruppo}>
              <CardContenuto contenuto={g.larga} onPress={onApri} />
              {(g.alta || g.colonna.length > 0) && (
                <View style={stili.riga}>
                  {g.alta && <CardContenuto contenuto={g.alta} alta onPress={onApri} />}
                  <View style={stili.colonna}>
                    {g.colonna.map((c) => (
                      <CardContenuto key={c.id} contenuto={c} onPress={onApri} />
                    ))}
                  </View>
                </View>
              )}
            </View>
          ))
        ) : fase.tipo === 'caricamento' ? (
          <View style={stili.gruppo}>
            <Segnaposto altezza={110} />
            <Segnaposto altezza={300} />
          </View>
        ) : (
          <View style={stili.errore}>
            <ErroreCaricamento
              descrizione={fase.tipo === 'rete' ? 'Sei offline: non riusciamo a caricare i contenuti. Controlla la connessione e riprova.' : 'Non riusciamo a caricare i contenuti. Riprova tra poco.'}
              onRiprova={fase.onRiprova}
            />
          </View>
        )}
      </ScrollView>
    </Pagina>
  );
}

function CardContenuto({ contenuto, alta = false, onPress }: { contenuto: Contenuto; alta?: boolean; onPress: (c: Contenuto) => void }) {
  const icona = ICONE_CATEGORIE[contenuto.categoria];
  return (
    <Pressable onPress={() => onPress(contenuto)} accessibilityRole="button" accessibilityLabel={`${contenuto.titolo}, ${contenuto.categoria}`} style={({ pressed }) => [stili.card, alta && stili.cardAlta, pressed && stili.premuta]}>
      <View style={stili.testi}>
        <Testo stile="etichetta">{contenuto.titolo}</Testo>
        <Testo stile="bodyDetails">{contenuto.categoria}</Testo>
      </View>
      {icona && (
        <View style={stili.icona}>
          <Icona misura={16} nome={icona} />
        </View>
      )}
    </Pressable>
  );
}

const stili = StyleSheet.create({
  intestazione: { paddingTop: spazio[12], paddingHorizontal: margine.pagina },
  scorrimento: { flex: 1 },
  contenuto: { paddingTop: spazio[20], paddingHorizontal: margine.pagina, paddingBottom: spazio[40], gap: GAP_GRIGLIA },
  gruppo: { alignSelf: 'stretch', gap: GAP_GRIGLIA },
  riga: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'stretch', gap: GAP_GRIGLIA },
  colonna: { flex: 1, gap: GAP_GRIGLIA },
  card: { padding: spazio[20], gap: spazio[30], backgroundColor: colori.sfondo.card, borderRadius: raggio.contenuto },
  cardAlta: { flex: 1, justifyContent: 'space-between' },
  premuta: { opacity: opacita.pulsantePremuto },
  testi: { gap: spazio[2] },
  icona: { width: 16, height: 16 },
  errore: { paddingTop: spazio[24] },
});
