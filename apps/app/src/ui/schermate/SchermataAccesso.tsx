import { StyleSheet, Text, View } from 'react-native';

import { messaggioLinkInviato, MESSAGGI_ERRORE, type TipoErroreAccesso } from '@/core/accesso/errori';
import { CampoPassword } from '@/ui/CampoPassword';
import { CampoTesto } from '@/ui/CampoTesto';
import { Logo } from '@/ui/Logo';
import { Messaggio } from '@/ui/Messaggio';
import { Pulsante } from '@/ui/Pulsante';
import { Pagina } from '@/ui/schermate/Pagina';
import { TitoloAccento } from '@/ui/schermate/TitoloAccento';
import { Testo } from '@/ui/Testo';
import { colori, spazio, testi } from '@/ui/theme';

/**
 * Varianti della schermata di accesso (Figma 425:224, 425:252, 562:4254, 562:4319):
 * normale · errore (messaggio terracotta, campo password in errore) · emailNonConfermata (messaggio info,
 * "Invia di nuovo il link" e "Accedi") · linkInviato (messaggio con l'email e reinvio disabilitato con il conto alla
 * rovescia, sempre con "Accedi" sotto). Aggiornata a Figma del 19/10/2026.
 */
export type VarianteAccesso =
  | { tipo: 'normale' }
  | { tipo: 'errore'; errore: TipoErroreAccesso }
  | { tipo: 'emailNonConfermata'; errore?: TipoErroreAccesso }
  | { tipo: 'linkInviato'; secondiRimanenti: number };

export type SchermataAccessoProps = {
  email: string;
  password: string;
  onEmail: (v: string) => void;
  onPassword: (v: string) => void;
  onAccedi: () => void;
  onPasswordDimenticata: () => void;
  onReinvia: () => void;
  variante: VarianteAccesso;
  /** Quale azione è in corso: il pulsante corrispondente mostra il caricamento. */
  inCorso?: 'accesso' | 'reinvio' | false;
  /** Elementi sopra la pagina (notifica breve). */
  sovrapposti?: React.ReactNode;
};

export function SchermataAccesso({ email, password, onEmail, onPassword, onAccedi, onPasswordDimenticata, onReinvia, variante, inCorso = false, sovrapposti }: SchermataAccessoProps) {
  const conferma = variante.tipo === 'emailNonConfermata' || variante.tipo === 'linkInviato';
  const puoAccedere = email.trim().length > 0 && password.length > 0;
  const erroreCampo = variante.tipo === 'errore' && variante.errore === 'credenzialiErrate';
  return (
    <Pagina
      sfondo={colori.sfondo.card}
      sovrapposti={sovrapposti}
      piede={
        conferma ? (
          <View style={stili.azioniConferma}>
            {variante.tipo === 'linkInviato' ? (
              <Pulsante etichetta={`Invia di nuovo tra ${variante.secondiRimanenti} s`} livello="secondario" stato="disabilitato" />
            ) : (
              <Pulsante etichetta="Invia di nuovo il link" livello="secondario" stato={inCorso === 'reinvio' ? 'caricamento' : 'normale'} onPress={onReinvia} />
            )}
            <Pulsante etichetta="Accedi" stato={inCorso === 'accesso' ? 'caricamento' : puoAccedere ? 'normale' : 'disabilitato'} onPress={onAccedi} />
          </View>
        ) : (
          <View style={stili.azioni}>
            <Pulsante etichetta="Accedi" stato={inCorso === 'accesso' ? 'caricamento' : puoAccedere ? 'normale' : 'disabilitato'} onPress={onAccedi} />
            <Testo stile="bodyDetails" colore={colori.testo.attenuato} style={stili.nota}>
              Non hai ancora un account? <Text style={testi.etichettaPiccola130}>Viene creato quando prenoti la tua prima consulenza.</Text>
            </Testo>
          </View>
        )
      }
    >
      <View style={stili.corpo}>
        <Logo etichetta="Balanced" />
        <View style={stili.gruppoTesti}>
          <TitoloAccento prima="Accedi al tuo " accento="percorso" contesto="accesso" />
          <Testo stile="body">{"Usa l'email e la password che hai scelto quando hai prenotato la consulenza."}</Testo>
        </View>
        <View style={stili.gruppoCampi}>
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
            returnKeyType="next"
            testID="accesso-email"
          />
          <CampoPassword
            etichetta="Password"
            valore={password}
            onChangeText={onPassword}
            segnaposto="La tua password"
            stato={erroreCampo ? 'errore' : undefined}
            autoComplete="current-password"
            returnKeyType="go"
            onSubmitEditing={puoAccedere ? onAccedi : undefined}
            testID="accesso-password"
          />
          <Pulsante etichetta="Password dimenticata?" livello="terziario" onPress={onPasswordDimenticata} style={stili.centrato} />
        </View>
        {variante.tipo === 'errore' && <Messaggio tipo="errore" testo={MESSAGGI_ERRORE[variante.errore]} />}
        {variante.tipo === 'emailNonConfermata' && <Messaggio tipo="info" testo={MESSAGGI_ERRORE.emailNonConfermata} />}
        {variante.tipo === 'emailNonConfermata' && variante.errore && <Messaggio tipo="errore" testo={MESSAGGI_ERRORE[variante.errore]} />}
        {variante.tipo === 'linkInviato' && <Messaggio tipo="info" testo={messaggioLinkInviato(email.trim())} />}
      </View>
    </Pagina>
  );
}

// Misure da Figma 425:224: Corpo pt 32 / px 32, gap 24; gruppo testi gap 8; gruppo campi gap 16 centrato;
// Azioni pt 16 / px 32, gap 8 (versione conferma: pt 12 / pb 8, due pulsanti).
const stili = StyleSheet.create({
  corpo: { flex: 1, paddingTop: spazio[32], paddingHorizontal: spazio[32], gap: spazio[24], alignItems: 'flex-start' },
  gruppoTesti: { alignSelf: 'stretch', gap: spazio[8] },
  gruppoCampi: { alignSelf: 'stretch', gap: spazio[16], alignItems: 'center' },
  azioni: { paddingTop: spazio[16], paddingHorizontal: spazio[32], gap: spazio[8], alignItems: 'center' },
  azioniConferma: { paddingTop: spazio[12], paddingBottom: spazio[8], paddingHorizontal: spazio[32], gap: spazio[8], alignItems: 'center' },
  nota: { alignSelf: 'stretch', textAlign: 'center' },
  centrato: { alignSelf: 'center' },
});
