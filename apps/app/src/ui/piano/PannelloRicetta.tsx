import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { CARATTERI_MASSIMI_CAMPO, type Idea } from '@/core/ricette/server';
import { puoTrovare, testiEsito, type StatoPannello } from '@/core/ricette/pannello';
import type { ConsensoPannello } from '@/core/consenso/consenso';
import type { AzioniRicette } from '@/servizi/useRicette';
import { CampoTesto } from '@/ui/CampoTesto';
import { CardConsensoAI } from '@/ui/consenso/ConsensoAI';
import { Opzione } from '@/ui/Opzione';
import { PannelloDalBasso } from '@/ui/PannelloDalBasso';
import { BarraAttesa } from '@/ui/piano/BarraAttesa';
import { EtichettaAI } from '@/ui/piano/EtichettaAI';
import { CardInformativa, CardSpiegazioneAI } from '@/ui/piano/PannelloSostituzione';
import { Pulsante } from '@/ui/Pulsante';
import { Segnaposto } from '@/ui/Segnaposto';
import { Testo } from '@/ui/Testo';
import { colori, opacita, raggio, spazio } from '@/ui/theme';

export const TESTI_RICETTA = {
  testata: 'Ricetta',
  pasto: 'Per quale pasto?',
  campo: { etichetta: 'Ingredienti o pietanza di partenza (facoltativo)', segnaposto: 'Es. salmone, zucchine…' },
  trova: 'Trova idee',
  ricerca: 'Sto elaborando ricette da proporti…',
  vedi: 'Vedi la ricetta',
  preparo: 'Preparo la ricetta…',
  nota: 'Le ricette proposte replicano l’apporto del pasto di partenza del tuo piano alimentare.',
  nutrizionista: 'La tua nutrizionista',
  riprova: 'Riprova',
} as const;

/** Segnaposto delle idee in ricerca (Figma 537:4384: due barre 160 × 16 e 240 × 12, come la sostituzione). */
const BARRE_SEGNAPOSTO = [
  { larghezza: 160, altezza: 16 },
  { larghezza: 240, altezza: 12 },
];
const SEGNAPOSTI = 3;
/** Spazio tra gli elementi del pannello (Figma 536:3577: gap 24). */
const SPAZIATURA = spazio[24];

export type PannelloRicettaProps = {
  stato: StatoPannello;
  azioni: AzioniRicette;
  /** "La tua nutrizionista" (5.7): chiude il pannello e apre la pagina del menu. */
  onNutrizionista: () => void;
  /** Prove e pagina di sviluppo: la barra dell'attesa parte già a questo punto (ms) e, se `attesaFerma`, non avanza. */
  attesaTrascorsa?: number;
  attesaFerma?: boolean;
  /** Consenso alle funzioni AI al primo uso (step 6, stesso disegno di 831:8486): quando è richiesto, la card prende il posto del contenuto. */
  consenso?: ConsensoPannello;
};

/**
 * Pannello "Ricetta" (Figma Piano · 5 fisso 536:3448, 5.1 variabile 536:3626, 5.2 ricerca 537:4384, 5.3 idee 536:3770,
 * 5.3.1 attesa 824:8046, 5.3.2 attesa oltre il tempo stimato 826:8118, 5.3.3 idee con ingredienti non usati 826:8283, 5.7
 * nessuna idea 818:8055, 5.8 errore 818:8193, 5.8.1 errore nella preparazione 826:8443): Pannello dal basso con la testata Etichetta AI,
 * poi il contenuto dello stato, gap 24. Si chiude con la maniglia, il velo e il gesto; ogni riapertura riparte dall'avvio.
 */
