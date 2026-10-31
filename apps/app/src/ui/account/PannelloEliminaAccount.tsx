import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { TESTI_ELIMINAZIONE } from '@/core/account/account';
import { CampoPassword } from '@/ui/CampoPassword';
import { Messaggio } from '@/ui/Messaggio';
import { PannelloDalBasso } from '@/ui/PannelloDalBasso';
import { Pulsante } from '@/ui/Pulsante';
import { Testo } from '@/ui/Testo';
import { spazio } from '@/ui/theme';

export type PassoEliminazione = 'avviso' | 'conferma';

export type PannelloEliminaAccountProps = {
  /** null = chiuso. */
  passo: PassoEliminazione | null;
  onIndietro: () => void;
  onContinua: () => void;
  /** Azione finale: la richiesta al server con la password (contratto eliminazione account v0.1 §2). */
  onElimina: (password: string) => void;
  /** Il cliente modifica la password: il messaggio d'errore sotto il campo sparisce. */
  onCambioPassword?: () => void;
  /** Messaggio sotto il campo password (password errata, troppi tentativi). */
  errore?: string | null;
  /** Richiesta in corso: "Elimina definitivamente" mostra il caricamento. */
  inCorso?: boolean;
  /** Solo per la pagina di sviluppo: campo già compilato come nel disegno. */
  passwordIniziale?: string;
};

/**
 * Elimina account (Figma 499:2568 avviso, 499:2709 conferma): Pannello dal basso con titolo H2, blocco con gap 12
 * (Messaggio info e testo Body; nel secondo passo testo e Campo password) e due azioni terziarie centrate con gap 24
 * ("Indietro" in Etichetta; "Continua" in Body, "Elimina definitivamente" in Body testo/errore). Con `errore` il Campo
 * password è in stato errore con il messaggio; con `inCorso` il pulsante finale è in caricamento e "Indietro" è disabilitato.
 */
export function PannelloEliminaAccount({ passo, onIndietro, onContinua, onElimina, onCambioPassword, errore = null, inCorso = false, passwordIniziale = '' }: PannelloEliminaAccountProps) {
  const [password, setPassword] = useState(passwordIniziale);
  const conferma = passo === 'conferma';
  // Alla chiusura ("Indietro", tocco fuori) la password digitata non resta in memoria.
  const chiudi = () => {
    setPassword(passwordIniziale);
    onIndietro();
  };
  return (
    <PannelloDalBasso aperto={passo !== null} onChiudi={chiudi} etichetta={conferma ? TESTI_ELIMINAZIONE.confermaTitolo : TESTI_ELIMINAZIONE.avvisoTitolo}>
      <Testo stile="h2" accessibilityRole="header">
        {conferma ? TESTI_ELIMINAZIONE.confermaTitolo : TESTI_ELIMINAZIONE.avvisoTitolo}
      </Testo>
      {conferma ? (
        <View style={stili.blocco}>
          <Testo stile="body">{TESTI_ELIMINAZIONE.confermaTesto}</Testo>
          <CampoPassword
            etichetta={TESTI_ELIMINAZIONE.password}
            valore={password}
            onChangeText={(v) => {
              setPassword(v);
              onCambioPassword?.();
            }}
            messaggio={errore ?? undefined}
            disabilitato={inCorso}
            textContentType="password"
            returnKeyType="done"
            onSubmitEditing={() => {
              if (password && !inCorso) onElimina(password);
            }}
          />
        </View>
      ) : (
        <View style={stili.blocco}>
          <Messaggio tipo="info" testo={TESTI_ELIMINAZIONE.avvisoInfo} />
          <Testo stile="body">{TESTI_ELIMINAZIONE.avvisoTesto}</Testo>
        </View>
      )}
      <View style={stili.azioni}>
        <Pulsante etichetta={TESTI_ELIMINAZIONE.indietro} livello="terziarioEvidenziato" stato={inCorso ? 'disabilitato' : 'normale'} onPress={chiudi} />
        {conferma ? (
          <Pulsante etichetta={TESTI_ELIMINAZIONE.eliminaDefinitivamente} livello="terziarioPericolo" stato={inCorso ? 'caricamento' : password ? 'normale' : 'disabilitato'} onPress={() => onElimina(password)} />
        ) : (
          <Pulsante etichetta={TESTI_ELIMINAZIONE.continua} livello="terziario" onPress={onContinua} />
        )}
      </View>
    </PannelloDalBasso>
  );
}

const stili = StyleSheet.create({
  blocco: { alignSelf: 'stretch', gap: spazio[12] },
  azioni: { alignSelf: 'stretch', flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start', gap: spazio[24] },
});
