import { Pressable, StyleSheet, View } from 'react-native';

import type { GiornoSettimana as Giorno, StatoGiorno } from '@/core/diario/settimana';
import { Icona } from '@/ui/icone';
import { Testo } from '@/ui/Testo';
import { colori, opacita, raggio, spazio, tocco } from '@/ui/theme';
import { Vetro } from '@/ui/Vetro';

export type CardSettimanaProps = {
  giorni: Giorno[];
  /** "Apri storico" (icona Calendario in alto a destra): arriva con il lotto 2; senza callback resta decorativa. */
  onApriStorico?: () => void;
};

// Card settimana (Figma 449:253): padding 32, gap 12, titolo centrato al 70 %, giorni 32 con gap 4 e 8 sopra; "Apri storico"
// è un'area 44 a 14 dal bordo alto e destro (295 = 353 − 44 − 14).
const DISTANZA_APRI_STORICO = 14;

/** Costanza della settimana: l'unica card con l'effetto vetro insieme alla barra di navigazione. */
export function CardSettimana({ giorni, onApriStorico }: CardSettimanaProps) {
  return (
    <Vetro style={stili.card}>
      <View style={stili.contenuto}>
        <Testo stile="heading" colore={colori.testo.attenuato} style={stili.titolo} accessibilityRole="header">
          Questa settimana
        </Testo>
        <View style={stili.settimana} accessibilityRole="list">
          {giorni.map((g) => (
            <GiornoSettimana key={g.data} iniziale={g.iniziale} stato={g.stato} data={g.data} />
          ))}
        </View>
      </View>
      {onApriStorico && (
        <Pressable onPress={onApriStorico} style={stili.apriStorico} accessibilityRole="button" accessibilityLabel="Apri lo storico delle giornate">
          <Icona misura={20} nome="Calendario" />
        </Pressable>
      )}
      {!onApriStorico && (
        <View style={stili.apriStorico} accessible={false} importantForAccessibility="no-hide-descendants">
          <Icona misura={20} nome="Calendario" />
        </View>
      )}
    </Vetro>
  );
}

const DESCRIZIONE_STATO: Record<StatoGiorno, string> = {
  condiviso: 'condiviso',
  oggi: 'oggi',
  futuro: 'giorno futuro',
  nonCondiviso: 'non condiviso',
};

// Giorno della settimana (Figma 439:112): cerchio 32 e lettera Caption. Oggi: cerchio badge/sfondo raggio 16 con alone
// sfumato dello stesso colore (sfocatura 6,4); non condiviso: trattino 8,89 × 1,78 al 30 %.
const CERCHIO = 32;
const TRATTINO = { larghezza: 8.89, altezza: 1.78 };
const SFOCATURA_OGGI = 6.4;

function GiornoSettimana({ iniziale, stato, data }: { iniziale: string; stato: StatoGiorno; data: string }) {
  const letteraPrimaria = stato === 'condiviso' || stato === 'oggi';
  return (
    <View style={stili.giorno} accessible accessibilityLabel={`${data}: ${DESCRIZIONE_STATO[stato]}`}>
      <View style={[stili.cerchio, stili[stato]]}>{stato === 'nonCondiviso' && <View style={stili.trattino} />}</View>
      <Testo stile="caption" colore={letteraPrimaria ? colori.testo.primario : colori.testo.terziario}>
        {iniziale}
      </Testo>
    </View>
  );
}

const stili = StyleSheet.create({
  card: { alignSelf: 'stretch', borderRadius: raggio.card },
  contenuto: { alignSelf: 'stretch', alignItems: 'center', padding: spazio[32], gap: spazio[12] },
  titolo: { alignSelf: 'stretch', textAlign: 'center' },
  settimana: { flexDirection: 'row', justifyContent: 'center', gap: spazio[4], paddingTop: spazio[8] },
  giorno: { alignItems: 'center', gap: spazio[4] },
  cerchio: { width: CERCHIO, height: CERCHIO, borderRadius: raggio.pieno, alignItems: 'center', justifyContent: 'center' },
  condiviso: { backgroundColor: colori.azione.primaria },
  oggi: {
    backgroundColor: colori.badge.sfondo,
    shadowColor: colori.badge.sfondo,
    shadowOpacity: 1,
    shadowRadius: SFOCATURA_OGGI,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  futuro: { backgroundColor: colori.sfondo.campo },
  nonCondiviso: {},
  trattino: { width: TRATTINO.larghezza, height: TRATTINO.altezza, borderRadius: raggio.pieno, backgroundColor: colori.testo.primario, opacity: opacita.trattinoOggi },
  apriStorico: {
    position: 'absolute',
    top: DISTANZA_APRI_STORICO,
    right: DISTANZA_APRI_STORICO,
    width: tocco.minimoIos,
    height: tocco.minimoIos,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