export function PannelloRicetta({ stato, azioni, onNutrizionista, attesaTrascorsa, attesaFerma, consenso }: PannelloRicettaProps) {
  // Da "ricettaPronta" a chiuso il pannello sparisce sotto la pagina della ricetta, che lo ha già coperto: niente scorrimento.
  // L'ultimo stato aperto è stato derivato in render (come `apertoPrecedente` nel Pannello dal basso).
  const [ultimoAperto, setUltimoAperto] = useState<StatoPannello['tipo']>('chiuso');
  if (stato.tipo !== 'chiuso' && stato.tipo !== ultimoAperto) setUltimoAperto(stato.tipo);
  const chiusuraIstantanea = stato.tipo === 'chiuso' && ultimoAperto === 'ricettaPronta';
  return (
    <PannelloDalBasso aperto={stato.tipo !== 'chiuso'} onChiudi={azioni.chiudi} etichetta="Trova una ricetta" spaziatura={SPAZIATURA} chiusuraIstantanea={chiusuraIstantanea}>
      {stato.tipo !== 'chiuso' && (
        <>
          <EtichettaAI etichetta={TESTI_RICETTA.testata} />
          {consenso?.richiesto ? (
            <CardConsensoAI funzione="ricette" onAccetto={consenso.accetta} onNonOra={consenso.nonOra} onInformativa={consenso.informativa} inCorso={consenso.inCorso} />
          ) : (
            <Contenuto stato={stato} azioni={azioni} onNutrizionista={onNutrizionista} attesaTrascorsa={attesaTrascorsa} attesaFerma={attesaFerma} />
          )}
        </>
      )}
    </PannelloDalBasso>
  );
}

function Contenuto({ stato, azioni, onNutrizionista, attesaTrascorsa, attesaFerma }: { stato: Exclude<StatoPannello, { tipo: 'chiuso' }>; azioni: AzioniRicette; onNutrizionista: () => void; attesaTrascorsa?: number; attesaFerma?: boolean }) {
  switch (stato.tipo) {
    case 'avvio':
      return (
        <>
          {stato.contesto.tipo === 'fisso' ? (
            <View style={stili.sceltaPasto}>
              <Testo stile="etichettaPiccola">{TESTI_RICETTA.pasto}</Testo>
              <View style={stili.pasti} accessibilityRole="radiogroup">
                {stato.contesto.pasti.map((p) => (
                  <Opzione key={p.id} etichetta={p.nome} selezionata={stato.pasto?.id === p.id} onPress={() => azioni.scegliPasto(p)} />
                ))}
              </View>
            </View>
          ) : (
            <Pasto nome={stato.contesto.pasto.nome} />
          )}
          <CampoTesto
            etichetta={TESTI_RICETTA.campo.etichetta}
            segnaposto={TESTI_RICETTA.campo.segnaposto}
            valore={stato.campo}
            onChangeText={azioni.scrivi}
            maxLength={CARATTERI_MASSIMI_CAMPO}
            autoCapitalize="sentences"
            returnKeyType="done"
          />
          <Pulsante etichetta={TESTI_RICETTA.trova} stato={puoTrovare(stato) ? 'normale' : 'disabilitato'} onPress={azioni.trova} accessibilityHint="Cerca idee di ricette per questo pasto" />
        </>
      );
    case 'ricerca':
      return (
        <>
          <Pasto nome={stato.pasto.nome} />
          <Testo stile="bodyDetails" colore={colori.testo.attenuato} accessibilityLiveRegion="polite">
            {TESTI_RICETTA.ricerca}
          </Testo>
          <View style={stili.ideeInRicerca}>
            {Array.from({ length: SEGNAPOSTI }, (_, i) => (
              <Segnaposto key={i} righe={BARRE_SEGNAPOSTO} style={stili.segnaposto} />
            ))}
          </View>
          <Pulsante etichetta={TESTI_RICETTA.vedi} stato="disabilitato" />
        </>
      );
    case 'idee':
    case 'attesaRicetta':
    case 'ricettaPronta': {
      const inAttesa = stato.tipo !== 'idee';
      return (
        <>
          <Pasto nome={stato.pasto.nome} />
          <View style={stili.idee}>
            {stato.dati.idee.map((idea, i) => (
              <CardIdea key={i} idea={idea} selezionata={stato.dati.scelta === i} onPress={inAttesa ? undefined : () => azioni.scegliIdea(i)} />
            ))}
            <CardSpiegazioneAI spiegazione={{ primo: TESTI_RICETTA.nota, secondo: stato.dati.fraseIngredienti }} />
          </View>
          {inAttesa ? (
            <>
              <Pulsante etichetta={TESTI_RICETTA.preparo} stato="disabilitato" />
              <BarraAttesa spaziatura={SPAZIATURA} trascorsoIniziale={attesaTrascorsa} ferma={attesaFerma} />
            </>
          ) : (
            <Pulsante etichetta={TESTI_RICETTA.vedi} stato={stato.dati.scelta === null ? 'disabilitato' : 'normale'} onPress={azioni.vediRicetta} accessibilityHint="Prepara la ricetta dell'idea scelta" />
          )}
        </>
      );
    }
    case 'nessunaIdea':
      return (
        <>
          <Pasto nome={stato.pasto.nome} />
          <CardInformativa {...testiEsito(stato)} />
          <Pulsante etichetta={TESTI_RICETTA.nutrizionista} livello="secondario" onPress={onNutrizionista} accessibilityHint="Apre la pagina della tua nutrizionista" />
        </>
      );
    case 'errore':
      return (
        <>
          <Pasto nome={stato.pasto.nome} />
          <CardInformativa {...testiEsito(stato)} />
          {stato.riprovabile && <Pulsante etichetta={TESTI_RICETTA.riprova} onPress={azioni.riprova} accessibilityHint={stato.fase === 'ricetta' ? 'Prepara di nuovo la ricetta' : 'Ripete la ricerca delle idee'} />}
        </>
      );
  }
}

