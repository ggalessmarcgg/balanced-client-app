import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { canalePerTipo } from '@/core/notifiche/push';
import { destinazioneInAttesa, registroApertura } from '@/servizi/aperturaNotifiche';
import { memoriaConsenso } from '@/servizi/consenso';
import { dispositivoCorrente } from '@/servizi/dispositivo';
import { memoriaDiario } from '@/servizi/memoriaDiario';
import { memoriaRevisioni } from '@/servizi/memoriaRevisioni';
import { codiceDispositivo, programmaNotificaDiProva, statoPermesso } from '@/servizi/notifichePush';
import { azzeraPrimoAccesso } from '@/servizi/primoAccesso';
import { statoCorrente } from '@/servizi/statoCliente';
import { Pulsante } from '@/ui/Pulsante';
import { colori, margine, spazio, testi } from '@/ui/theme';

/** Secondi prima della notifica locale: il tempo di mettere l'app in secondo piano o chiuderla. */
const RITARDO_S = 6;

type Prova = { nome: string; titolo: string; testo: string; tipo: string; tabella: string; destinazione: string; riferimento: () => string };

/**
 * Solo in sviluppo (step 6): notifiche locali con gli stessi dati che manderà il server (docs/server-notifiche.md §3),
 * per provare apertura e ritorno con l'app aperta, in secondo piano e chiusa. Nessuna notifica vera viene inviata.
 */
export default function NotificheProva() {
  const router = useRouter();
  const [info, setInfo] = useState('');
  const stato = statoCorrente();
  const clientId = stato && 'profilo' in stato ? stato.profilo.clientId : '';
  const aggiornaInfo = useCallback(() => {
    void Promise.all([statoPermesso(), codiceDispositivo()]).then(([permesso, codice]) => {
      const d = dispositivoCorrente();
      const c = memoriaConsenso();
      setInfo(
        [
        `permesso: ${permesso.permesso} (puoChiedere ${permesso.puoChiedere})`,
        `codice: ${codice ? `${codice.slice(0, 12)}… (${codice.length} caratteri)` : 'nessuno'}`,
        `riga telefono: ${d ? `${d.id} · ${d.permesso}` : 'non registrata'}`,
        `consenso AI: ${c.letto ? (c.ultima ? `${c.ultima.action} (${c.ultima.text_version})` : 'nessuna riga') : 'non letto'}`,
          `destinazione in attesa: ${JSON.stringify(destinazioneInAttesa())}`,
          '',
          'registro delle aperture:',
          ...registroApertura(),
        ].join('\n'),
      );
    });
  }, []);
  useEffect(() => {
    aggiornaInfo();
  }, [aggiornaInfo]);

  const giornataId = () => memoriaDiario().settimana.find((r) => r.status === 'submitted')?.id ?? 'giornata-finta';
  const revisioneId = () => memoriaRevisioni().righe?.find((r) => r.status === 'sent' || r.status === 'opened' || r.status === 'read')?.id ?? 'revisione-finta';
  const prove: Prova[] = [
    { nome: 'Commento della nutrizionista → giornata', titolo: 'Nuovo commento sul tuo diario', testo: 'Margherita ha commentato la tua giornata di giovedì.', tipo: 'nutritionist_comment', tabella: 'daily_submissions', destinazione: 'giornata', riferimento: giornataId },
    { nome: 'Revisione inviata → lettura', titolo: 'La tua revisione è pronta', testo: 'Revisione 13: scopri cosa è andato bene questa settimana.', tipo: 'review_sent', tabella: 'client_reviews', destinazione: 'revisione', riferimento: revisioneId },
    { nome: 'Ferie → La tua nutrizionista', titolo: 'Sostituzione per ferie', testo: 'La tua nutrizionista sarà in ferie fino al 20 ottobre: scopri chi ti segue.', tipo: 'holiday_replacement', tabella: 'nutritionist_holidays', destinazione: 'nutrizionista', riferimento: () => 'ferie-finte' },
    { nome: 'Piano pronto → Piano', titolo: 'Il tuo piano è pronto', testo: 'Margherita ha preparato il tuo piano alimentare.', tipo: 'plan_sent', tabella: 'nutrition_plans', destinazione: 'piano', riferimento: () => 'piano-finto' },
    { nome: 'Promemoria del diario → Oggi', titolo: 'Com’è andata oggi?', testo: 'Racconta la tua giornata a Margherita.', tipo: 'diary_reminder', tabella: 'clients', destinazione: 'oggi', riferimento: () => clientId },
    { nome: 'Misure → Peso e misure', titolo: 'Visita di controllo tra una settimana', testo: 'Prendi le misure nei prossimi giorni: serviranno alla visita.', tipo: 'measurement_update', tabella: 'control_visits', destinazione: 'peso_misure', riferimento: () => 'visita-finta' },
  ];
  const programma = async (p: Prova) => {
    const data = { tipo: p.tipo, riferimento: p.riferimento(), tabella: p.tabella, destinazione: p.destinazione, categoria: canalePerTipo(p.tipo) };
    const id = await programmaNotificaDiProva(p.titolo, p.testo, data, RITARDO_S);
    setInfo((i) => `${i}\nprogrammata ${id ?? 'NO'} tra ${RITARDO_S} s: ${p.nome}`);
  };

  return (
    <SafeAreaView style={stili.pagina} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={stili.elenco}>
        <Text style={stili.titolo}>Notifiche di prova</Text>
        <Text style={stili.info}>{info}</Text>
        {prove.map((p) => (
          <Pulsante key={p.nome} etichetta={p.nome} livello="secondario" onPress={() => void programma(p)} />
        ))}
        <Pulsante etichetta="Aggiorna le informazioni" livello="terziario" onPress={aggiornaInfo} />
        <Pulsante etichetta="Azzera il carosello e aprilo" livello="terziario" onPress={() => void azzeraPrimoAccesso().then(() => router.push('/primo-accesso'))} />
        <Pulsante etichetta="Torna all’app" livello="terziario" onPress={() => router.replace('/')} />
      </ScrollView>
    </SafeAreaView>
  );
}

const stili = StyleSheet.create({
  pagina: { flex: 1, backgroundColor: colori.sfondo.pagina },
  elenco: { paddingHorizontal: margine.pagina, paddingVertical: spazio[16], gap: spazio[12] },
  titolo: { ...testi.accentoSerif, color: colori.testo.primario },
  info: { ...testi.caption, color: colori.testo.secondario },
});
