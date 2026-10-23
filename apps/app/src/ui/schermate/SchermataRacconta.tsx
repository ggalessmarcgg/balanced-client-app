import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import type { PuntoTutorial } from '@/servizi/racconta';
import { PulsanteRegistrazione } from '@/ui/racconta/PulsanteRegistrazione';
import { Tutorial, useRiquadroTutorial } from '@/ui/Tutorial';

import type { StatoRacconta } from '@/core/racconta/flusso';
import { testiErroreCompilazione } from '@/core/racconta/compila';
import { testiErrore } from '@/core/racconta/server';
import type { AzioniRacconta } from '@/servizi/useRacconta';
import { Icona } from '@/ui/icone';
import { Intestazione } from '@/ui/Intestazione';
import { Messaggio } from '@/ui/Messaggio';
import { Pulsante } from '@/ui/Pulsante';
import { Argomenti } from '@/ui/racconta/Argomenti';
import { CardRacconto } from '@/ui/racconta/CardRacconto';
import { ComandiRegistrazione } from '@/ui/racconta/ComandiRegistrazione';
import { Pagina } from '@/ui/schermate/Pagina';
import { Testo } from '@/ui/Testo';
import { colori, margine, opacita, raggio, spazio } from '@/ui/theme';

export type SchermataRaccontaProps = {
  stato: StatoRacconta;
  azioni: AzioniRacconta;
  /** Suggerimento del tutorial da mostrare (una volta per account): Pronto, Registrazione terminata o Il tuo racconto. */
  tutorial?: PuntoTutorial | null;
  onIndietro: () => void;
  /** "Preferisco scrivere" / "Scrivi il diario": torna a Oggi per compilare a mano. */
  onScrivi: () => void;
  /** "Crea il mio diario": compilazione del diario dal racconto (lotto 2). */
  onCreaDiario: () => void;
  /** Campo del racconto a fuoco all'avvio (pagina di sviluppo: verifica della tastiera). */
  raccontoAFuoco?: boolean;
  /** Livello voce fermo sulle altezze del disegno (pagina di sviluppo: confronto con Figma). */
  livelloVoceFermo?: boolean;
  sovrapposti?: ReactNode;
};

const TITOLO = 'Racconta la tua giornata';
const TESTI = {
  permesso: {
    titolo: 'Consenti il microfono',
    testo: 'Per creare il diario, l’audio viene trascritto da un servizio esterno e il testo viene elaborato dall’intelligenza artificiale. L’audio non viene conservato.',
  },
  microfonoDisattivato: {
    titolo: 'Il microfono è disattivato',
    testo: 'Per attivarlo vai alle impostazioni del telefono. Nel frattempo puoi sempre scrivere il tuo diario.',
  },
  pronto: 'Parla liberamente e racconta',
  terminata: 'Hai finito? Genera trascrizione del racconto.',
  nonHoCapito: {
    messaggio: 'Non sono riuscito a capire bene. Prova a parlare un po’ più vicino al telefono.',
    corpo: 'Il racconto era molto breve o con molto rumore intorno. Puoi riprovare oppure scrivere il diario.',
  },
  registrazioneNonRiuscita: {
    messaggio: 'La registrazione non è partita.',
    corpo: 'Controlla che nessun’altra app stia usando il microfono e riprova. Puoi sempre scrivere il diario.',
  },
  trascrizione: { attesa: 'Ci vorrà qualche secondo...', titolo: 'Trascrivendo il tuo racconto' },
  compilazione: { attesa: 'Ci vorrà qualche secondo...', titolo: 'Preparando il tuo diario' },
  attesaRete: 'La registrazione è al sicuro sul telefono. Il testo comparirà appena torni online.',
} as const;

/** Testi dei suggerimenti del tutorial (Figma Tutorial · 3 `586:5739`, · 4 `758:7670`, · 5 `758:7728`, · 6 `758:7773`). */
export const TESTI_TUTORIAL: Record<PuntoTutorial, string> = {
  pronto: 'Racconta liberamente la tua giornata: compileremo il diario per te e potrai controllarlo prima di inviarlo.',
  terminata: 'Tocca qui per trasformare il tuo racconto in testo: potrai rileggerlo e correggerlo prima di creare il diario.',
  racconto: 'Con un tocco compiliamo il tuo diario partendo da quello che hai raccontato.',
  riepilogo:
    'Qui trovi il diario compilato dal tuo racconto: controllalo e correggi quello che serve. Tocca «Invia alla nutrizionista» per condividerlo, oppure «Chiudi» per tenerlo come bozza. Se non lo invii, lo condividiamo noi alle 23:50.',
};

