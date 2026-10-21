import type { ReactNode } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import {
  DURATE_SPORT,
  ETICHETTE_DURATA,
  ETICHETTE_ENERGIA,
  ETICHETTE_IDRATAZIONE,
  ETICHETTE_PASTI,
  ETICHETTE_SPORT,
  haContenuto,
  LIVELLI_ENERGIA,
  LIVELLI_IDRATAZIONE,
  PASTI,
  TITOLI_BLOCCHI,
  type Blocco,
  type Diario,
  type DurataSport,
  type Pasto,
  type TipoSport,
} from '@/core/diario/modello';
import { CursoreSazieta } from '@/ui/diario/CursoreSazieta';
import { RigaPasto } from '@/ui/diario/RigaPasto';
import { Opzione } from '@/ui/Opzione';
import { Pulsante } from '@/ui/Pulsante';
import { PROPRIETA_CAMPO, useCampoSopraTastiera } from '@/ui/tastiera';
import { Testo } from '@/ui/Testo';
import { colori, opacita, raggio, spazio, testi } from '@/ui/theme';

/**
 * Blocco di un passaggio della Card diario (Figma "Pasti" 449:680 e omologhi): padding verticale 32, titolo Heading,
 * gap 36. Nel pannello della giornata (475:1459): nessun padding, gap 20.
 */
export function BloccoDiario({ blocco, children, nelPannello = false }: { blocco: Blocco; children: ReactNode; nelPannello?: boolean }) {
  return (
    <View style={nelPannello ? stili.bloccoPannello : stili.blocco}>
      <Testo stile="heading" accessibilityRole="header">
        {TITOLI_BLOCCHI[blocco]}
      </Testo>
      {children}
    </View>
  );
}

/** Domanda dentro un blocco: etichetta (App/Etichetta) e opzioni sotto, gap 10. */
function Domanda({ etichetta, children }: { etichetta: string; children: ReactNode }) {
  return (
    <View style={stili.domanda}>
      <Testo stile="etichetta">{etichetta}</Testo>
      {children}
    </View>
  );
}

type PropsBlocco = { diario: Diario; onChange: (diario: Diario) => void; /** Dentro il pannello della giornata (spaziature compatte). */ nelPannello?: boolean };

export type BloccoPastiProps = PropsBlocco & { pastoAperto: Pasto | null; onApri: (pasto: Pasto | null) => void };

/** Passaggio 1 · Pasti (Figma 449:696): le quattro righe pasto con gap 16, una sola aperta per volta. */
export function BloccoPasti({ diario, onChange, pastoAperto, onApri, nelPannello }: BloccoPastiProps) {
  return (
    <BloccoDiario blocco="pasti" nelPannello={nelPannello}>
      <View style={stili.righe}>
        {PASTI.map((pasto) => (
          <RigaPasto
            key={pasto}
            etichetta={ETICHETTE_PASTI[pasto]}
            valore={diario[pasto]}
            stato={pastoAperto === pasto ? 'aperta' : diario[pasto].trim() ? 'compilata' : 'daCompilare'}
            onToggle={() => onApri(pastoAperto === pasto ? null : pasto)}
            onChangeText={(testo) => onChange({ ...diario, [pasto]: testo })}
          />
        ))}
      </View>
    </BloccoDiario>
  );
}

/** Passaggio 2 · Valori (Figma 449:866): energia (2 × 2, Opzione compatta), sazietà (cursore), idratazione (4 in riga). */
export function BloccoValori({ diario, onChange, nelPannello }: PropsBlocco) {
  return (
    <BloccoDiario blocco="valori" nelPannello={nelPannello}>
      <Domanda etichetta="Energia">
        <View style={stili.griglia}>
          {[LIVELLI_ENERGIA.slice(0, 2), LIVELLI_ENERGIA.slice(2)].map((riga, i) => (
            <View key={i} style={stili.rigaOpzioni}>
              {riga.map((livello) => (
                <Opzione
                  key={livello}
                  etichetta={ETICHETTE_ENERGIA[livello]}
                  forma="compatta"
                  cresce
                  selezionata={diario.energy_level === livello}
                  onPress={() => onChange({ ...diario, energy_level: livello })}
                />
              ))}
            </View>
          ))}
        </View>
      </Domanda>
      <Domanda etichetta="Sazietà">
        <CursoreSazieta valore={diario.satiety_level} onChange={(v) => onChange({ ...diario, satiety_level: v })} />
      </Domanda>
      <Domanda etichetta="Idratazione">
        <View style={stili.rigaOpzioni}>
          {LIVELLI_IDRATAZIONE.map((livello) => (
            <Opzione
              key={livello}
              etichetta={ETICHETTE_IDRATAZIONE[livello]}
              forma="compatta"
              cresce
              selezionata={diario.hydration_level === livello}
              onPress={() => onChange({ ...diario, hydration_level: livello })}
            />
          ))}
        </View>
      </Domanda>
    </BloccoDiario>
  );
}

// Disposizione delle opzioni sport come in Figma (449:894): riposo e camminata, poi 3, 2, 2; durate 2 + 2 (449:910).
const RIGHE_SPORT: (TipoSport | 'riposo')[][] = [
  ['riposo', 'camminata'],
  ['corsa', 'pesi', 'bici'],
  ['nuoto', 'corpo-libero'],
  ['danza', 'altro'],
];
const RIGHE_DURATA: DurataSport[][] = [DURATE_SPORT.slice(0, 2), DURATE_SPORT.slice(2)];

