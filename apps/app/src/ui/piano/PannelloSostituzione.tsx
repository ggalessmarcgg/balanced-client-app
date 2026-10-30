import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { testiEsito, type StatoPannello } from '@/core/sostituzione/pannello';
import type { Alternativa, Spiegazione } from '@/core/sostituzione/server';
import { CARATTERI_MASSIMI_IN_CASA } from '@/core/sostituzione/server';
import type { ConsensoPannello } from '@/core/consenso/consenso';
import type { AzioniSostituzione } from '@/servizi/useSostituzione';
import { CampoTesto } from '@/ui/CampoTesto';
import { CardConsensoAI } from '@/ui/consenso/ConsensoAI';
import { Icona } from '@/ui/icone';
import { PannelloDalBasso } from '@/ui/PannelloDalBasso';
import { EtichettaAI } from '@/ui/piano/EtichettaAI';
import { Pulsante } from '@/ui/Pulsante';
import { Segnaposto } from '@/ui/Segnaposto';
import { Testo } from '@/ui/Testo';
import { colori, gradienti, raggio, spazio } from '@/ui/theme';

export const TESTI_SOSTITUZIONE = {
  testata: 'Sostituisci',
  campo: { etichetta: 'Alimenti a disposizione? (facoltativo)', segnaposto: 'Scrivile e le valutiamo' },
  trova: 'Trova alternative',
  ricerca: 'Sto cercando alternative equivalenti…',
  nutrizionista: 'La tua nutrizionista',
  riprova: 'Riprova',
  nota: 'Le alternative rispettano il tuo piano e il tuo profilo. Per dubbi chiedi alla tua nutrizionista.',
} as const;

/** Segnaposto delle alternative in ricerca (Figma 531:3232: due barre 160 × 16 e 240 × 12). */
const BARRE_SEGNAPOSTO = [
  { larghezza: 160, altezza: 16 },
  { larghezza: 240, altezza: 12 },
];
const SEGNAPOSTI = 3;

export type PannelloSostituzioneProps = {
  stato: StatoPannello;
  azioni: AzioniSostituzione;
  /** "La tua nutrizionista" (4.3 e 4.4): chiude il pannello e apre la pagina del menu. */
  onNutrizionista: () => void;
  /** Consenso alle funzioni AI al primo uso (4.6 831:8486, step 6): quando è richiesto, la card prende il posto del contenuto. */
  consenso?: ConsensoPannello;
};

/**
 * Pannello "Sostituisci" (Figma Piano · 4 avvio 531:3086, 4.1 ricerca 531:3232, 4.2 alternative 531:3374, 4.3 nessuna
 * alternativa 531:3528, 4.4 non riconosciuto 789:7727, 4.5 errore 789:7865): Pannello dal basso con la testata Etichetta
 * AI, l'alimento come scritto nel piano in Heading, il contenuto dello stato e in fondo la nota in Caption centrata.
 * Si chiude con la maniglia, il velo e il gesto; ogni riapertura riparte dall'avvio (contratto §1).
 */
export function PannelloSostituzione({ stato, azioni, onNutrizionista, consenso }: PannelloSostituzioneProps) {
  return (
    <PannelloDalBasso aperto={stato.tipo !== 'chiuso'} onChiudi={azioni.chiudi} etichetta="Sostituisci un alimento" spaziatura={spazio[24]}>
      {stato.tipo !== 'chiuso' && (
        <>
          <EtichettaAI etichetta={TESTI_SOSTITUZIONE.testata} />
          <Testo stile="heading" accessibilityRole="header">
            {stato.riga.testo}
          </Testo>
          {consenso?.richiesto ? (
            <CardConsensoAI funzione="sostituzione" onAccetto={consenso.accetta} onNonOra={consenso.nonOra} onInformativa={consenso.informativa} inCorso={consenso.inCorso} />
          ) : (
            <Contenuto stato={stato} azioni={azioni} onNutrizionista={onNutrizionista} />
          )}
        </>
      )}
    </PannelloDalBasso>
  );
}

function Contenuto({ stato, azioni, onNutrizionista }: { stato: Exclude<StatoPannello, { tipo: 'chiuso' }>; azioni: AzioniSostituzione; onNutrizionista: () => void }) {
  switch (stato.tipo) {
    case 'avvio':
      return (
        <>
          <CampoTesto
            etichetta={TESTI_SOSTITUZIONE.campo.etichetta}
            segnaposto={TESTI_SOSTITUZIONE.campo.segnaposto}
            valore={stato.inCasa}
            onChangeText={azioni.scrivi}
            maxLength={CARATTERI_MASSIMI_IN_CASA}
            autoCapitalize="sentences"
            returnKeyType="done"
          />
          <Azione>
            <Pulsante etichetta={TESTI_SOSTITUZIONE.trova} onPress={azioni.trova} accessibilityHint="Cerca alternative equivalenti a questo alimento" />
          </Azione>
        </>
      );
    case 'ricerca':
      return (
        <>
          <Testo stile="bodyDetails" colore={colori.testo.attenuato} accessibilityLiveRegion="polite">
            {TESTI_SOSTITUZIONE.ricerca}
          </Testo>
          <View style={stili.alternativeInRicerca}>
            {Array.from({ length: SEGNAPOSTI }, (_, i) => (
              <Segnaposto key={i} righe={BARRE_SEGNAPOSTO} style={stili.segnaposto} />
            ))}
          </View>
          <Nota />
        </>
      );
    case 'alternative':
      return (
        <>
          <View style={stili.alternative}>
            {stato.alternative.map((a, i) => (
              <CardAlternativa key={i} alternativa={a} />
            ))}
            <CardSpiegazioneAI spiegazione={stato.spiegazione} />
          </View>
          <Nota />
        </>
      );
    case 'nessunaAlternativa':
    case 'nonRiconosciuto':
      return (
        <>
          <CardInformativa {...testiEsito(stato)} />
          <Azione>
            <Pulsante etichetta={TESTI_SOSTITUZIONE.nutrizionista} livello="secondario" onPress={onNutrizionista} accessibilityHint="Apre la pagina della tua nutrizionista" />
          </Azione>
        </>
      );
    case 'errore':
      return (
        <>
          <CardInformativa {...testiEsito(stato)} />
          {stato.riprovabile ? (
            <Azione>
              <Pulsante etichetta={TESTI_SOSTITUZIONE.riprova} onPress={azioni.riprova} accessibilityHint="Ripete la ricerca delle alternative" />
            </Azione>
          ) : (
            <Nota />
          )}
        </>
      );
  }
}

