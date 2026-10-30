import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TESTI_PAGINE } from '@/core/primoAccesso/carosello';
import { CardDiario, SalutoDiario } from '@/ui/diario/CardDiario';
import { TitoloAccento } from '@/ui/schermate/TitoloAccento';
import { Testo } from '@/ui/Testo';
import { colori, margine, spazio, testi, type NomeStileTesto } from '@/ui/theme';
import { correzioneVerticale } from '@/ui/theme/testo-correzioni';

// Verifica del taglio dei testi (solo sviluppo): ogni stile con correzione verticale su un riquadro colorato
// (sfondo/campo = riquadro del Text, sfondo/card = contenitore). Un glifo tagliato finisce netto sul bordo del riquadro.
const FRASE = 'Ciao Giulia, Àgb?';
/** Stili con interlinea sotto l'altezza naturale del font (quelli in cui Testo allarga il riquadro). */
const STRETTI: NomeStileTesto[] = ['display', 'h1', 'accentoSerif', 'h1Accesso', 'accentoSerifAccesso'];

export default function Titoli() {
  const stili_ = Object.keys(correzioneVerticale) as NomeStileTesto[];
  return (
    <SafeAreaView style={s.pagina}>
      <ScrollView contentContainerStyle={s.contenuto}>
        <View style={s.cella}>
          <View style={s.riquadro}>
            <TitoloAccento prima="Ciao " accento="Giulia," />
          </View>
        </View>
        <View style={s.cella}>
          <View style={s.riquadro}>
            <TitoloAccento prima="Bentornata " accento="Giulia," />
          </View>
        </View>
        <View style={s.cella}>
          <View style={s.riquadro}>
            <TitoloAccento prima="Accedi al tuo " accento="percorso" contesto="accesso" />
          </View>
        </View>
        {/* Titolo a due righe: la conferma di Oggi nella Card diario (31/10/2026: su Android la "g" di "giornata!" era tagliata in
            basso, vedi il blocco "discendenti" più sotto e la nota in Testo.tsx). */}
        <CardDiario>
          <SalutoDiario prima="Hai " accento="condiviso " dopo="la giornata!" dataEtichetta="Venerdì 30 ottobre" />
        </CardDiario>
        {/* Discendenti sull'ultima riga negli stili con interlinea stretta (31/10/2026: su Android la "g" di "giornata!" era tagliata
            in basso; verifica con strumenti/profilo-g.mjs: l'occhiello intero finisce con una riga di pochi pixel, tagliato con la riga
            più larga; strumenti/discesa-g.mjs misura la discesa della prima "g" rispetto alla "i" che la segue). In fondo il
            titolo a due righe con l'accento serif come nella Card diario. */}
        {STRETTI.map((nome) => (
          <View key={`d-${nome}`} style={s.cella}>
            <Text style={s.nome}>{`discendenti · ${nome}`}</Text>
            <Testo stile={nome} style={s.riquadro}>
              {'giornata! gjpqy'}
            </Testo>
          </View>
        ))}
        <View style={s.cella}>
          <Text style={s.nome}>discendenti · TitoloAccento due righe</Text>
          <View style={[s.riquadro, s.stretto]}>
            <TitoloAccento prima="Hai " accento="condiviso " dopo="la giornata!" />
          </View>
        </View>
        {/* Titoli del carosello del primo accesso (step 6): la pagina 1 centrata in H1 Accesso, le altre in H1, larghezza del carosello (padding 32). */}
        {TESTI_PAGINE.map((t, i) => (
          <View key={i} style={[s.cella, s.cellaCarosello]}>
            <View style={s.riquadro}>
              <TitoloAccento prima={t.titolo.prima} accento={t.titolo.accento} dopo={t.titolo.dopo} contesto={i === 0 ? 'accesso' : 'app'} allineamento={i === 0 ? 'centro' : 'sinistra'} />
            </View>
          </View>
        ))}
        {stili_.map((nome) => (
          <View key={nome} style={s.cella}>
            <Text style={s.nome}>{`${nome} · ${testi[nome].fontSize}/${(testi[nome] as { lineHeight?: number }).lineHeight ?? '-'} · Δ ${((correzioneVerticale[nome] ?? 0) * 3).toFixed(0)}/3`}</Text>
            <Testo stile={nome} style={s.riquadro}>
              {FRASE}
            </Testo>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  pagina: { flex: 1, backgroundColor: colori.sfondo.pagina },
  contenuto: { padding: margine.pagina, gap: spazio[12] },
  cella: { backgroundColor: colori.sfondo.card, padding: spazio[8], gap: spazio[4], alignItems: 'flex-start' },
  stretto: { width: 200 },
  cellaCarosello: { paddingHorizontal: spazio[32] - margine.pagina, alignItems: 'stretch' },
  riquadro: { backgroundColor: colori.sfondo.foto },
  nome: { ...testi.caption, color: colori.testo.secondario },
});