/**
 * Passaggio 3 · Sport (Figma 449:921; con riposo 696:416). Scelta singola tra "Oggi riposo" e gli sport: con riposo
 * selezionato gli sport restano attivi (toccarne uno lo seleziona e deseleziona il riposo) e solo "Per quanto tempo?"
 * resta al 50 % e non toccabile; toccando di nuovo "Oggi riposo" si deseleziona. Il database riceve tipo e durata
 * sempre insieme, altrimenti entrambi null. Una giornata storica con la durata "<20m" non ha nessuna durata
 * selezionata: il valore resta finché non se ne sceglie un'altra.
 */
export function BloccoSport({ diario, onChange, nelPannello }: PropsBlocco) {
  const riposo = diario.riposo;
  const scegliSport = (tipo: TipoSport | 'riposo') => {
    if (tipo === 'riposo') onChange(riposo ? { ...diario, riposo: false } : { ...diario, riposo: true, sport_type: null, sport_duration: null });
    else onChange({ ...diario, riposo: false, sport_type: tipo });
  };
  return (
    <BloccoDiario blocco="sport" nelPannello={nelPannello}>
      <Domanda etichetta="Cosa hai fatto oggi?">
        <View style={stili.griglia}>
          {RIGHE_SPORT.map((riga, i) => (
            <View key={i} style={stili.rigaOpzioni}>
              {riga.map((tipo) => (
                <Opzione
                  key={tipo}
                  etichetta={tipo === 'riposo' ? 'Oggi riposo' : ETICHETTE_SPORT[tipo]}
                  cresce
                  selezionata={tipo === 'riposo' ? riposo : !riposo && diario.sport_type === tipo}
                  onPress={() => scegliSport(tipo)}
                />
              ))}
            </View>
          ))}
        </View>
      </Domanda>
      <View style={[stili.cresce, riposo && stili.attenuato]} pointerEvents={riposo ? 'none' : 'auto'}>
        <Domanda etichetta="Per quanto tempo?">
          <View style={stili.griglia}>
            {RIGHE_DURATA.map((riga, i) => (
              <View key={i} style={stili.rigaOpzioni}>
                {riga.map((durata) => (
                  <Opzione
                    key={durata}
                    etichetta={ETICHETTE_DURATA[durata]}
                    cresce
                    selezionata={!riposo && diario.sport_duration === durata}
                    disabilitato={riposo}
                    onPress={() => onChange({ ...diario, riposo: false, sport_duration: durata })}
                  />
                ))}
              </View>
            ))}
          </View>
        </Domanda>
      </View>
    </BloccoDiario>
  );
}

/** Senza onCondividi (modifica di una giornata già condivisa) il blocco ha la sola nota. */
export type BloccoCommentoProps = PropsBlocco & { onCondividi?: () => void; inviando?: boolean; /** Nota a fuoco all'avvio (pagina di sviluppo). */ aFuoco?: boolean };

// Campo nota (Figma 449:961): alto 96 su sfondo/card, raggio foto, padding 16, segnaposto in Caption.
const ALTEZZA_NOTA = 96;

/**
 * Passaggio 4 · Commento (Figma 449:966): nota libera e pulsante primario "Invia alla nutrizionista", gap 8.
 * "Invia" è disattivato finché il diario non ha almeno un contenuto (un pasto, un valore, lo sport o il commento):
 * nessuna condivisione di diari vuoti.
 */
export function BloccoCommento({ diario, onChange, onCondividi, inviando = false, nelPannello, aFuoco = false }: BloccoCommentoProps) {
  const statoInvio = inviando ? 'caricamento' : haContenuto(diario) ? 'normale' : 'disabilitato';
  const { ref: contenitore, onFocus: fuocoTastiera, onBlur: sfuocoTastiera, onContentSizeChange: crescitaTastiera } = useCampoSopraTastiera();
  return (
    <BloccoDiario blocco="commento" nelPannello={nelPannello}>
      <View style={stili.commento} ref={contenitore}>
        <TextInput
          {...PROPRIETA_CAMPO}
          value={diario.day_comment}
          onChangeText={(testo) => onChange({ ...diario, day_comment: testo })}
          placeholder="C'è qualcosa che vuoi raccontare alla tua nutrizionista?"
          multiline
          autoFocus={aFuoco}
          textAlignVertical="top"
          onFocus={fuocoTastiera}
          onBlur={sfuocoTastiera}
          onContentSizeChange={crescitaTastiera}
          accessibilityLabel="Commento per la nutrizionista"
          style={stili.nota}
        />
        {onCondividi && (
          <Pulsante
            etichetta="Invia alla nutrizionista"
            onPress={onCondividi}
            stato={statoInvio}
            accessibilityHint={statoInvio === 'disabilitato' ? 'Compila almeno un pasto, un valore, lo sport o il commento' : 'Condivide la giornata: non si può annullare'}
          />
        )}
      </View>
    </BloccoDiario>
  );
}

const stili = StyleSheet.create({
  blocco: { alignSelf: 'stretch', paddingVertical: spazio[32], gap: spazio[36] },
  bloccoPannello: { alignSelf: 'stretch', gap: spazio[20] },
  domanda: { alignSelf: 'stretch', gap: spazio[10] },
  righe: { alignSelf: 'stretch', gap: spazio[16] },
  griglia: { alignSelf: 'stretch', gap: spazio[4] },
  rigaOpzioni: { alignSelf: 'stretch', flexDirection: 'row', gap: spazio[4] },
  cresce: { flex: 1, alignSelf: 'stretch' },
  attenuato: { opacity: opacita.campoDisabilitato },
  commento: { alignSelf: 'stretch', gap: spazio[8] },
  nota: {
    ...testi.bodyDetails,
    color: colori.testo.primario,
    alignSelf: 'stretch',
    minHeight: ALTEZZA_NOTA,
    padding: spazio[16],
    backgroundColor: colori.sfondo.card,
    borderRadius: raggio.foto,
  },
});