/** Il pasto scelto (o del selettore nel variabile) in Heading (Figma 536:3907). */
function Pasto({ nome }: { nome: string }) {
  return (
    <Testo stile="heading" accessibilityRole="header">
      {nome}
    </Testo>
  );
}

/**
 * Idea (Figma 536:3913, selezionata 536:3910): card sfondo/card, raggio foto, padding 16, gap 4, titolo in Etichetta e
 * descrizione in Body details secondario; selezionata con il bordo 2 bordo/selezione. Durante l'attesa non si tocca.
 */
function CardIdea({ idea, selezionata, onPress }: { idea: Idea; selezionata: boolean; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: selezionata, checked: selezionata }}
      accessibilityLabel={`${idea.titolo}. ${idea.descrizione}`}
      style={({ pressed }) => [stili.idea, selezionata && stili.ideaSelezionata, pressed && stili.premuta]}
    >
      <Testo stile="etichetta">{idea.titolo}</Testo>
      {idea.descrizione ? (
        <Testo stile="bodyDetails" colore={colori.testo.secondario}>
          {idea.descrizione}
        </Testo>
      ) : null}
    </Pressable>
  );
}

const BORDO_SELEZIONE = 2;

const stili = StyleSheet.create({
  sceltaPasto: { alignSelf: 'stretch', gap: spazio[8] },
  pasti: { alignSelf: 'stretch', flexDirection: 'row', flexWrap: 'wrap', gap: spazio[4] },
  ideeInRicerca: { alignSelf: 'stretch', gap: spazio[8] },
  segnaposto: { padding: spazio[16], gap: spazio[4], borderRadius: raggio.foto },
  idee: { alignSelf: 'stretch', gap: spazio[4] },
  idea: { alignSelf: 'stretch', padding: spazio[16], gap: spazio[4], borderRadius: raggio.foto, backgroundColor: colori.sfondo.card },
  ideaSelezionata: { borderWidth: BORDO_SELEZIONE, borderColor: colori.bordo.selezione },
  premuta: { opacity: opacita.pulsantePremuto },
});
