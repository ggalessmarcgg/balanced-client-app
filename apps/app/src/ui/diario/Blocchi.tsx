import type { ReactNode } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import {
  DURATE_SPORT,
  ETICHETTE_DURATA,
  ETICHETTE_ENERGIA,
  ETICHETTE_IDRATAZIONE,
  ETICHETTE_PASTI,
  ETICHETTE_SPORT,
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
import { Testo } from '@/ui/Testo';
import { colori, raggio, spazio, testi } from '@/ui/theme';

/** Blocco di un passaggio della Card diario (Figma "Pasti" 449:680 e omologhi): padding verticale 32, titolo Heading, gap 36. */
export function BloccoDiario({ blocco, children }: { blocco: Blocco; children: ReactNode }) {
  return (
    <View style={stili.blocco}>
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

type PropsBlocco = { diario: Diario; onChange: (diario: Diario) => void };

export type BloccoPastiProps = PropsBlocco & { pastoAperto: Pasto | null; onApri: (pasto: Pasto | null) => void };

/** Passaggio 1 · Pasti (Figma 449:696): le quattro righe pasto con gap 16, una sola aperta per volta. */
export function BloccoPasti({ diario, onChange, pastoAperto, onApri }: BloccoPastiProps) {
  return (
    <BloccoDiario blocco="pasti">
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
export function BloccoValori({ diario, onChange }: PropsBlocco) {
  return (
    <BloccoDiario blocco="valori">
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

// Disposizione delle opzioni sport come in Figma (449:894): riposo e camminata, poi 3, 2, 2; durate 3 + 2.
const RIGHE_SPORT: (TipoSport | 'riposo')[][] = [
  ['riposo', 'camminata'],
  ['corsa', 'pesi', 'bici'],
  ['nuoto', 'corpo-libero'],
  ['danza', 'altro'],
];
const RIGHE_DURATA: DurataSport[][] = [DURATE_SPORT.slice(0, 3), DURATE_SPORT.slice(3)];

/**
 * Passaggio 3 · Sport (Figma 449:921). "Oggi riposo" azzera tipo e durata; la durata si chiede solo con uno sport scelto
 * (il database riceve tipo e durata sempre insieme, altrimenti entrambi null).
 */
export function BloccoSport({ diario, onChange }: PropsBlocco) {
  const scegliSport = (tipo: TipoSport | 'riposo') => {
    if (tipo === 'riposo') onChange({ ...diario, riposo: true, sport_type: null, sport_duration: null });
    else onChange({ ...diario, riposo: false, sport_type: tipo });
  };
  return (
    <BloccoDiario blocco="sport">
      <Domanda etichetta="Cosa hai fatto oggi?">
        <View style={stili.griglia}>
          {RIGHE_SPORT.map((riga, i) => (
            <View key={i} style={stili.rigaOpzioni}>
              {riga.map((tipo) => (
                <Opzione
                  key={tipo}
                  etichetta={tipo === 'riposo' ? 'Oggi riposo' : ETICHETTE_SPORT[tipo]}
                  cresce
                  selezionata={tipo === 'riposo' ? diario.riposo : diario.sport_type === tipo}
                  onPress={() => scegliSport(tipo)}
                />
              ))}
            </View>
          ))}
        </View>
      </Domanda>
      {!diario.riposo && (
        <Domanda etichetta="Per quanto tempo?">
          <View style={stili.griglia}>
            {RIGHE_DURATA.map((riga, i) => (
              <View key={i} style={stili.rigaOpzioni}>
                {riga.map((durata) => (
                  <Opzione
                    key={durata}
                    etichetta={ETICHETTE_DURATA[durata]}
                    cresce
                    selezionata={diario.sport_duration === durata}
                    onPress={() => onChange({ ...diario, riposo: false, sport_duration: durata })}
                  />
                ))}
              </View>
            ))}
          </View>
        </Domanda>
      )}
    </BloccoDiario>
  );
}

export type BloccoCommentoProps = PropsBlocco & { onCondividi: () => void; inviando: boolean };

// Campo nota (Figma 449:961): alto 96 su sfondo/card, raggio foto, padding 16, segnaposto in Caption.
const ALTEZZA_NOTA = 96;

/** Passaggio 4 · Commento (Figma 449:966): nota libera e pulsante primario "Invia alla nutrizionista", gap 8. */
export function BloccoCommento({ diario, onChange, onCondividi, inviando }: BloccoCommentoProps) {
  return (
    <BloccoDiario blocco="commento">
      <View style={stili.commento}>
        <TextInput
          value={diario.day_comment}
          onChangeText={(testo) => onChange({ ...diario, day_comment: testo })}
          placeholder="C'è qualcosa che vuoi raccontare alla tua nutrizionista?"
          placeholderTextColor={colori.testo.segnaposto}
          multiline
          textAlignVertical="top"
          selectionColor={colori.azione.primaria}
          cursorColor={colori.azione.primaria}
          accessibilityLabel="Commento per la nutrizionista"
          style={stili.nota}
        />
        <Pulsante etichetta="Invia alla nutrizionista" onPress={onCondividi} stato={inviando ? 'caricamento' : 'normale'} accessibilityHint="Condivide la giornata: non si può annullare" />
      </View>
    </BloccoDiario>
  );
}

const stili = StyleSheet.create({
  blocco: { alignSelf: 'stretch', paddingVertical: spazio[32], gap: spazio[36] },
  domanda: { alignSelf: 'stretch', gap: spazio[10] },
  righe: { alignSelf: 'stretch', gap: spazio[16] },
  griglia: { alignSelf: 'stretch', gap: spazio[4] },
  rigaOpzioni: { alignSelf: 'stretch', flexDirection: 'row', gap: spazio[4] },
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
