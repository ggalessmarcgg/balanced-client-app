import { Pressable, StyleSheet, View } from 'react-native';

import { etichettaData } from '@/core/diario/data';
import type { GiornoSettimana as Giorno, StatoGiorno } from '@/core/diario/settimana';
import { Icona } from '@/ui/icone';
import { Testo } from '@/ui/Testo';
import { colori, opacita, raggio, spazio, tocco } from '@/ui/theme';
import { Vetro } from '@/ui/Vetro';

export type CardSettimanaProps = {
  giorni: Giorno[];
  /** Tocco su un giorno condiviso: apre il pannello della giornata. I giorni non condivisi non aprono nulla. */
  onApriGiorno?: (data: string) => void;
  /** "Apri storico" (icona Calendario in alto a destra): arriva con il lotto 3; senza callback resta decorativa. */
  onApriStorico?: () => void;
};

// Card settimana (Figma 449:253): padding 32, gap 12, titolo centrato al 70 %, giorni 32 con gap 4 e 8 sopra; "Apri storico"
// è un'area 44 a 14 dal bordo alto e destro (295 = 353 − 44 − 14).
const DISTANZA_APRI_STORICO = 14;

/** Costanza della settimana: l'unica card con l'effetto vetro insieme alla barra di navigazione. */
export function CardSettimana({ giorni, onApriGiorno, onApriStorico }: CardSettimanaProps) {
  return (
    <Vetro style={stili.card}>
      <View style={stili.contenuto}>
        <Testo stile="heading" colore={colori.testo.attenuato} style={stili.titolo} accessibilityRole="header">
          Questa settimana
        </Testo>
        <View style={stili.settimana} accessibilityRole="list">
          {giorni.map((g) => (
            <GiornoSettimana key={g.data} giorno={g} onPress={onApriGiorno && g.condiviso ? () => onApriGiorno(g.data) : undefined} />
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
  condivisoDaLeggere: 'condiviso, commento da leggere',
  condivisoLetto: 'condiviso, commento letto',
  oggi: 'oggi',
  futuro: 'giorno futuro',
  nonCondiviso: 'non condiviso',
};

// Giorno della settimana (Figma 439:112): cerchio 32 e lettera Caption. Oggi: cerchio badge/sfondo raggio 16 con alone
// sfumato dello stesso colore (sfocatura 6,4); non condiviso: trattino 8,89 × 1,78 al 30 %. Con commento (474:169, 474:173):
// pallino in alto a destra che sporge di 3 dal cerchio, con bordo bianco 2: rosso (stato/notifica) da 14 se da leggere,
// verde scuro da 12 se letto.
const CERCHIO = 32;
const TRATTINO = { larghezza: 8.89, altezza: 1.78 };
const SFOCATURA_OGGI = 6.4;
const PALLINO = { daLeggere: 14, letto: 12, bordo: 2, sporgenza: 3 };

function GiornoSettimana({ giorno, onPress }: { giorno: Giorno; onPress?: () => void }) {
  const { iniziale, stato, data, commento } = giorno;
  const letteraPrimaria = stato !== 'nonCondiviso' && stato !== 'futuro';
  const cerchio = stato === 'condivisoDaLeggere' || stato === 'condivisoLetto' ? 'condiviso' : stato;
  const pallino = stato === 'condivisoDaLeggere' ? 'daLeggere' : stato === 'condivisoLetto' ? 'letto' : null;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      hitSlop={spazio[4] / 2}
      style={({ pressed }) => [stili.giorno, pressed && stili.premuto]}
      accessible
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${etichettaData(data)}: ${DESCRIZIONE_STATO[stato]}${stato === 'oggi' && commento === 'daLeggere' ? ', commento da leggere' : ''}`}
      accessibilityHint={onPress ? 'Apre la giornata' : undefined}
    >
      <View style={[stili.cerchio, stili[cerchio]]}>
        {stato === 'nonCondiviso' && <View style={stili.trattino} />}
        {pallino && <View style={[stili.pallino, pallino === 'daLeggere' ? stili.pallinoDaLeggere : stili.pallinoLetto]} />}
      </View>
      <Testo stile="caption" colore={letteraPrimaria ? colori.testo.primario : colori.testo.terziario}>
        {iniziale}
      </Testo>
    </Pressable>
  );
}

const stili = StyleSheet.create({
  card: { alignSelf: 'stretch', borderRadius: raggio.card },
  contenuto: { alignSelf: 'stretch', alignItems: 'center', padding: spazio[32], gap: spazio[12] },
  titolo: { alignSelf: 'stretch', textAlign: 'center' },
  settimana: { flexDirection: 'row', justifyContent: 'center', gap: spazio[4], paddingTop: spazio[8] },
  giorno: { alignItems: 'center', gap: spazio[4] },
  premuto: { opacity: opacita.pulsantePremuto },
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
  pallino: { position: 'absolute', top: -PALLINO.sporgenza, right: -PALLINO.sporgenza, borderRadius: raggio.pieno, borderWidth: PALLINO.bordo, borderColor: colori.sfondo.pagina },
  pallinoDaLeggere: { width: PALLINO.daLeggere, height: PALLINO.daLeggere, backgroundColor: colori.stato.notifica },
  pallinoLetto: { width: PALLINO.letto, height: PALLINO.letto, backgroundColor: colori.azione.primaria },
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