/**
 * "Racconta la tua giornata" (sezione Figma 3.1 · Diario vocale): le schermate 2 (permesso), 3 (microfono
 * disattivato), 4 (pronto, anche con l'avviso della 11), 5 (in registrazione), 5.2 (registrazione terminata), 7.1
 * (trascrizione in corso), 6 (il tuo racconto), 7 (preparando il diario, lotto 2), 10 (senza connessione) e 12 (errore
 * della trascrizione o della compilazione) dallo stesso stato del flusso.
 * Intestazione con la freccia indietro e il titolo; i comandi stanno nel piede fisso della pagina. I tre suggerimenti
 * del tutorial (sezione 1.1) evidenziano il pulsante di registrazione, quello "Da inviare" e "Crea il mio diario".
 */
export function SchermataRacconta({ stato, azioni, tutorial = null, onIndietro, onScrivi, onCreaDiario, raccontoAFuoco = false, livelloVoceFermo = false, sovrapposti }: SchermataRaccontaProps) {
  const misura = useRiquadroTutorial(tutorial !== null);
  const { corpo, piede } = contenuto(stato, azioni, onScrivi, onCreaDiario, raccontoAFuoco, livelloVoceFermo, tutorial ? misura : undefined);
  const elementoTutorial =
    tutorial === 'pronto' ? <PulsanteRegistrazione stato="pronto" /> : tutorial === 'terminata' ? <PulsanteRegistrazione stato="daInviare" /> : tutorial === 'racconto' ? <Pulsante etichetta="Crea il mio diario" /> : null;
  return (
    <Pagina
      piede={piede}
      sovrapposti={
        <>
          {tutorial && elementoTutorial && <Tutorial riquadro={misura.riquadro} elemento={elementoTutorial} testo={TESTI_TUTORIAL[tutorial]} onHoCapito={azioni.hoCapito} />}
          {sovrapposti}
        </>
      }
    >
      <View style={stili.intestazione}>
        {/* Racconta · 7 "Preparando il tuo diario": senza freccia indietro (contratto §1.4), si attende il server. */}
        <Intestazione titolo={TITOLO} onIndietro={onIndietro} mostraIndietro={stato.tipo !== 'compilazione' && stato.tipo !== 'compilato'} />
      </View>
      {corpo}
    </Pagina>
  );
}

type Misura = ReturnType<typeof useRiquadroTutorial>;

