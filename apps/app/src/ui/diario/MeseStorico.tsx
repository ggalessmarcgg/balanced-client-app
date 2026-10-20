import { Pressable, StyleSheet, View } from 'react-native';

import { etichettaData } from '@/core/diario/data';
import { etichettaCondivise, etichettaMese, settimaneDelMese, type GiornoCalendario as Giorno, type Mese, type MeseCalendario, type StatoGiornoCalendario } from '@/core/diario/storico';
import type { Valutazione } from '@/core/diario/valutazione';
import { Testo } from '@/ui/Testo';
import { colori, opacita, raggio, spazio } from '@/ui/theme';
import { Vetro } from '@/ui/Vetro';

export type MeseStoricoProps = {
  mese: Mese;
  /** Calendario del mese; null finché il mese non è letto (si mostra la griglia con i numeri attenuati). */
  calendario: MeseCalendario | null;
  /** Tocco su un giorno condiviso: apre il pannello della giornata. */
  onApriGiorno?: (data: string) => void;
};

// Mese storico (Figma 477:1875): card con effetto vetro (lo stesso della Card settimana), padding 32, gap 24;
// intestazione (Heading "Ottobre 2026" + Body details al 60 % "6 giornate condivise", gap 2); una riga per settimana
// lunedì–domenica con i giorni allineati a sinistra, gap 4 tra i giorni e tra le righe, nessuna intestazione dei giorni.
/** Un mese dello storico. */
export function MeseStorico({ mese, calendario, onApriGiorno }: MeseStoricoProps) {
  const settimane = calendario?.settimane ?? settimaneDelMese(mese).map((s) => s.map((data) => ({ data, numero: Number(data.slice(8, 10)), stato: 'futuro' as const, condiviso: false, valutazione: null })));
  return (
    <Vetro style={stili.card}>
      <View style={stili.contenuto}>
        <View style={stili.intestazione}>
          <Testo stile="heading" accessibilityRole="header">
            {etichettaMese(mese)}
          </Testo>
          <Testo stile="bodyDetails" colore={colori.testo.secondario}>
            {calendario ? etichettaCondivise(calendario.condivise) : 'Caricamento…'}
          </Testo>
        </View>
        <View style={stili.settimane} accessibilityRole="list">
          {settimane.map((settimana, i) => (
            <View key={i} style={stili.settimana}>
              {settimana.map((g) => (
                <GiornoCalendario key={g.data} giorno={g} inAttesa={!calendario} onPress={onApriGiorno && g.condiviso ? () => onApriGiorno(g.data) : undefined} />
              ))}
            </View>
          ))}
        </View>
      </View>
    </Vetro>
  );
}

const DESCRIZIONE: Record<StatoGiornoCalendario, string> = { condiviso: 'condiviso', nonCondiviso: 'non condiviso', oggi: 'oggi', futuro: 'giorno futuro' };
const DESCRIZIONE_VALUTAZIONE: Record<Valutazione, string> = { approvata: 'approvata', daRivedere: 'da rivedere', inAttesa: 'in attesa di valutazione' };

// Giorno calendario (Figma 474:1326): cerchio 32 con il numero in Body details. Condiviso approvato: azione/primaria con
// testo su azione; da rivedere (710:7507): stato/da-rivedere con testo primario; in attesa (710:7509): sfondo/pagina con
// testo primario; non condiviso: solo testo al 60 %; oggi: badge/sfondo con testo primario; futuro: testo al 30 %.
const CERCHIO = 32;
type Aspetto = StatoGiornoCalendario | 'condivisoDaRivedere' | 'condivisoInAttesa';
const COLORE_NUMERO: Record<Aspetto, string> = {
  condiviso: colori.testo.suAzione,
  condivisoDaRivedere: colori.testo.primario,
  condivisoInAttesa: colori.testo.primario,
  nonCondiviso: colori.testo.secondario,
  oggi: colori.testo.primario,
  futuro: colori.testo.futuro,
};

export function GiornoCalendario({ giorno, inAttesa = false, onPress }: { giorno: Giorno; inAttesa?: boolean; onPress?: () => void }) {
  const { data, numero, stato, valutazione } = giorno;
  const aspetto: Aspetto = stato === 'condiviso' && valutazione === 'daRivedere' ? 'condivisoDaRivedere' : stato === 'condiviso' && valutazione === 'inAttesa' ? 'condivisoInAttesa' : stato;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      hitSlop={spazio[4] / 2}
      style={({ pressed }) => [stili.cerchio, stili[aspetto], pressed && stili.premuto]}
      accessible
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${etichettaData(data)}: ${inAttesa ? 'in caricamento' : DESCRIZIONE[stato]}${valutazione && !inAttesa ? `, ${DESCRIZIONE_VALUTAZIONE[valutazione]}` : ''}`}
      accessibilityHint={onPress ? 'Apre la giornata' : undefined}
    >
      <Testo stile="bodyDetails" colore={COLORE_NUMERO[aspetto]}>
        {numero}
      </Testo>
    </Pressable>
  );
}

const stili = StyleSheet.create({
  card: { alignSelf: 'stretch', borderRadius: raggio.card },
  contenuto: { alignSelf: 'stretch', padding: spazio[32], gap: spazio[24] },
  intestazione: { alignSelf: 'stretch', gap: spazio[2] },
  settimane: { alignSelf: 'stretch', gap: spazio[4] },
  settimana: { alignSelf: 'stretch', flexDirection: 'row', gap: spazio[4] },
  cerchio: { width: CERCHIO, height: CERCHIO, borderRadius: raggio.pieno, alignItems: 'center', justifyContent: 'center' },
  condiviso: { backgroundColor: colori.azione.primaria },
  condivisoDaRivedere: { backgroundColor: colori.stato.daRivedere },
  condivisoInAttesa: { backgroundColor: colori.sfondo.pagina },
  nonCondiviso: {},
  oggi: { backgroundColor: colori.badge.sfondo },
  futuro: {},
  premuto: { opacity: opacita.pulsantePremuto },
});
