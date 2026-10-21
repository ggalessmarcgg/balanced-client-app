import { StyleSheet, View } from 'react-native';

import { ETICHETTA_TIPO, etichettaOrario, etichettaQuando, etichettaVideochiamata, type Visita } from '@/core/appuntamenti/appuntamenti';
import { FotoProfilo } from '@/ui/FotoProfilo';
import { Icona } from '@/ui/icone';
import { Pulsante } from '@/ui/Pulsante';
import { Testo } from '@/ui/Testo';
import { colori, raggio, spazio } from '@/ui/theme';

export type NutrizionistaAppuntamento = { nome: string; foto: string | null; iniziali: string };

export type ContenutoAppuntamentoProps = {
  visita: Visita;
  adesso: Date;
  nutrizionista: NutrizionistaAppuntamento | null;
  /** "Entra": apre il link della videochiamata (solo se esiste; altrimenti "Link in arrivo" disabilitato). */
  onEntra?: (link: string) => void;
  /** "Gestisci appuntamento": copia il numero WhatsApp del supporto. */
  onGestisci?: () => void;
};

// Card appuntamento (Figma 548:3911 in Stati · 2 e Menu · 4 517:2616): "Quando" (H2 + Body large all'80 %, gap 2),
// righe dettaglio (icona 20 + Body, gap 8), nutrizionista (foto 20 + Body), "Entra" primario, "oppure" (Body details
// 130 centrato), "Gestisci appuntamento" secondario con Caption centrata (gap 8). Il contenitore mette padding 32 e gap 12.
const FOTO_NUTRIZIONISTA = 20;

/** Contenuto della card del prossimo appuntamento, condiviso tra Appuntamenti (dentro CardSezione) e lo stato F (CardAppuntamento). */
export function ContenutoAppuntamento({ visita, adesso, nutrizionista, onEntra, onGestisci }: ContenutoAppuntamentoProps) {
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

/** Card crema senza titolo dello stato F (Figma 548:3911): padding 32, gap 12. */
export function CardAppuntamento(props: ContenutoAppuntamentoProps) {
  return (
    <View style={stili.card}>
      <ContenutoAppuntamento {...props} />
    </View>
  );
}

const stili = StyleSheet.create({
  card: { alignSelf: 'stretch', padding: spazio[32], gap: spazio[12], backgroundColor: colori.sfondo.card, borderRadius: raggio.card },
  quando: { alignSelf: 'stretch', gap: spazio[2] },
  dettaglio: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: spazio[8] },
  cresce: { flex: 1 },
  centrato: { alignSelf: 'stretch', textAlign: 'center' },
  gestisci: { alignSelf: 'stretch', gap: spazio[8] },
});
