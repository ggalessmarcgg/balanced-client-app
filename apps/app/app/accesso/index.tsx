import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { TipoErroreAccesso } from '@/core/accesso/errori';
import { accedi, ATTESA_REINVIO_SECONDI, reinviaConferma } from '@/servizi/accesso';
import { NotificaBreve } from '@/ui/NotificaBreve';
import { SchermataAccesso, type VarianteAccesso } from '@/ui/schermate/SchermataAccesso';
import { Testo } from '@/ui/Testo';
import { colori, margine, spazio } from '@/ui/theme';

type Fase = { tipo: 'normale' } | { tipo: 'errore'; errore: TipoErroreAccesso } | { tipo: 'conferma'; errore?: TipoErroreAccesso };

/**
 * Login (Figma 425:224 / 425:252) con le varianti Email non confermata (562:4254) e link inviato (562:4319).
 * Credenziali errate → messaggio terracotta; email_not_confirmed → messaggio info e "Invia di nuovo il link"
 * con attesa di 60 s tra un invio e l'altro; ?avviso=recupero mostra la notifica breve del link di recupero.
 */
export default function RottaAccesso() {
  const router = useRouter();
  const { avviso } = useLocalSearchParams<{ avviso?: string }>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fase, setFase] = useState<Fase>({ tipo: 'normale' });
  const [inCorso, setInCorso] = useState(false);
  const [scadenzaReinvio, setScadenzaReinvio] = useState<number | null>(null);
  const [secondi, setSecondi] = useState(0);
  const [notifica, setNotifica] = useState(avviso === 'recupero');

  // Conto alla rovescia del reinvio: aggiorna i secondi finché la scadenza non è passata.
  useEffect(() => {
    if (scadenzaReinvio === null) return;
    const aggiorna = () => {
      const rimasti = Math.max(0, Math.ceil((scadenzaReinvio - Date.now()) / 1000));
      setSecondi(rimasti);
      if (rimasti === 0) setScadenzaReinvio(null);
    };
    aggiorna();
    const timer = setInterval(aggiorna, 500);
    return () => clearInterval(timer);
  }, [scadenzaReinvio]);

  const onEmail = useCallback((v: string) => {
    setEmail(v);
    setFase((f) => (f.tipo === 'errore' ? { tipo: 'normale' } : f));
  }, []);
  const onPassword = useCallback((v: string) => {
    setPassword(v);
    setFase((f) => (f.tipo === 'errore' ? { tipo: 'normale' } : f));
  }, []);

  const onAccedi = useCallback(async () => {
    if (inCorso) return;
    setInCorso(true);
    const esito = await accedi(email, password);
    setInCorso(false);
    if (esito.ok) {
      router.replace('/');
      return;
    }
    setFase(esito.errore === 'emailNonConfermata' ? { tipo: 'conferma' } : { tipo: 'errore', errore: esito.errore });
  }, [email, password, inCorso, router]);

  const onReinvia = useCallback(async () => {
    if (inCorso || scadenzaReinvio !== null) return;
    setInCorso(true);
    const esito = await reinviaConferma(email);
    setInCorso(false);
    if (esito.ok) {
      setFase({ tipo: 'conferma' });
      setScadenzaReinvio(Date.now() + ATTESA_REINVIO_SECONDI * 1000);
    } else {
      setFase({ tipo: 'conferma', errore: esito.errore });
    }
  }, [email, inCorso, scadenzaReinvio]);

  const onPasswordDimenticata = useCallback(() => {
    router.push({ pathname: '/accesso/recupero', params: email ? { email } : {} });
  }, [router, email]);

  const variante: VarianteAccesso =
    fase.tipo === 'conferma'
      ? scadenzaReinvio !== null
        ? { tipo: 'linkInviato', secondiRimanenti: secondi }
        : { tipo: 'emailNonConfermata', errore: fase.errore }
      : fase;

  return (
    <SchermataAccesso
      email={email}
      password={password}
      onEmail={onEmail}
      onPassword={onPassword}
      onAccedi={onAccedi}
      onPasswordDimenticata={onPasswordDimenticata}
      onReinvia={onReinvia}
      variante={variante}
      inCorso={inCorso}
      sovrapposti={
        <>
          {notifica && <NotificaRecupero onScomparsa={() => setNotifica(false)} />}
          {__DEV__ && <LinkSviluppo />}
        </>
      }
    />
  );
}

function NotificaRecupero({ onScomparsa }: { onScomparsa: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[stili.notifica, { bottom: insets.bottom + spazio[16] }]} pointerEvents="box-none">
      <NotificaBreve tipo="conferma" testo="Ti abbiamo inviato il link per scegliere una nuova password." onScomparsa={onScomparsa} />
    </View>
  );
}

// Solo in sviluppo: accesso alle pagine dei componenti e degli stati senza entrare.
function LinkSviluppo() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[stili.sviluppo, { top: insets.top }]} pointerEvents="box-none">
      <Link href="/sviluppo/stati" accessibilityRole="link">
        <Testo stile="caption" colore={colori.testo.terziario}>
          sviluppo · stati
        </Testo>
      </Link>
      <Link href="/sviluppo/componenti" accessibilityRole="link">
        <Testo stile="caption" colore={colori.testo.terziario}>
          componenti
        </Testo>
      </Link>
    </View>
  );
}

const stili = StyleSheet.create({
  notifica: { position: 'absolute', left: margine.pagina, right: margine.pagina },
  sviluppo: { position: 'absolute', right: margine.pagina, flexDirection: 'row', gap: spazio[12], paddingVertical: spazio[4] },
});
