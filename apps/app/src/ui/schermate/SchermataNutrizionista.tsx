import { Image } from 'expo-image';
import { Fragment, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { conArticolo, telefonoOscurato, type Ferie, type ProfiloNutrizionista } from '@/core/nutrizionista/profilo';
import { ErroreCaricamento } from '@/ui/ErroreCaricamento';
import { FotoProfilo } from '@/ui/FotoProfilo';
import { Icona } from '@/ui/icone';
import { Intestazione } from '@/ui/Intestazione';
import { CardSezione } from '@/ui/menu/CardSezione';
import { Opzione } from '@/ui/Opzione';
import { RigaElenco } from '@/ui/RigaElenco';
import { Pagina } from '@/ui/schermate/Pagina';
import { Segnaposto } from '@/ui/Segnaposto';
import { Separatore } from '@/ui/Separatore';
import { Testo } from '@/ui/Testo';
import { colori, margine, opacita, raggio, spazio } from '@/ui/theme';

export type SchermataNutrizionistaProps = {
  fase: { tipo: 'caricamento' } | { tipo: 'rete' | 'errore'; onRiprova: () => void } | { tipo: 'pronto'; profilo: ProfiloNutrizionista | null; ferie: Ferie | null };
  /** Abbonato: numero e "Scrivi alla nutrizionista"; altri stati: numero oscurato e "Disponibile con il percorso attivo" (Figma 514:2530). */
  contatto: 'visibile' | 'oscurato';
  onIndietro: () => void;
  /** Tocco su "Scrivi alla nutrizionista" / "Scrivi alla Dott.ssa X" (apre WhatsApp). */
  onScrivi?: (cifre: string) => void;
  sovrapposti?: ReactNode;
};

// Menu · 3 (Figma 515:2957): intestazione 12 sopra; contenuto 24 sopra, margini 20, gap 24, 40 sotto. Hero: foto
// 132 × 164 raggio foto + colonna (nome Heading, specializzazione Body details, poi numero di albo Body details e
// Caption con 16 sopra). Card contatto px 28 py 32 gap 16. Card chi sono / competenze / certificazioni / orari
// padding 32 gap 12. In ferie (596:5846): hero al 40 %, frase Body, card "Sostituzione" con foto 40.
const FOTO = { larghezza: 132, altezza: 164 };
const FOTO_SOSTITUTA = 40;
const NOTA_ALBO = "Questo numero indica la registrazione all'albo dell'Ordine dei Biologi.";
const NOTA_ORARI = 'Negli orari di lavoro la tua nutrizionista è disponibile per il supporto e consulenze / controlli.';

export function SchermataNutrizionista({ fase, contatto, onIndietro, onScrivi, sovrapposti }: SchermataNutrizionistaProps) {
  return (
    <Pagina scorrevole={false} sovrapposti={sovrapposti}>
      <View style={stili.intestazione}>
        <Intestazione titolo="La tua nutrizionista" onIndietro={onIndietro} />
      </View>
      <ScrollView style={stili.scorrimento} contentContainerStyle={stili.contenuto} showsVerticalScrollIndicator={false}>
        {fase.tipo === 'pronto' ? (
          fase.profilo ? (
            <Contenuto profilo={fase.profilo} ferie={fase.ferie} contatto={contatto} onScrivi={onScrivi} />
          ) : (
            <Testo stile="body" colore={colori.testo.corpoAttenuato}>
              Non hai ancora una nutrizionista assegnata.
            </Testo>
          )
        ) : fase.tipo === 'caricamento' ? (
          <View style={stili.segnaposti}>
            <Segnaposto altezza={164} />
            <Segnaposto altezza={150} />
            <Segnaposto altezza={200} />
          </View>
        ) : (
          <View style={stili.errore}>
            <ErroreCaricamento
              descrizione={fase.tipo === 'rete' ? 'Sei offline: non riusciamo a caricare il profilo. Controlla la connessione e riprova.' : 'Non riusciamo a caricare il profilo. Riprova tra poco.'}
              onRiprova={fase.onRiprova}
            />
          </View>
        )}
      </ScrollView>
    </Pagina>
  );
}

function Contenuto({ profilo, ferie, contatto, onScrivi }: { profilo: ProfiloNutrizionista; ferie: Ferie | null; contatto: 'visibile' | 'oscurato'; onScrivi?: (cifre: string) => void }) {
  const inFerie = ferie !== null;
  return (
    <>
      <View style={[stili.hero, inFerie && stili.attenuato]} accessible accessibilityLabel={[profilo.nome, profilo.specializzazione, profilo.numeroAlbo && `Numero di albo ${profilo.numeroAlbo}`].filter(Boolean).join(', ')}>
        <View style={stili.foto}>{profilo.foto && <Image source={{ uri: profilo.foto }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" accessible={false} />}</View>
        <View style={stili.identita}>
          <View style={stili.nomeRuolo}>
            <Testo stile="heading">{profilo.nome}</Testo>
            {profilo.specializzazione && <Testo stile="bodyDetails">{profilo.specializzazione}</Testo>}
          </View>
          {profilo.numeroAlbo && (
            <View style={stili.albo}>
              <Testo stile="bodyDetails">{profilo.numeroAlbo}</Testo>
              <Testo stile="caption">{NOTA_ALBO}</Testo>
            </View>
          )}
        </View>
      </View>
      {ferie && <Testo stile="body">{conArticolo(ferie.etichetta)}</Testo>}
      <View style={stili.card}>
        {ferie ? <CardSostituzione ferie={ferie} contatto={contatto} onScrivi={onScrivi} /> : <CardContatto profilo={profilo} contatto={contatto} onScrivi={onScrivi} />}
        {profilo.chiSono && (
          <CardSezione titolo="Chi sono">
            <Testo stile="body">{profilo.chiSono}</Testo>
          </CardSezione>
        )}
        {profilo.competenze.length > 0 && (
          <CardSezione titolo="Competenze" style={stili.cardCompetenze}>
            <View style={stili.etichette} accessibilityRole="list">
              {profilo.competenze.map((c) => (
                <Opzione key={c} etichetta={c} selezionata={false} fondo="campo" allineamento="sinistra" disabilitato />
              ))}
            </View>
          </CardSezione>
        )}
        {profilo.certificazioni.length > 0 && (
          <CardSezione titolo="Certificazioni">
            <View style={stili.elenco} accessibilityRole="list">
              {profilo.certificazioni.map((c, i) => (
                <Fragment key={`${i}-${c}`}>
                  {i > 0 && <Separatore />}
                  <View style={stili.certificazione}>
                    <Icona misura={20} nome="Certificazione" />
                    <Testo stile="body" style={stili.cresce}>
                      {c}
                    </Testo>
                  </View>
                </Fragment>
              ))}
            </View>
          </CardSezione>
        )}
        {profilo.orari.length > 0 && (
          <View style={stili.orari}>
            <CardSezione titolo="Orari di lavoro">
              <View style={stili.elenco}>
                {profilo.orari.map((o, i) => (
                  <Fragment key={o.giorno}>
                    {i > 0 && <Separatore />}
                    <RigaElenco tipo="valore" etichetta={o.giorno} valore={o.orario} />
                  </Fragment>
                ))}
              </View>
            </CardSezione>
            <Testo stile="bodyDetails" colore={colori.testo.secondario}>
              {NOTA_ORARI}
            </Testo>
          </View>
        )}
      </View>
    </>
  );
}

/** Card "Contatto diretto": numero con l'icona WhatsApp e link "Scrivi alla nutrizionista"; oscurata per chi non è abbonato. */
function CardContatto({ profilo, contatto, onScrivi }: { profilo: ProfiloNutrizionista; contatto: 'visibile' | 'oscurato'; onScrivi?: (cifre: string) => void }) {
  const visibile = contatto === 'visibile' && profilo.telefono !== null;
  const telefono = profilo.telefono;
  if (contatto === 'visibile' && !telefono) return null;
  return (
    <View style={stili.cardContatto}>
      <Testo stile="heading" accessibilityRole="header">
        Contatto diretto
      </Testo>
      <RigaWhatsApp numero={visibile && telefono ? telefono.formattato : telefonoOscurato(telefono)} oscurato={!visibile} />
      {visibile && telefono ? (
        <Pressable onPress={onScrivi ? () => onScrivi(telefono.cifre) : undefined} accessibilityRole="link" accessibilityLabel="Scrivi alla nutrizionista su WhatsApp" hitSlop={spazio[12]}>
          <Testo stile="link" colore={colori.azione.primaria}>
            Scrivi alla nutrizionista
          </Testo>
        </Pressable>
      ) : (
        <Testo stile="link" colore={colori.azione.primaria}>
          Disponibile con il percorso attivo
        </Testo>
      )}
    </View>
  );
}

/** Card "Sostituzione" (Figma 596:5846): foto 40, nome e "farà il supporto al suo posto", numero, "Scrivi alla Dott.ssa X". */
function CardSostituzione({ ferie, contatto, onScrivi }: { ferie: Ferie; contatto: 'visibile' | 'oscurato'; onScrivi?: (cifre: string) => void }) {
  const s = ferie.sostituta;
  const telefono = s?.telefono ?? null;
  const visibile = contatto === 'visibile' && telefono !== null;
  return (
    <View style={stili.cardContatto}>
      <Testo stile="heading" accessibilityRole="header">
        Sostituzione
      </Testo>
      {s ? (
        <View style={stili.sostituta} accessible accessibilityLabel={`${s.nome} farà il supporto al suo posto`}>
          <FotoProfilo misura={FOTO_SOSTITUTA} foto={s.foto} iniziali={s.iniziali} />
          <View>
            <Testo stile="etichetta">{s.nome}</Testo>
            <Testo stile="body">farà il supporto al suo posto</Testo>
          </View>
        </View>
      ) : (
        <Testo stile="body">Il supporto passa a una collega: ti avviseremo appena è assegnata.</Testo>
      )}
      {s && (contatto === 'visibile' ? telefono : true) && <RigaWhatsApp numero={visibile && telefono ? telefono.formattato : telefonoOscurato(telefono)} oscurato={!visibile} />}
      {s &&
        (visibile && telefono ? (
          <Pressable onPress={onScrivi ? () => onScrivi(telefono.cifre) : undefined} accessibilityRole="link" accessibilityLabel={`Scrivi alla ${s.cognomeConTitolo} su WhatsApp`} hitSlop={spazio[12]}>
            <Testo stile="link" colore={colori.azione.primaria}>
              {`Scrivi alla ${s.cognomeConTitolo}`}
            </Testo>
          </Pressable>
        ) : (
          <Testo stile="link" colore={colori.azione.primaria}>
            Disponibile con il percorso attivo
          </Testo>
        ))}
    </View>
  );
}

function RigaWhatsApp({ numero, oscurato }: { numero: string; oscurato: boolean }) {
  return (
    <View style={stili.rigaWhatsApp} accessible accessibilityLabel={oscurato ? 'Numero disponibile con il percorso attivo' : `WhatsApp ${numero}`}>
      <Icona misura={20} nome="WhatsApp" />
      <Testo stile="body" style={oscurato && stili.attenuato}>
        {numero}
      </Testo>
    </View>
  );
}

const stili = StyleSheet.create({
  intestazione: { paddingTop: spazio[12], paddingHorizontal: margine.pagina },
  scorrimento: { flex: 1 },
  contenuto: { paddingTop: spazio[24], paddingHorizontal: margine.pagina, paddingBottom: spazio[40], gap: spazio[24] },
  hero: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: spazio[16] },
  attenuato: { opacity: opacita.iconaRigaAttenuata },
  foto: { width: FOTO.larghezza, height: FOTO.altezza, borderRadius: raggio.foto, backgroundColor: colori.sfondo.foto, overflow: 'hidden' },
  identita: { flex: 1, alignSelf: 'stretch', justifyContent: 'space-between' },
  nomeRuolo: { gap: spazio[4] },
  albo: { paddingTop: spazio[16], gap: spazio[4] },
  card: { alignSelf: 'stretch', gap: spazio[12] },
  cardContatto: { alignSelf: 'stretch', paddingHorizontal: spazio[28], paddingVertical: spazio[32], gap: spazio[16], backgroundColor: colori.sfondo.card, borderRadius: raggio.card },
  rigaWhatsApp: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: spazio[8] },
  sostituta: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: spazio[12] },
  cardCompetenze: { gap: spazio[10] },
  etichette: { alignSelf: 'stretch', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', alignItems: 'flex-start', gap: spazio[8] },
  elenco: { alignSelf: 'stretch' },
  certificazione: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: spazio[10], paddingVertical: spazio[14] },
  cresce: { flex: 1 },
  orari: { alignSelf: 'stretch', gap: spazio[8] },
  segnaposti: { gap: spazio[12] },
  errore: { paddingTop: spazio[24] },
});
