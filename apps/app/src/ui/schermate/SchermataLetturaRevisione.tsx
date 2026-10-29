import { useCallback, useRef, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import { etichettaData } from '@/core/diario/data';
import type { AutoreRevisione } from '@/core/revisioni/autore';
import { titoloRevisione } from '@/core/revisioni/stato';
import type { BloccoTesto, TestoRevisione } from '@/core/revisioni/testo';
import { ErroreCaricamento } from '@/ui/ErroreCaricamento';
import { FotoProfilo } from '@/ui/FotoProfilo';
import { Intestazione } from '@/ui/Intestazione';
import { Pagina } from '@/ui/schermate/Pagina';
import { Segnaposto } from '@/ui/Segnaposto';
import { Testo } from '@/ui/Testo';
import { colori, margine, spazio } from '@/ui/theme';
import { PROPRIETA_SCORRIMENTO } from '@/ui/scorrimento';

export type SchermataLetturaRevisioneProps = {
  /** null finché la revisione non è nota (rotta diretta a freddo): intestazione senza titolo. */
  numero: number | null;
  fase:
    | { tipo: 'caricamento' }
    | { tipo: 'rete' | 'errore'; onRiprova: () => void }
    | { tipo: 'pronto'; data: string | null; autore: AutoreRevisione | null; testo: TestoRevisione };
  onIndietro: () => void;
  /** Il piè di pagina "Hai letto tutta la revisione." è entrato nello schermo (regola del letto). */
  onFondoRaggiunto?: () => void;
  sovrapposti?: ReactNode;
};

export const PIE_DI_PAGINA = 'Hai letto tutta la revisione.';
const FOTO = 40;
/** Tolleranza in punti sul fondo (arrotondamenti dello scorrimento). */
const TOLLERANZA_FONDO = 2;

/**
 * Lettura della revisione (Figma 494:2487): intestazione "Revisione 13" (12 sopra, margini 20), poi 24 sopra,
 * autrice (foto 40, nome Etichetta, data Body details al 60 %, gap 8), le sezioni (Heading + Body, gap 8) con gap 24,
 * piè di pagina Body details al 50 % centrato, 40 sotto. Nessuna barra di navigazione e nessun pulsante: il letto
 * scatta da solo quando il piè di pagina è stato raggiunto e il tempo minimo è passato.
 */
export function SchermataLetturaRevisione({ numero, fase, onIndietro, onFondoRaggiunto, sovrapposti }: SchermataLetturaRevisioneProps) {
  const altezze = useRef({ contenuto: 0, finestra: 0 });
  const fondo = useRef(false);
  const segnalaFondo = useCallback(() => {
    if (fondo.current) return;
    fondo.current = true;
    onFondoRaggiunto?.();
  }, [onFondoRaggiunto]);
  const verifica = useCallback(
    (scorrimentoY: number) => {
      const { contenuto, finestra } = altezze.current;
      if (fase.tipo !== 'pronto' || contenuto === 0 || finestra === 0) return;
      if (scorrimentoY + finestra >= contenuto - TOLLERANZA_FONDO) segnalaFondo();
    },
    [fase.tipo, segnalaFondo],
  );
  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => verifica(e.nativeEvent.contentOffset.y), [verifica]);
  const onContentSizeChange = useCallback(
    (_w: number, h: number) => {
      altezze.current.contenuto = h;
      verifica(0); // testo breve: il piè di pagina è già nello schermo senza scorrere
    },
    [verifica],
  );
  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      altezze.current.finestra = e.nativeEvent.layout.height;
      verifica(0);
    },
    [verifica],
  );

  return (
    <Pagina scorrevole={false} sovrapposti={sovrapposti}>
      <View style={stili.intestazione}>
        <Intestazione titolo={numero === null ? undefined : titoloRevisione(numero)} onIndietro={onIndietro} />
      </View>
      <ScrollView {...PROPRIETA_SCORRIMENTO} style={stili.scorrimento} contentContainerStyle={stili.contenuto} onScroll={onScroll} scrollEventThrottle={64} onContentSizeChange={onContentSizeChange} onLayout={onLayout} showsVerticalScrollIndicator={false}>
        {fase.tipo === 'pronto' ? (
          <>
            <View style={stili.autore} accessible accessibilityLabel={[fase.autore?.nome, fase.data ? etichettaData(fase.data) : null].filter(Boolean).join(', ')}>
              <FotoProfilo misura={FOTO} foto={fase.autore?.foto} iniziali={fase.autore?.iniziali} fotoPronta={fase.autore?.fotoPronta} />
              <View style={stili.testiAutore}>
                {fase.autore && (
                  <Testo stile="etichetta" numberOfLines={1}>
                    {fase.autore.nome}
                  </Testo>
                )}
                {fase.data && (
                  <Testo stile="bodyDetails" colore={colori.testo.secondario}>
                    {etichettaData(fase.data)}
                  </Testo>
                )}
              </View>
            </View>
            {fase.testo.sezioni.map((s) => (
              <View key={s.chiave} style={stili.sezione}>
                <Testo stile="heading" accessibilityRole="header">
                  {s.etichetta}
                </Testo>
                {s.blocchi.map((b, i) => (
                  <Blocco key={i} blocco={b} />
                ))}
              </View>
            ))}
            <Testo stile="bodyDetails" colore={colori.testo.terziario} style={stili.pie}>
              {PIE_DI_PAGINA}
            </Testo>
          </>
        ) : fase.tipo === 'caricamento' ? (
          <View style={stili.segnaposti}>
            <Segnaposto altezza={40} righe={[]} />
            <Segnaposto altezza={140} />
            <Segnaposto altezza={140} />
          </View>
        ) : (
          <View style={stili.errore}>
            <ErroreCaricamento
              descrizione={fase.tipo === 'rete' ? 'Sei offline: non riusciamo a caricare la revisione. Controlla la connessione e riprova.' : 'Non riusciamo a caricare la revisione. Riprova tra poco.'}
              onRiprova={fase.onRiprova}
            />
          </View>
        )}
      </ScrollView>
    </Pagina>
  );
}

const PUNTO = '•';

/** Un paragrafo (a capo preservati) o un elenco puntato con rientro sporgente. */
function Blocco({ blocco }: { blocco: BloccoTesto }) {
  if (blocco.tipo === 'paragrafo') return <Testo stile="body">{blocco.testo}</Testo>;
  return (
    <View style={stili.elenco} accessibilityRole="list">
      {blocco.voci.map((voce, i) => (
        <View key={i} style={stili.voce}>
          <Testo stile="body" style={stili.punto}>
            {PUNTO}
          </Testo>
          <Testo stile="body" style={stili.testoVoce}>
            {voce}
          </Testo>
        </View>
      ))}
    </View>
  );
}

const stili = StyleSheet.create({
  intestazione: { paddingTop: spazio[12], paddingHorizontal: margine.pagina },
  scorrimento: { flex: 1 },
  contenuto: { paddingTop: spazio[24], paddingHorizontal: margine.pagina, paddingBottom: spazio[40], gap: spazio[24] },
  autore: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: spazio[8] },
  testiAutore: { flex: 1 },
  sezione: { alignSelf: 'stretch', gap: spazio[8] },
  elenco: { alignSelf: 'stretch', gap: spazio[4] },
  voce: { alignSelf: 'stretch', flexDirection: 'row', gap: spazio[8] },
  punto: { width: spazio[12] },
  testoVoce: { flex: 1 },
  pie: { alignSelf: 'stretch', textAlign: 'center' },
  segnaposti: { gap: spazio[12] },
  errore: { paddingTop: spazio[24] },
});
