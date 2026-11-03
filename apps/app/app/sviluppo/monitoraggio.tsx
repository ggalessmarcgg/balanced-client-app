import { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ANALISI_ATTIVA, codiceAnonimo, diagnosticaAnalisi, inviaOra, misura } from '@/servizi/analisi';
import { AMBIENTE_MONITORAGGIO, MONITORAGGIO_ATTIVO, segnalaErrore, segnalaProva } from '@/servizi/monitoraggio';
import { Pulsante } from '@/ui/Pulsante';
import { colori, margine, spazio, testi } from '@/ui/theme';

class ErroreDiProva extends Error {
  constructor(messaggio: string) {
    super(messaggio);
    this.name = 'ErroreDiProva';
  }
}

/**
 * Solo in sviluppo (step 4): errori volontari per verificare che arrivino a Sentry senza dati personali. Con
 * EXPO_PUBLIC_SENTRY_IN_SVILUPPO=1 e il DSN nel .env il monitoraggio è attivo anche in __DEV__; altrimenti qui si vede
 * "spento" e gli errori restano sul telefono. Nessuno di questi errori tocca il database.
 */
export default function MonitoraggioProva() {
  const [esplodi, setEsplodi] = useState(false);
  const [esito, setEsito] = useState('');
  const [diagnostica, setDiagnostica] = useState(diagnosticaAnalisi);
  if (esplodi) throw new ErroreDiProva('errore di rendering volontario (pagina di sviluppo)');
  return (
    <SafeAreaView style={stili.pagina}>
      <ScrollView contentContainerStyle={stili.contenuto}>
        <Text style={stili.info}>{`monitoraggio: ${MONITORAGGIO_ATTIVO ? 'attivo' : 'spento'} · ambiente: ${AMBIENTE_MONITORAGGIO}`}</Text>
        <Text style={stili.info}>{`analisi (PostHog): ${ANALISI_ATTIVA ? 'attiva' : 'spenta'} · codice anonimo: ${codiceAnonimo() ?? '—'}`}</Text>
        <Text style={stili.info}>{`PostHog · in coda: ${diagnostica.inCoda} · ultimo invio: ${diagnostica.ultimoInvio}`}</Text>
        <Pulsante
          etichetta="Evento di prova PostHog (prova_analisi)"
          livello="secondario"
          onPress={() => {
            misura('prova_analisi', {});
            setDiagnostica(diagnosticaAnalisi());
            setEsito('evento prova_analisi in coda: parte entro 10 s');
          }}
        />
        <Pulsante
          etichetta="Invia ora la coda PostHog (flush)"
          livello="secondario"
          onPress={() => {
            void inviaOra().then((risultato) => {
              setDiagnostica(diagnosticaAnalisi());
              setEsito(`invio: ${risultato}`);
            });
          }}
        />
        <Pulsante
          etichetta="Aggiorna diagnostica PostHog"
          livello="secondario"
          onPress={() => setDiagnostica(diagnosticaAnalisi())}
        />
        <Pulsante
          etichetta="Errore gestito (captureException)"
          livello="secondario"
          onPress={() => {
            segnalaErrore(new ErroreDiProva('errore gestito volontario (pagina di sviluppo)'), { origine: 'prova', schermata: 'sviluppo/monitoraggio' });
            setEsito('errore gestito inviato');
          }}
        />
        <Pulsante
          etichetta="Messaggio di prova (captureMessage)"
          livello="secondario"
          onPress={() => {
            segnalaProva('messaggio di prova dalla pagina di sviluppo');
            setEsito('messaggio inviato');
          }}
        />
        <Pulsante
          etichetta="Promise rifiutata (non gestita)"
          livello="secondario"
          onPress={() => {
            void Promise.reject(new ErroreDiProva('promise rifiutata volontaria (pagina di sviluppo)'));
            setEsito('promise rifiutata');
          }}
        />
        <Pulsante
          etichetta="Errore JS fuori dal render (setTimeout)"
          livello="secondario"
          onPress={() => {
            setEsito('tra un istante: errore non gestito');
            setTimeout(() => {
              throw new ErroreDiProva('errore non gestito volontario (pagina di sviluppo)');
            }, 100);
          }}
        />
        <Pulsante etichetta="Errore di rendering (ErrorBoundary)" livello="terziarioPericolo" onPress={() => setEsplodi(true)} />
        <Text style={stili.info}>{esito}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const stili = StyleSheet.create({
  pagina: { flex: 1, backgroundColor: colori.sfondo.pagina },
  contenuto: { paddingHorizontal: margine.pagina, paddingVertical: spazio[24], gap: spazio[12] },
  info: { ...testi.bodyDetails, color: colori.testo.attenuato },
});