function contenuto(stato: StatoRacconta, azioni: AzioniRacconta, onScrivi: () => void, onCreaDiario: () => void, raccontoAFuoco: boolean, livelloVoceFermo: boolean, misura?: Misura): { corpo: ReactNode; piede?: ReactNode } {
  const misuraPulsante = misura ? { ref: misura.ref, onLayout: misura.onLayout } : undefined;
  switch (stato.tipo) {
    case 'avvio':
      return { corpo: <View style={stili.corpoCentrato} /> };

    case 'permesso':
      return {
        corpo: <CorpoMicrofono titolo={TESTI.permesso.titolo} testo={TESTI.permesso.testo} />,
        piede: (
          <View style={stili.comandi}>
            <Pulsante etichetta="Consenti" onPress={azioni.consenti} stato={stato.inRichiesta ? 'caricamento' : 'normale'} accessibilityHint="Chiede il permesso del microfono al telefono" />
            <Pulsante etichetta="Preferisco scrivere" livello="terziario" onPress={onScrivi} style={stili.centrato} />
          </View>
        ),
      };

    case 'microfonoDisattivato':
      return {
        corpo: <CorpoMicrofono titolo={TESTI.microfonoDisattivato.titolo} testo={TESTI.microfonoDisattivato.testo} attenuato />,
        piede: (
          <View style={stili.comandi}>
            <Pulsante etichetta="Apri le impostazioni" onPress={azioni.apriImpostazioni} accessibilityHint="Apre le impostazioni dell’app nel telefono" />
            <Pulsante etichetta="Scrivi il diario" livello="terziario" onPress={onScrivi} style={stili.centrato} />
          </View>
        ),
      };

    case 'pronto':
      return {
        corpo:
          stato.avviso === 'nessuno' ? (
            <CorpoArgomenti />
          ) : (
            <View style={stili.corpoInAlto}>
              <Messaggio tipo="errore" testo={stato.avviso === 'nonHoCapito' ? TESTI.nonHoCapito.messaggio : TESTI.registrazioneNonRiuscita.messaggio} />
              <Testo stile="body" colore={colori.testo.corpoAttenuato} style={stili.testoLargo}>
                {stato.avviso === 'nonHoCapito' ? TESTI.nonHoCapito.corpo : TESTI.registrazioneNonRiuscita.corpo}
              </Testo>
            </View>
          ),
        piede: <ComandiRegistrazione stato="pronto" onAvvia={azioni.avvia} misura={misuraPulsante} />,
      };

    case 'registrazione':
      return {
        corpo: <CorpoArgomenti />,
        piede: <ComandiRegistrazione stato="registrazione" durataMs={stato.durataMs} inPausa={stato.inPausa} livello={livelloVoceFermo ? null : stato.livello} onFerma={azioni.ferma} />,
      };

    case 'terminata':
      return {
        corpo: (
          <View style={stili.corpoArgomenti}>
            <Testo stile="heading" style={stili.testoCentrato} accessibilityRole="header">
              {TESTI.terminata}
            </Testo>
          </View>
        ),
        piede: <ComandiRegistrazione stato="terminata" durataMs={stato.audio.durataMs} onInvia={azioni.invia} onRicomincia={azioni.ricomincia} misura={misuraPulsante} />,
      };

    case 'trascrizione':
      return { corpo: <CorpoAttesa testi={TESTI.trascrizione} /> };

    case 'compilazione':
    case 'compilato':
      // "compilato" dura il tempo di passare al riepilogo: resta la stessa attesa, senza lampi.
      return { corpo: <CorpoAttesa testi={TESTI.compilazione} /> };

    case 'erroreCompilazione': {
      const testi = testiErroreCompilazione(stato.errore);
      return {
        corpo: (
          <View style={stili.corpoRacconto}>
            <Messaggio tipo="errore" testo={testi.messaggio} />
            <CardRacconto durataMs={stato.racconto.durataMs} testo={stato.racconto.testo} soloLettura />
            {testi.corpo && (
              <Testo stile="body" colore={colori.testo.corpoAttenuato} style={stili.testoLargo}>
                {testi.corpo}
              </Testo>
            )}
            {testi.riferimento && (
              <Testo stile="caption" colore={colori.testo.secondario} style={stili.riferimento} selectable>
                {testi.riferimento}
              </Testo>
            )}
          </View>
        ),
        piede: (
          <View style={stili.comandi}>
            {testi.riprova ? (
              <Pulsante etichetta="Riprova" onPress={azioni.riprova} accessibilityHint="Prepara di nuovo il diario dal racconto" />
            ) : (
              <Pulsante etichetta="Scrivi il diario" onPress={onScrivi} />
            )}
          </View>
        ),
      };
    }

    case 'racconto':
      return {
        corpo: (
          <View style={stili.corpoRacconto}>
            <CardRacconto durataMs={stato.durataMs} testo={stato.testo} onChangeText={azioni.modificaTesto} aFuoco={raccontoAFuoco} />
          </View>
        ),
        piede: (
          <View style={stili.comandiStretti}>
            <View ref={misuraPulsante?.ref} onLayout={misuraPulsante?.onLayout} collapsable={false} style={stili.testoLargo}>
              <Pulsante etichetta="Crea il mio diario" onPress={onCreaDiario} accessibilityHint="Compila il diario dal racconto" />
            </View>
            <Pulsante etichetta="Ricomincia" livello="terziario" onPress={azioni.ricomincia} accessibilityHint="Scarta il racconto e registra di nuovo" style={stili.centrato} />
          </View>
        ),
      };

    case 'senzaConnessione': {
      const testi = testiErrore({ esito: 'rete', codice: 'rete', messaggio: '', richiestaId: null, httpStatus: null });
      return {
        corpo: (
          <View style={stili.corpoRacconto}>
            <Messaggio tipo="info" testo={testi.messaggio} />
            <CardRacconto durataMs={stato.audio.durataMs} testo={testi.corpo} soloLettura />
          </View>
        ),
        piede: (
          <View style={stili.comandi}>
            <Pulsante etichetta="Crea il mio diario" stato="disabilitato" />
          </View>
        ),
      };
    }

    case 'errore': {
      const testi = testiErrore(stato.errore);
      const conAudio = stato.audio !== null;
      return {
        corpo: (
          <View style={stili.corpoRacconto}>
            <Messaggio tipo="errore" testo={testi.messaggio} />
            {conAudio ? (
              <CardRacconto durataMs={stato.audio?.durataMs ?? 0} testo={testi.corpo} soloLettura />
            ) : (
              <Testo stile="body" colore={colori.testo.corpoAttenuato} style={stili.testoLargo}>
                {testi.corpo}
              </Testo>
            )}
            {testi.riferimento && (
              <Testo stile="caption" colore={colori.testo.secondario} style={stili.riferimento} selectable>
                {testi.riferimento}
              </Testo>
            )}
          </View>
        ),
        piede: (
          <View style={stili.comandi}>
            {conAudio ? (
              <Pulsante etichetta="Riprova" onPress={azioni.riprova} accessibilityHint="Invia di nuovo la registrazione" />
            ) : stato.errore.esito === 'definitivo' ? (
              <Pulsante etichetta="Ricomincia" onPress={azioni.ricomincia} />
            ) : (
              <Pulsante etichetta="Scrivi il diario" onPress={onScrivi} />
            )}
          </View>
        ),
      };
    }
  }
}

