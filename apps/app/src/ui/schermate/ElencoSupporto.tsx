import { StyleSheet, View } from 'react-native';

import { SUPPORTO } from '@/core/accesso/costanti';
import { RigaElenco } from '@/ui/RigaElenco';
import { Separatore } from '@/ui/Separatore';
import { Testo } from '@/ui/Testo';
import { colori, raggio, spazio } from '@/ui/theme';

export type ElencoSupportoProps = {
  onEmail?: () => void;
  onTelefono?: () => void;
};

/**
 * Blocco "Supporto" delle schermate di stato (Figma 558:4206 e seguenti): etichetta e card crema con le due
 * righe (email e numero). Toccando una riga il contatto viene copiato negli appunti (icona Copia): nessun
 * reindirizzamento fuori dall'app.
 */
export function ElencoSupporto({ onEmail, onTelefono }: ElencoSupportoProps) {
  return (
    <View style={stili.blocco}>
      <Testo stile="etichetta" accessibilityRole="header">
        Supporto
      </Testo>
      <View style={stili.elenco}>
        <RigaElenco tipo="copia" etichetta={SUPPORTO.email} onPress={onEmail} />
        <Separatore />
        <RigaElenco tipo="copia" etichetta={SUPPORTO.telefono} onPress={onTelefono} />
      </View>
    </View>
  );
}

const stili = StyleSheet.create({
  blocco: { alignSelf: 'stretch', gap: spazio[8] },
  elenco: { alignSelf: 'stretch', paddingHorizontal: spazio[24], paddingVertical: spazio[8], backgroundColor: colori.sfondo.card, borderRadius: raggio.card },
});
