import { StyleSheet, View } from 'react-native';

import { emailValida } from '@/core/accesso/errori';
import { CampoTesto } from '@/ui/CampoTesto';
import { Intestazione } from '@/ui/Intestazione';
import { Messaggio } from '@/ui/Messaggio';
import { Pulsante } from '@/ui/Pulsante';
import { Pagina } from '@/ui/schermate/Pagina';
import { TitoloAccento } from '@/ui/schermate/TitoloAccento';
import { Testo } from '@/ui/Testo';
import { colori, spazio } from '@/ui/theme';

export type SchermataRecuperoProps = {
  email: string;
  onEmail: (v: string) => void;
  onInvia: () => void;
  onIndietro: () => void;
  inCorso?: boolean;
  /** Messaggio di errore a livello di schermata (rete, limite di invio). */
  errore?: string;
};

/** Recupero password · Email (Figma 425:286): "Ti mandiamo un link" → resetPasswordForEmail; nessun codice a 6 cifre. */
export function SchermataRecupero({ email, onEmail, onInvia, onIndietro, inCorso = false, errore }: SchermataRecuperoProps) {
  const valida = emailValida(email);
  return (
    <Pagina
      sfondo={colori.sfondo.card}
      piede={
        <View style={stili.azioni}>
          <Pulsante etichetta="Invia il link" stato={inCorso ? 'caricamento' : valida ? 'normale' : 'disabilitato'} onPress={onInvia} />
        </View>
      }
    >
      <View style={stili.corpo}>
        <Intestazione titolo="Recupera password" contesto="accesso" onIndietro={onIndietro} />
        <View style={stili.gruppoTesti}>
          <TitoloAccento prima="Ti mandiamo un " accento="link" contesto="accesso" />
          <Testo stile="body">{"Inserisci l'email del tuo account: riceverai un link per scegliere una nuova password."}</Testo>
        </View>
        <CampoTesto
          etichetta="Email"
          valore={email}
          onChangeText={onEmail}
          segnaposto="La tua email"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          autoFocus
          returnKeyType="send"
          onSubmitEditing={valida ? onInvia : undefined}
          testID="recupero-email"
        />
        {errore && <Messaggio tipo="errore" testo={errore} />}
      </View>
    </Pagina>
  );
}

const stili = StyleSheet.create({
  corpo: { flex: 1, paddingTop: spazio[32], paddingHorizontal: spazio[32], gap: spazio[24] },
  gruppoTesti: { gap: spazio[8] },
  azioni: { paddingTop: spazio[16], paddingHorizontal: spazio[32], gap: spazio[8], alignItems: 'center' },
});