/** Corpo delle schermate 2 e 3: cerchio 100 su sfondo/card con il microfono a 32 (al 40 % se disattivato), titolo e testo centrati. */
function CorpoMicrofono({ titolo, testo, attenuato = false }: { titolo: string; testo: string; attenuato?: boolean }) {
  return (
    <View style={stili.corpoCentrato}>
      <View style={[stili.cerchio, attenuato && stili.cerchioAttenuato]}>
        <Icona misura={24} nome="Microfono" dimensione={32} />
      </View>
      <View style={stili.testi}>
        <Testo stile="heading" style={stili.testoCentrato} accessibilityRole="header">
          {titolo}
        </Testo>
        <Testo stile="bodyDetails" style={stili.testoCentrato}>
          {testo}
        </Testo>
      </View>
    </View>
  );
}

/** Corpo delle attese 7.1 (trascrizione) e 7 (compilazione): testo di attesa, titolo e pallini a saltello, centrati. */
function CorpoAttesa({ testi }: { testi: { attesa: string; titolo: string } }) {
  return (
    <View style={stili.corpoCaricamento} accessibilityLiveRegion="polite">
      <Testo stile="bodyDetails" colore={colori.testo.secondario} style={stili.testoCentrato}>
        {testi.attesa}
      </Testo>
      <View style={stili.caricamento}>
        <Testo stile="etichetta" style={stili.testoCentrato} accessibilityRole="header">
          {testi.titolo}
        </Testo>
        <Pulsante etichetta={testi.titolo} livello="terziario" stato="caricamento" style={stili.centrato} />
      </View>
    </View>
  );
}

/** Corpo delle schermate 4 e 5: "Parla liberamente e racconta" e gli argomenti, centrati in verticale. */
function CorpoArgomenti() {
  return (
    <View style={stili.corpoArgomenti}>
      <Testo stile="heading" style={stili.testoCentrato} accessibilityRole="header">
        {TESTI.pronto}
      </Testo>
      <Argomenti />
    </View>
  );
}

const DIAMETRO_CERCHIO = 100;

const stili = StyleSheet.create({
  intestazione: { paddingTop: spazio[12], paddingHorizontal: margine.pagina },
  // Figma: Corpo con padding 32 che riempie lo spazio tra intestazione e comandi.
  corpoCentrato: { flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', padding: spazio[32], gap: spazio[24] },
  corpoArgomenti: { flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', padding: spazio[32], gap: spazio[16] },
  corpoInAlto: { flex: 1, alignSelf: 'stretch', padding: spazio[32], gap: spazio[4] },
  corpoRacconto: { flex: 1, alignSelf: 'stretch', padding: spazio[32], gap: spazio[4] },
  corpoCaricamento: { flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', paddingTop: spazio[24], paddingHorizontal: margine.pagina, gap: spazio[24] },
  caricamento: { alignSelf: 'stretch', alignItems: 'center', gap: spazio[4] },
  cerchio: { width: DIAMETRO_CERCHIO, height: DIAMETRO_CERCHIO, borderRadius: raggio.pieno, backgroundColor: colori.sfondo.card, alignItems: 'center', justifyContent: 'center' },
  cerchioAttenuato: { opacity: opacita.pulsantePrimarioDisabilitato },
  testi: { alignSelf: 'stretch', gap: spazio[8] },
  testoCentrato: { alignSelf: 'stretch', textAlign: 'center' },
  testoLargo: { alignSelf: 'stretch' },
  riferimento: { alignSelf: 'stretch', paddingTop: spazio[8] },
  // I terziari nascono allineati a sinistra (alignSelf flex-start): nei Comandi di Figma stanno al centro.
  centrato: { alignSelf: 'center' },
  comandi: { alignSelf: 'stretch', alignItems: 'center', gap: spazio[12], paddingTop: spazio[16], paddingBottom: spazio[8], paddingHorizontal: margine.pagina },
  comandiStretti: { alignSelf: 'stretch', alignItems: 'center', gap: spazio[8], paddingTop: spazio[16], paddingBottom: spazio[8], paddingHorizontal: margine.pagina },
});
