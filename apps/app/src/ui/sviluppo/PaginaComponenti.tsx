import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icona } from '@/ui/icone';
import { COMPONENTI, RiquadroVariante, variantiDi, type NomeComponente } from '@/ui/sviluppo/VariantiComponenti';
import { Testo } from '@/ui/Testo';
import {
  colori,
  descrizioniTesti,
  icone,
  margine,
  misuraIcona,
  raggio,
  spazio,
  testi,
  tocco,
  type ChiaveIcona,
  type MisuraIcona,
  type NomeStileTesto,
} from '@/ui/theme';

// Pagina dei componenti: solo nelle versioni di sviluppo (rotta protetta da __DEV__ in app/_layout.tsx).
// Mostra palette, scala degli spazi e dei raggi, stili di testo e tutte le icone, con i valori dai token.

const SEZIONI = ['Colori', 'Misure', 'Testi', 'Icone', ...COMPONENTI] as const;
type Sezione = (typeof SEZIONI)[number];

const FRASE = 'Ciao Alessandro, ci siamo quasi';

export function PaginaComponenti({ sezioneIniziale }: { sezioneIniziale?: string }) {
  const iniziale = SEZIONI.find((s) => s.toLowerCase() === sezioneIniziale?.toLowerCase()) ?? 'Colori';
  const [sezione, setSezione] = useState<Sezione>(iniziale);
  return (
    <SafeAreaView style={stili.pagina} edges={['top', 'bottom']}>
      <Text style={stili.titolo}>Componenti</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={stili.selettoreScorrevole} contentContainerStyle={stili.selettore} accessibilityRole="tablist">
        {SEZIONI.map((s) => {
          const attiva = s === sezione;
          return (
            <Pressable
              key={s}
              onPress={() => setSezione(s)}
              accessibilityRole="tab"
              accessibilityState={{ selected: attiva }}
              style={[stili.scheda, attiva && stili.schedaAttiva]}
            >
              <Text style={[stili.schedaTesto, attiva && stili.schedaTestoAttiva]}>{s}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <ScrollView contentContainerStyle={stili.contenuto}>
        {sezione === 'Colori' && <SezioneColori />}
        {sezione === 'Misure' && <SezioneMisure />}
        {sezione === 'Testi' && <SezioneTesti />}
        {sezione === 'Icone' && <SezioneIcone />}
        {(COMPONENTI as readonly string[]).includes(sezione) && <SezioneComponente nome={sezione as NomeComponente} />}
      </ScrollView>
    </SafeAreaView>
  );
}

function Intestazione({ children }: { children: string }) {
  return <Text style={stili.intestazione}>{children}</Text>;
}

function Didascalia({ children }: { children: string }) {
  return <Text style={stili.didascalia}>{children}</Text>;
}

function SezioneColori() {
  const gruppi = Object.entries(colori) as [string, Record<string, string> | string][];
  return (
    <View style={stili.blocco}>
      {gruppi.map(([gruppo, voci]) => {
        const righe = typeof voci === 'string' ? [[gruppo, voci] as const] : Object.entries(voci);
        return (
          <View key={gruppo} style={stili.gruppo}>
            <Intestazione>{gruppo}</Intestazione>
            <View style={stili.griglia}>
              {righe.map(([nome, valore]) => (
                <View key={nome} style={stili.campione}>
                  <View style={[stili.campioneColore, { backgroundColor: valore }]} />
                  <Text style={stili.campioneNome}>{nome}</Text>
                  <Didascalia>{valore}</Didascalia>
                </View>
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function SezioneMisure() {
  const spazi = Object.entries(spazio).map(([k, v]) => [k, v] as const);
  const raggi = Object.entries(raggio);
  const icone_ = Object.entries(misuraIcona);
  return (
    <View style={stili.blocco}>
      <View style={stili.gruppo}>
        <Intestazione>Spazi</Intestazione>
        {spazi.map(([nome, valore]) => (
          <View key={nome} style={stili.rigaMisura}>
            <Text style={stili.etichettaMisura}>spazio/{nome}</Text>
            <View style={[stili.barra, { width: valore * 4, height: spazio[8] }]} />
            <Didascalia>{`${valore}`}</Didascalia>
          </View>
        ))}
        <View style={stili.rigaMisura}>
          <Text style={stili.etichettaMisura}>margine/pagina</Text>
          <View style={[stili.barra, { width: margine.pagina * 4, height: spazio[8] }]} />
          <Didascalia>{`${margine.pagina}`}</Didascalia>
        </View>
      </View>
      <View style={stili.gruppo}>
        <Intestazione>Raggi</Intestazione>
        <View style={stili.griglia}>
          {raggi.map(([nome, valore]) => (
            <View key={nome} style={stili.campione}>
              <View style={[stili.scatolaRaggio, { borderRadius: valore }]} />
              <Text style={stili.campioneNome}>raggio/{nome}</Text>
              <Didascalia>{`${valore}`}</Didascalia>
            </View>
          ))}
        </View>
      </View>
      <View style={stili.gruppo}>
        <Intestazione>Icone e aree toccabili</Intestazione>
        <View style={stili.griglia}>
          {icone_.map(([nome, valore]) => (
            <View key={nome} style={stili.campione}>
              <View style={[stili.scatolaMisura, { width: valore, height: valore }]} />
              <Text style={stili.campioneNome}>icona/{nome}</Text>
            </View>
          ))}
          <View style={stili.campione}>
            <View style={[stili.scatolaTocco, { width: tocco.minimoIos, height: tocco.minimoIos }]} />
            <Text style={stili.campioneNome}>tocco/minimo-ios</Text>
            <Didascalia>{`${tocco.minimoIos}`}</Didascalia>
          </View>
          <View style={stili.campione}>
            <View style={[stili.scatolaTocco, { width: tocco.minimoAndroid, height: tocco.minimoAndroid }]} />
            <Text style={stili.campioneNome}>tocco/minimo-android</Text>
            <Didascalia>{`${tocco.minimoAndroid}`}</Didascalia>
          </View>
        </View>
      </View>
    </View>
  );
}

function SezioneTesti() {
  const nomi = Object.keys(testi) as NomeStileTesto[];
  return (
    <View style={stili.blocco}>
      {nomi.map((nome) => {
        const d = descrizioniTesti[nome];
        const s = testi[nome];
        return (
          <View key={nome} style={stili.gruppo}>
            <Testo stile={nome}>{FRASE}</Testo>
            <Didascalia>{`${d.figma} · ${d.font} · ${s.fontSize} · interlinea ${d.interlinea} · spaziatura ${d.spaziatura}`}</Didascalia>
          </View>
        );
      })}
    </View>
  );
}

// Varianti di un componente del lotto 2 (catalogo in VariantiComponenti.tsx), con nome della variante e
// nodo Figma del set. Le righe elenco stanno su una card crema come nelle schermate.
function SezioneComponente({ nome }: { nome: NomeComponente }) {
  const gruppo = variantiDi(nome);
  return (
    <View style={stili.blocco}>
      <Didascalia>{`Figma ${gruppo.figma} · ${gruppo.varianti.length} varianti`}</Didascalia>
      {gruppo.varianti.map((v) => (
        <View key={v.nome} style={stili.gruppo}>
          <Text style={stili.campioneNome}>{v.nome}</Text>
          <RiquadroVariante variante={v} suCard={nome === 'Riga elenco' || nome === 'Separatore' || nome === 'Notifica breve'} />
        </View>
      ))}
    </View>
  );
}

function SezioneIcone() {
  const voci = Object.entries(icone) as [ChiaveIcona, (typeof icone)[ChiaveIcona]][];
  const misure = [...new Set(voci.map(([, v]) => v.misura))].sort((a, b) => a - b) as MisuraIcona[];
  return (
    <View style={stili.blocco}>
      {misure.map((m) => (
        <View key={m} style={stili.gruppo}>
          <Intestazione>{`Icona / ${m}`}</Intestazione>
          <View style={stili.griglia}>
            {voci
              .filter(([, v]) => v.misura === m)
              .map(([chiave, v]) => (
                <View key={chiave} style={stili.cellaIcona}>
                  <View style={stili.cellaIconaDisegno}>
                    {/* La chiave è già validata dalla mappa: cast per il tipo generico. */}
                    <Icona misura={v.misura as 24} nome={v.nome as never} />
                  </View>
                  <Text style={stili.cellaIconaNome} numberOfLines={2}>
                    {v.nome}
                  </Text>
                  <Didascalia>{v.resa === 'lucide' ? `${v.lucide} · ${v.tratto}` : v.ai ? 'svg · gradiente AI' : 'svg'}</Didascalia>
                </View>
              ))}
          </View>
        </View>
      ))}
    </View>
  );
}

const stili = StyleSheet.create({
  pagina: { flex: 1, backgroundColor: colori.sfondo.pagina },
  titolo: { ...testi.accentoSerif, color: colori.testo.primario, paddingHorizontal: margine.pagina, paddingTop: spazio[16] },
  selettoreScorrevole: { flexGrow: 0 },
  selettore: { flexDirection: 'row', gap: spazio[8], paddingHorizontal: margine.pagina, paddingVertical: spazio[16] },
  scheda: {
    minHeight: tocco.minimoIos,
    justifyContent: 'center',
    paddingHorizontal: spazio[16],
    borderRadius: raggio.pieno,
    borderWidth: 1,
    borderColor: colori.bordo.selezione,
  },
  schedaAttiva: { backgroundColor: colori.azione.primaria },
  schedaTesto: { ...testi.etichettaPiccola, color: colori.azione.primaria },
  schedaTestoAttiva: { color: colori.testo.suAzione },
  contenuto: { paddingHorizontal: margine.pagina, paddingBottom: spazio[40] },
  blocco: { gap: spazio[32] },
  gruppo: { gap: spazio[12] },
  intestazione: { ...testi.heading, color: colori.testo.primario },
  didascalia: { ...testi.caption, color: colori.testo.secondario },
  griglia: { flexDirection: 'row', flexWrap: 'wrap', gap: spazio[12] },
  campione: { width: 104, gap: spazio[4] },
  campioneColore: { height: 56, borderRadius: raggio.piccolo, borderWidth: 1, borderColor: colori.linea.guida },
  campioneNome: { ...testi.captionSemiBold, color: colori.testo.primario },
  rigaMisura: { flexDirection: 'row', alignItems: 'center', gap: spazio[12] },
  etichettaMisura: { ...testi.bodyDetails, color: colori.testo.primario, width: 120 },
  barra: { backgroundColor: colori.azione.primaria, borderRadius: raggio.badge },
  scatolaRaggio: { height: 56, backgroundColor: colori.sfondo.card, borderWidth: 1, borderColor: colori.bordo.selezione },
  scatolaMisura: { backgroundColor: colori.sfondo.campo, borderWidth: 1, borderColor: colori.linea.guida },
  scatolaTocco: { borderWidth: 1, borderColor: colori.bordo.selezione, borderStyle: 'dashed', borderRadius: raggio.piccolo },
  cellaIcona: { width: 104, gap: spazio[4] },
  cellaIconaDisegno: {
    width: tocco.minimoIos,
    height: tocco.minimoIos,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colori.sfondo.card,
    borderRadius: raggio.piccolo,
  },
  cellaIconaNome: { ...testi.captionSemiBold, color: colori.testo.primario },
});
