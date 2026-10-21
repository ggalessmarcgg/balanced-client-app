import { Fragment, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ETICHETTA_TIPO, etichettaOrario, etichettaPassato, etichettaQuando, etichettaVideochiamata, type Visita } from '@/core/appuntamenti/appuntamenti';
import { ErroreCaricamento } from '@/ui/ErroreCaricamento';
import { FotoProfilo } from '@/ui/FotoProfilo';
import { Icona } from '@/ui/icone';
import { Intestazione } from '@/ui/Intestazione';
import { CardSezione } from '@/ui/menu/CardSezione';
import { Pulsante } from '@/ui/Pulsante';
import { RigaElenco } from '@/ui/RigaElenco';
import { Pagina } from '@/ui/schermate/Pagina';
import { Segnaposto } from '@/ui/Segnaposto';
import { Separatore } from '@/ui/Separatore';
import { Testo } from '@/ui/Testo';
import { colori, margine, spazio } from '@/ui/theme';

export type NutrizionistaAppuntamento = { nome: string; foto: string | null; iniziali: string };

export type SchermataAppuntamentiProps = {
  fase: { tipo: 'caricamento' } | { tipo: 'rete' | 'errore'; onRiprova: () => void } | { tipo: 'pronto'; prossimo: Visita | null; passati: Visita[]; adesso: Date };
  nutrizionista: NutrizionistaAppuntamento | null;
  onIndietro: () => void;
  /** "Entra": apre il link della videochiamata (solo se esiste). */
  onEntra?: (link: string) => void;
  /** "Gestisci appuntamento": copia il numero WhatsApp del supporto. */
  onGestisci?: () => void;
  sovrapposti?: ReactNode;
};

// Menu · 4 (Figma 517:2616): intestazione 12 sopra; contenuto 24 sopra, margini 20, gap 12. Card appuntamento padding
// 32 gap 12: Heading, "Quando" (H2 + Body large all'80 %, gap 2), righe dettaglio (icona 20 + Body, gap 8),
// nutrizionista (foto 20 + Body), "Entra" primario, "oppure" (Body details 130 centrato), "Gestisci appuntamento"
// secondario con Caption centrata (gap 8). 4.2: "Nessuna visita in programma al momento." e primario disabilitato.
const FOTO_NUTRIZIONISTA = 20;

export function SchermataAppuntamenti({ fase, nutrizionista, onIndietro, onEntra, onGestisci, sovrapposti }: SchermataAppuntamentiProps) {
  return (
    <Pagina scorrevole={false} sovrapposti={sovrapposti}>
      <View style={stili.intestazione}>
        <Intestazione titolo="Appuntamenti" onIndietro={onIndietro} />
      </View>
      <ScrollView style={stili.scorrimento} contentContainerStyle={stili.contenuto} showsVerticalScrollIndicator={false}>
        {fase.tipo === 'pronto' ? (
          <>
            <CardSezione titolo="Prossimo appuntamento">
              {fase.prossimo ? (
                <Prossimo visita={fase.prossimo} adesso={fase.adesso} nutrizionista={nutrizionista} onEntra={onEntra} onGestisci={onGestisci} />
              ) : (
                <>
                  <Testo stile="bodyDetails" colore={colori.testo.secondario}>
                    Nessuna visita in programma al momento.
                  </Testo>
                  <Pulsante etichetta="Prenota una consulenza" stato="disabilitato" />
                </>
              )}
            </CardSezione>
            {fase.passati.length > 0 && (
              <CardSezione titolo="Appuntamenti passati">
                <View style={stili.elenco} accessibilityRole="list">
                  {fase.passati.map((v, i) => (
                    <Fragment key={v.id}>
                      {i > 0 && <Separatore />}
                      <RigaElenco tipo="valore" etichetta={etichettaPassato(v)} valore="" />
                    </Fragment>
                  ))}
                </View>
              </CardSezione>
            )}
          </>
        ) : fase.tipo === 'caricamento' ? (
          <>
            <Segnaposto altezza={300} />
            <Segnaposto altezza={200} />
          </>
        ) : (
          <View style={stili.errore}>
            <ErroreCaricamento
              descrizione={fase.tipo === 'rete' ? 'Sei offline: non riusciamo a caricare gli appuntamenti. Controlla la connessione e riprova.' : 'Non riusciamo a caricare gli appuntamenti. Riprova tra poco.'}
              onRiprova={fase.onRiprova}
            />
          </View>
        )}
      </ScrollView>
    </Pagina>
  );
}

function Prossimo({ visita, adesso, nutrizionista, onEntra, onGestisci }: { visita: Visita; adesso: Date; nutrizionista: NutrizionistaAppuntamento | null; onEntra?: (link: string) => void; onGestisci?: () => void }) {
  const link = visita.linkVideochiamata;
  return (
    <>
      <View style={stili.quando}>
        <Testo stile="h2">{etichettaQuando(visita, adesso)}</Testo>
        <Testo stile="bodyLarge" colore={colori.testo.corpoAttenuato}>
          {etichettaOrario(visita)}
        </Testo>
      </View>
      <View style={stili.dettaglio}>
        <Icona misura={20} nome="Calendario" />
        <Testo stile="body" style={stili.cresce}>
          {ETICHETTA_TIPO[visita.tipo]}
        </Testo>
      </View>
      <View style={stili.dettaglio}>
        <Icona misura={20} nome="Videochiamata" />
        <Testo stile="body" style={stili.cresce}>
          {etichettaVideochiamata(visita)}
        </Testo>
      </View>
      {nutrizionista && (
        <View style={stili.dettaglio} accessible accessibilityLabel={nutrizionista.nome}>
          <FotoProfilo misura={FOTO_NUTRIZIONISTA} foto={nutrizionista.foto} iniziali={undefined} />
          <Testo stile="body" numberOfLines={1} style={stili.cresce}>
            {nutrizionista.nome}
          </Testo>
        </View>
      )}
      <Pulsante etichetta={link ? 'Entra' : 'Link in arrivo'} stato={link ? 'normale' : 'disabilitato'} onPress={link && onEntra ? () => onEntra(link) : undefined} accessibilityHint="Apre la videochiamata" />
      <Testo stile="bodyDetails130" style={stili.centrato}>
        oppure
      </Testo>
      <View style={stili.gestisci}>
        <Pulsante etichetta="Gestisci appuntamento" livello="secondario" onPress={onGestisci} accessibilityHint="Copia il numero WhatsApp del supporto" />
        <Testo stile="caption" style={stili.centrato}>
          Puoi gestire il tuo appuntamento in programma scrivendoci su WhatsApp
        </Testo>
      </View>
    </>
  );
}

const stili = StyleSheet.create({
  intestazione: { paddingTop: spazio[12], paddingHorizontal: margine.pagina },
  scorrimento: { flex: 1 },
  contenuto: { paddingTop: spazio[24], paddingHorizontal: margine.pagina, paddingBottom: spazio[40], gap: spazio[12] },
  quando: { alignSelf: 'stretch', gap: spazio[2] },
  dettaglio: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: spazio[8] },
  cresce: { flex: 1 },
  centrato: { alignSelf: 'stretch', textAlign: 'center' },
  gestisci: { alignSelf: 'stretch', gap: spazio[8] },
  elenco: { alignSelf: 'stretch' },
  errore: { paddingTop: spazio[24] },
});
