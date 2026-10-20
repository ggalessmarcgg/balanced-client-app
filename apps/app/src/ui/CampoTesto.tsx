import { useState, type ComponentRef, type ReactNode, type Ref } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { Icona } from '@/ui/icone';
import { Testo } from '@/ui/Testo';
import { PROPRIETA_CAMPO, useCampoSopraTastiera } from '@/ui/tastiera';
import { colori, opacita, raggio, spazio, testi } from '@/ui/theme';

/** Stato del Campo di testo (Figma 418:182, proprietà "Stato"). Se omesso si ricava da valore, focus, messaggio e disabilitato. */
export type StatoCampo = 'vuoto' | 'attivo' | 'compilato' | 'errore' | 'disabilitato';

export type CampoTestoProps = {
  etichetta: string;
  valore: string;
  onChangeText?: (testo: string) => void;
  /** Messaggio di errore sotto il campo (proprietà "Messaggio"): se presente lo stato è "errore". */
  messaggio?: string;
  segnaposto?: string;
  disabilitato?: boolean;
  /** Forza uno stato (prove e pagina dei componenti). */
  stato?: StatoCampo;
  /** Elemento a destra del valore (es. l'occhio del Campo password). */
  accessorio?: ReactNode;
  /** Riferimento al TextInput (per passare il fuoco al campo successivo con Invio). */
  inputRef?: Ref<ComponentRef<typeof TextInput>>;
} & Pick<
  TextInputProps,
  | 'secureTextEntry'
  | 'keyboardType'
  | 'autoCapitalize'
  | 'autoComplete'
  | 'autoCorrect'
  | 'textContentType'
  | 'returnKeyType'
  | 'submitBehavior'
  | 'onSubmitEditing'
  | 'onFocus'
  | 'onBlur'
  | 'autoFocus'
  | 'testID'
>;

const BORDO = 1.5;

/**
 * Campo di testo con etichetta, campo e messaggio di errore. Campo alto 52 su sfondo/campo con raggio
 * foto; contorno 1,5 verde quando attivo, terracotta in errore; messaggio con icona Avviso a 16.
 */
export function CampoTesto({
  etichetta,
  valore,
  onChangeText,
  messaggio,
  segnaposto,
  disabilitato = false,
  stato,
  accessorio,
  inputRef,
  onFocus,
  onBlur,
  ...input
}: CampoTestoProps) {
  const [attivo, setAttivo] = useState(false);
  const { ref: contenitore, onFocus: fuocoTastiera, onBlur: sfuocoTastiera } = useCampoSopraTastiera();
  const statoEffettivo: StatoCampo =
    stato ?? (disabilitato ? 'disabilitato' : messaggio ? 'errore' : attivo ? 'attivo' : valore ? 'compilato' : 'vuoto');
  const conBordo = statoEffettivo === 'attivo' || statoEffettivo === 'errore';
  const mostraMessaggio = statoEffettivo === 'errore' && Boolean(messaggio);
  return (
    <View
      ref={contenitore}
      style={[stili.contenitore, statoEffettivo === 'disabilitato' && stili.contenitoreDisabilitato]}
      accessibilityState={{ disabled: statoEffettivo === 'disabilitato' }}
    >
      <Testo stile="bodyDetails">{etichetta}</Testo>
      <View
        style={[
          stili.campo,
          conBordo && stili.campoConBordo,
          statoEffettivo === 'attivo' && stili.campoAttivo,
          statoEffettivo === 'errore' && stili.campoErrore,
        ]}
      >
        <TextInput
          {...PROPRIETA_CAMPO}
          {...input}
          ref={inputRef}
          value={valore}
          onChangeText={onChangeText}
          placeholder={segnaposto}
          editable={statoEffettivo !== 'disabilitato'}
          onFocus={(e) => {
            setAttivo(true);
            fuocoTastiera();
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setAttivo(false);
            sfuocoTastiera();
            onBlur?.(e);
          }}
          accessibilityLabel={etichetta}
          accessibilityHint={mostraMessaggio ? messaggio : undefined}
          style={stili.valore}
        />
        {accessorio}
      </View>
      {mostraMessaggio && (
        <View style={stili.messaggio} accessibilityLiveRegion="polite">
          <Icona misura={24} nome="Avviso" dimensione={16} colore={colori.stato.errore} />
          <Testo stile="bodyDetails" colore={colori.testo.errore} style={stili.testoMessaggio}>
            {messaggio}
          </Testo>
        </View>
      )}
    </View>
  );
}

const stili = StyleSheet.create({
  contenitore: { alignSelf: 'stretch', gap: spazio[4] },
  contenitoreDisabilitato: { opacity: opacita.campoDisabilitato },
  campo: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spazio[8],
    minHeight: 52,
    paddingHorizontal: spazio[16],
    backgroundColor: colori.sfondo.campo,
    borderRadius: raggio.foto,
  },
  // Contorno interno in Figma: il padding resta 16 dal bordo esterno, quindi qui si sottrae lo spessore.
  campoConBordo: { borderWidth: BORDO, paddingHorizontal: spazio[16] - BORDO },
  campoAttivo: { borderColor: colori.bordo.selezione },
  campoErrore: { borderColor: colori.stato.errore },
  valore: { ...testi.body, color: colori.testo.primario, flex: 1, paddingVertical: 0, paddingHorizontal: 0 },
  messaggio: { flexDirection: 'row', alignItems: 'center', gap: spazio[6] },
  testoMessaggio: { flexShrink: 1 },
});