/** Pulsante e nota, gap 8 (Figma 530:3525). */
function Azione({ children }: { children: React.ReactNode }) {
  return (
    <View style={stili.azione}>
      {children}
      <Nota />
    </View>
  );
}

function Nota() {
  return (
    <Testo stile="caption" colore={colori.testo.terziario} style={stili.nota}>
      {TESTI_SOSTITUZIONE.nota}
    </Testo>
  );
}

/** Alternativa (Figma 531:3505): card sfondo/card, raggio foto, padding 16, "nome · quantità" in App/Etichetta. */
function CardAlternativa({ alternativa }: { alternativa: Alternativa }) {
  return (
    <View style={stili.cardAlternativa}>
      <Testo stile="etichetta">{alternativa.quantita}</Testo>
    </View>
  );
}

/** Card informativa (Figma 531:3658, 789:7799, 789:7937, 818:8127): titolo in Etichetta e testo in Body details attenuato, gap 4. */
export function CardInformativa({ titolo, testo }: { titolo: string; testo: string }) {
  return (
    <View style={stili.cardInformativa} accessibilityLiveRegion="polite">
      <Testo stile="etichetta">{titolo}</Testo>
      <Testo stile="bodyDetails" colore={colori.testo.attenuato}>
        {testo}
      </Testo>
    </View>
  );
}

/**
 * Card spiegazione AI (Figma 532:3440): sfondo App/Gradiente card diario (sfondo/card → sfondo/campo al 30 %), raggio foto,
 * padding 16, gap 12: Icona / 20 / Info, il primo paragrafo (perché le alternative sono adatte) e il secondo solo se la
 * persona ha indicato alimenti propri non adatti. Nel pannello "Ricetta" porta la nota sull'apporto e la frase sugli ingredienti.
 */
export function CardSpiegazioneAI({ spiegazione }: { spiegazione: Spiegazione }) {
  const [misura, setMisura] = useState({ larghezza: 0, altezza: 0 });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setMisura((m) => (m.larghezza === width && m.altezza === height ? m : { larghezza: width, altezza: height }));
  };
  const g = gradienti.cardDiario;
  return (
    <View style={stili.cardSpiegazione} onLayout={onLayout} accessibilityLiveRegion="polite">
      {misura.larghezza > 0 && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants">
          <Svg width={misura.larghezza} height={misura.altezza}>
            <Defs>
              <LinearGradient id="spiegazioneAI" x1={g.inizio.x * misura.larghezza} y1={g.inizio.y * misura.altezza} x2={g.fine.x * misura.larghezza} y2={g.fine.y * misura.altezza} gradientUnits="userSpaceOnUse">
                {g.tappe.map((t) => (
                  <Stop key={t.posizione} offset={t.posizione} stopColor={t.colore} />
                ))}
              </LinearGradient>
            </Defs>
            <Rect width={misura.larghezza} height={misura.altezza} rx={raggio.foto} ry={raggio.foto} fill="url(#spiegazioneAI)" />
          </Svg>
        </View>
      )}
      <Icona misura={20} nome="Info" />
      <Testo stile="bodyDetails" colore={colori.testo.attenuato}>
        {spiegazione.primo}
      </Testo>
      {spiegazione.secondo && (
        <Testo stile="bodyDetails" colore={colori.testo.attenuato}>
          {spiegazione.secondo}
        </Testo>
      )}
    </View>
  );
}

const stili = StyleSheet.create({
  azione: { alignSelf: 'stretch', gap: spazio[8] },
  nota: { alignSelf: 'stretch', textAlign: 'center' },
  alternativeInRicerca: { alignSelf: 'stretch', gap: spazio[8] },
  segnaposto: { padding: spazio[16], gap: spazio[4], borderRadius: raggio.foto },
  alternative: { alignSelf: 'stretch', gap: spazio[4] },
  cardAlternativa: { alignSelf: 'stretch', padding: spazio[16], gap: spazio[4], borderRadius: raggio.foto, backgroundColor: colori.sfondo.card },
  cardInformativa: { alignSelf: 'stretch', padding: spazio[16], gap: spazio[4], borderRadius: raggio.foto, backgroundColor: colori.sfondo.card },
  cardSpiegazione: { alignSelf: 'stretch', padding: spazio[16], gap: spazio[12], borderRadius: raggio.foto, overflow: 'hidden' },
});
