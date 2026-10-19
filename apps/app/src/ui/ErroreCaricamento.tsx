import { StyleSheet, View } from 'react-native';

import { Icona } from '@/ui/icone';
import { Pulsante } from '@/ui/Pulsante';
import { Testo } from '@/ui/Testo';
import { colori, spazio } from '@/ui/theme';

export type ErroreCaricamentoProps = {
  descrizione?: string;
  onRiprova?: () => void;
};

/** Pagina non caricata (Figma 563:294): icona Offline 36, descrizione al 70 % centrata e Pulsante secondario "Riprova". */
export function ErroreCaricamento({
  descrizione = 'Non riusciamo a caricare questa pagina, controlla la connessione e riprova.',
  onRiprova,
}: ErroreCaricamentoProps) {
  return (
    <View style={stili.blocco}>
      <Icona misura={36} nome="Offline" />
      <Testo stile="bodyDetails" colore={colori.testo.attenuato} style={stili.descrizione} accessibilityRole="alert">
        {descrizione}
      </Testo>
      <Pulsante etichetta="Riprova" livello="secondario" onPress={onRiprova} />
    </View>
  );
}

const stili = StyleSheet.create({
  blocco: { alignSelf: 'stretch', alignItems: 'center', gap: spazio[12] },
  descrizione: { alignSelf: 'stretch', textAlign: 'center' },
});
