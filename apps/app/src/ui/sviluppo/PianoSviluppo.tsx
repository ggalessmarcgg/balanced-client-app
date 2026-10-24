import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { PianoComposto } from '@/core/piano/composizione';
import { giornoPreselezionato, pastoPreselezionato } from '@/core/piano/preselezione';
import { useMemoriaPiano } from '@/servizi/piano';
import { leggiStato, statoCorrente } from '@/servizi/statoCliente';
import { usePiano } from '@/servizi/usePiano';
import { Testo } from '@/ui/Testo';
import { colori, margine, spazio } from '@/ui/theme';

/**
 * Vista di sviluppo del piano (step 8, lotto 1, prima delle schermate): il piano composto per l'account in uso,
 * in forma testuale. Se lo stato non è ancora in memoria (rotta aperta con EXPO_PUBLIC_ROTTA_SVILUPPO) lo legge dalla
 * sessione salvata nel portachiavi. Solo nelle versioni di sviluppo.
 */
export function PianoSviluppo() {
  const [clientId, setClientId] = useState<string | null | undefined>(() => clientIdDa());
  useEffect(() => {
    if (clientId !== undefined) return;
    let attivo = true;
    leggiStato().then(() => {
      if (attivo) setClientId(clientIdDa() ?? null);
    });
    return () => {
      attivo = false;
    };
  }, [clientId]);
  return (
    <SafeAreaView style={stili.pagina} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={stili.contenuto}>
        <Testo stile="h2">Piano · lettura</Testo>
        {clientId === undefined && <Testo stile="bodyDetails">Leggo lo stato…</Testo>}
        {clientId === null && <Testo stile="bodyDetails">Nessun abbonato in sessione: accedi con un account abbonato (es. +test4, alessandro@test16.com) e riapri questa rotta.</Testo>}
        {clientId && <Lettura clientId={clientId} />}
      </ScrollView>
    </SafeAreaView>
  );
}

function clientIdDa(): string | undefined {
  const stato = statoCorrente();
  return stato && 'profilo' in stato ? stato.profilo.clientId : undefined;
}

function Lettura({ clientId }: { clientId: string }) {
  const { fase, dati } = usePiano(clientId);
  const memoria = useMemoriaPiano();
  const adesso = new Date();
  return (
    <View style={stili.blocco}>
      <Riga nome="Cliente" valore={clientId} />
      <Riga nome="Fase" valore={fase.tipo} />
      <Riga nome="Ultima chiamata" valore={memoria.ultimaChiamata ? `${memoria.ultimaChiamata.esito} · ${memoria.ultimaChiamata.quando}${memoria.ultimaChiamata.messaggio ? ` · ${memoria.ultimaChiamata.messaggio}` : ''}` : '—'} />
      <Riga nome="Copia" valore={memoria.origine ? `${memoria.origine === 'file' ? 'da file' : 'dal server'}${memoria.piano ? ` · id ${memoria.piano.id} · updated_at ${memoria.piano.updated_at}` : ' · nessun piano'}` : 'nessuna'} />
      {dati && (dati.piano ? <Composto piano={dati.piano} adesso={adesso} /> : <Testo stile="heading">Piano in elaborazione (nessun piano corrente)</Testo>)}
    </View>
  );
}

function Composto({ piano, adesso }: { piano: PianoComposto; adesso: Date }) {
  const preselezione = piano.tipo === 'fisso' ? giornoPreselezionato(piano.giorni, adesso) : pastoPreselezionato(piano.pasti, adesso);
  return (
    <View style={stili.blocco}>
      <Riga nome="Tipo" valore={piano.tipo} />
      <Riga nome="Preselezione" valore={preselezione ? ('indice' in preselezione ? `${preselezione.iniziale} · ${preselezione.nome}` : `${preselezione.nomeBreve} · ${preselezione.nome}`) : '—'} />
      <Riga nome={piano.aggiornatoIl ? 'Piè di pagina' : 'Aggiornato'} valore={piano.aggiornatoIl ?? 'data illeggibile'} />
      {piano.tipo === 'fisso' &&
        piano.giorni.map((g) => (
          <View key={g.indice} style={stili.blocco}>
            <Testo stile="heading">{`${g.iniziale} · ${g.nome}`}</Testo>
            {g.pasti.map((p) => (
              <View key={p.id} style={stili.pasto}>
                <Testo stile="bodyLarge">{`${p.nome} (${p.nomeBreve})`}</Testo>
                {p.righe.map((r, i) => (
                  <Testo key={i} stile="bodyDetails" colore={colori.testo.secondario}>{`· ${r.testo}`}</Testo>
                ))}
              </View>
            ))}
          </View>
        ))}
      {piano.tipo === 'variabile' &&
        piano.pasti.map((p) => (
          <View key={p.id} style={stili.pasto}>
            <Testo stile="heading">{`${p.nomeBreve} · ${p.nome}`}</Testo>
            {p.gruppi.map((g) => (
              <View key={g.categoria}>
                <Testo stile="bodyLarge">{g.etichetta}</Testo>
                {g.righe.map((r, i) => (
                  <Testo key={i} stile="bodyDetails" colore={colori.testo.secondario}>{`· ${r.testo}`}</Testo>
                ))}
              </View>
            ))}
          </View>
        ))}
      <Testo stile="heading">{piano.indicazioni.length > 0 ? `Indicazioni (${piano.indicazioni.length}) · pulsante presente` : 'Indicazioni: nessuna · pulsante assente'}</Testo>
      {piano.indicazioni.map((ind, i) => (
        <View key={i}>
          <Testo stile="bodyLarge">{ind.titolo || '(senza titolo)'}</Testo>
          <Testo stile="bodyDetails" colore={colori.testo.secondario}>
            {ind.testo}
          </Testo>
        </View>
      ))}
    </View>
  );
}

function Riga({ nome, valore }: { nome: string; valore: string }) {
  return <Testo stile="bodyDetails">{`${nome}: ${valore}`}</Testo>;
}

const stili = StyleSheet.create({
  pagina: { flex: 1, backgroundColor: colori.sfondo.pagina },
  contenuto: { padding: margine.pagina, gap: spazio[12] },
  blocco: { gap: spazio[8] },
  pasto: { gap: spazio[4] },
});
