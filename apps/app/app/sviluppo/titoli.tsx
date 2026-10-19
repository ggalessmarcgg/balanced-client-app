import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TitoloAccento } from '@/ui/schermate/TitoloAccento';
import { Testo } from '@/ui/Testo';
import { colori, margine, spazio, testi, type NomeStileTesto } from '@/ui/theme';
import { correzioneVerticale } from '@/ui/theme/testo-correzioni';

// Verifica del taglio dei testi (solo sviluppo): ogni stile con correzione verticale su un riquadro colorato
// (sfondo/campo = riquadro del Text, sfondo/card = contenitore). Un glifo tagliato finisce netto sul bordo del riquadro.
const FRASE = 'Ciao Giulia, Àgb?';

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
  riquadro: { backgroundColor: colori.sfondo.foto },
  nome: { ...testi.caption, color: colori.testo.secondario },
});
