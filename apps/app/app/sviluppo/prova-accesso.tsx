import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import * as Clipboard from 'expo-clipboard';

import { accedi } from '@/servizi/accesso';
import { leggi, rimuovi, scrivi } from '@/servizi/archivio';
import { leggiStato } from '@/servizi/statoCliente';
import { colori, margine, spazio, testi } from '@/ui/theme';

// Diagnostica di sviluppo (rotta protetta da __DEV__): verifica il collegamento a Supabase e il portachiavi
// senza digitare sul simulatore. Usa solo un account sintetico e una password sbagliata: nessuna scrittura.
const ACCOUNT_SINTETICO = 'aless.marchetto6+test@gmail.com';

export default function ProvaAccesso() {
  const [righe, setRighe] = useState<string[]>(['avvio…']);
  useEffect(() => {
    let attive = true;
    const esito: string[] = [];
    const scrivi_ = (r: string) => {
      esito.push(r);
      if (attive) setRighe([...esito]);
    };
    (async () => {
      try {
        const chiave = 'balanced.prova';
        const valore = 'x'.repeat(5000) + 'fine';
        await scrivi(chiave, valore);
        const letto = await leggi(chiave);
        await rimuovi(chiave);
        scrivi_(`portachiavi a pezzi (5 004 caratteri): ${letto === valore ? 'OK' : 'KO'}; dopo la rimozione: ${(await leggi(chiave)) === null ? 'vuoto' : 'KO'}`);
      } catch (e) {
        scrivi_(`portachiavi: errore ${String(e)}`);
      }
      try {
        await Clipboard.setStringAsync('prova appunti balanced');
        scrivi_(`appunti: ${(await Clipboard.getStringAsync()) === 'prova appunti balanced' ? 'OK' : 'KO'}`);
      } catch (e) {
        scrivi_(`appunti: errore ${String(e)}`);
      }
      const stato = await leggiStato({ forza: true });
      scrivi_(`leggiStato senza sessione: ${stato.tipo}`);
      const t0 = Date.now();
      const login = await accedi(ACCOUNT_SINTETICO, 'password-sbagliata-di-prova');
      scrivi_(`accedi con password sbagliata (${Date.now() - t0} ms): ${login.ok ? 'OK (inatteso)' : login.errore}`);
      const dopo = await leggiStato({ forza: true });
      scrivi_(`leggiStato dopo il tentativo: ${dopo.tipo}`);
      scrivi_('FINE');
    })();
    return () => {
      attive = false;
    };
  }, []);
  return (
    <SafeAreaView style={stili.pagina}>
      <ScrollView contentContainerStyle={stili.contenuto}>
        {righe.map((r, i) => (
          <Text key={i} style={stili.riga}>
            {r}
          </Text>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const stili = StyleSheet.create({
  pagina: { flex: 1, backgroundColor: colori.sfondo.pagina },
  contenuto: { padding: margine.pagina, gap: spazio[12] },
  riga: { ...testi.bodyDetails, color: colori.testo.primario },
});
