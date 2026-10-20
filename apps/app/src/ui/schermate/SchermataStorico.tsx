import { useCallback, useEffect, type ReactNode } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Mese, MeseCalendario } from '@/core/diario/storico';
import { ErroreCaricamento } from '@/ui/ErroreCaricamento';
import { Intestazione } from '@/ui/Intestazione';
import { MeseStorico } from '@/ui/diario/MeseStorico';
import { Pagina } from '@/ui/schermate/Pagina';
import { margine, spazio } from '@/ui/theme';

export type SchermataStoricoProps = {
  /** Dal mese corrente all'indietro. */
  mesi: Mese[];
  calendarioDi: (mese: Mese) => MeseCalendario | null;
  /** Un mese è entrato (o sta per entrare) nello schermo: chi la riceve lo legge se non è in memoria. */
  onMeseVisibile: (mese: Mese) => void;
  onApriGiorno: (data: string) => void;
  onIndietro: () => void;
  /** Errore nella lettura del primo diario: si mostra l'invito a riprovare sotto il mese corrente. */
  errore?: { tipo: 'rete' | 'errore'; onRiprova: () => void };
  /** Pannello della giornata, Notifica breve e altri elementi sopra la pagina. */
  sovrapposti?: ReactNode;
};

/**
 * Giornate · 6 · Storico delle giornate (Figma 475:1917): intestazione "Le tue condivisioni" (12 sopra, margini 20),
 * poi i mesi in card dal più recente (24 sopra, gap 12, 32 sotto). Nessuna barra di navigazione. La lista monta solo i
 * mesi vicini allo schermo: ogni mese chiede la propria lettura quando viene montato.
 */
export function SchermataStorico({ mesi, calendarioDi, onMeseVisibile, onApriGiorno, onIndietro, errore, sovrapposti }: SchermataStoricoProps) {
  const insets = useSafeAreaInsets();
  const renderMese = useCallback(
    ({ item }: { item: Mese }) => <MeseInLista mese={item} calendario={calendarioDi(item)} onVisibile={onMeseVisibile} onApriGiorno={onApriGiorno} />,
    [calendarioDi, onMeseVisibile, onApriGiorno],
  );
  return (
    <Pagina scorrevole={false} sovrapposti={sovrapposti}>
      <View style={stili.intestazione}>
        <Intestazione titolo="Le tue condivisioni" onIndietro={onIndietro} />
      </View>
      <FlatList
        data={mesi}
        keyExtractor={(mese) => mese}
        renderItem={renderMese}
        contentContainerStyle={[stili.contenuto, { paddingBottom: spazio[32] + insets.bottom }]}
        ItemSeparatorComponent={Separatore}
        windowSize={3}
        initialNumToRender={2}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={
          errore ? (
            <View style={stili.errore}>
              <ErroreCaricamento
                descrizione={errore.tipo === 'rete' ? 'Sei offline: non riusciamo a caricare i mesi precedenti. Controlla la connessione e riprova.' : 'Non riusciamo a caricare i mesi precedenti. Riprova tra poco.'}
                onRiprova={errore.onRiprova}
              />
            </View>
          ) : undefined
        }
      />
    </Pagina>
  );
}

function MeseInLista({ mese, calendario, onVisibile, onApriGiorno }: { mese: Mese; calendario: MeseCalendario | null; onVisibile: (mese: Mese) => void; onApriGiorno: (data: string) => void }) {
  useEffect(() => {
    onVisibile(mese);
  }, [mese, onVisibile]);
  return <MeseStorico mese={mese} calendario={calendario} onApriGiorno={onApriGiorno} />;
}

function Separatore() {
  return <View style={stili.separatore} />;
}

const stili = StyleSheet.create({
  intestazione: { paddingTop: spazio[12], paddingHorizontal: margine.pagina },
  contenuto: { paddingTop: spazio[24], paddingHorizontal: margine.pagina },
  separatore: { height: spazio[12] },
  errore: { paddingTop: spazio[24] },
});
