import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import type { Nutrizionista } from '@/core/stato/stato';
import { BarraSuperiore } from '@/ui/BarraSuperiore';
import { CardNutrizionista } from '@/ui/CardNutrizionista';
import { Pulsante } from '@/ui/Pulsante';
import { ElencoSupporto } from '@/ui/schermate/ElencoSupporto';
import { Pagina } from '@/ui/schermate/Pagina';
import { Testo } from '@/ui/Testo';
import { colori, margine, spazio } from '@/ui/theme';

export type SchermataStatoSupportoProps = {
  /** Titolo (TitoloAccento per i saluti, Testo h2 per "Non troviamo il tuo percorso"). */
  titolo: ReactNode;
  testo: string;
  nutrizionista?: Nutrizionista | null;
  /** Pulsante secondario "Account" (assente in Stati 11). */
  onAccount?: () => void;
  onEsci: () => void;
  onEmailSupporto?: () => void;
  onTelefonoSupporto?: () => void;
  onNutrizionista?: () => void;
};

/**
 * Schermate di stato con il blocco Supporto (Figma Stati 6, 7, 11, 12): barra superiore con le icone nascoste,
 * saluto, Supporto, card della nutrizionista; in fondo "Account" e "Esci".
 */
export function SchermataStatoSupporto({ titolo, testo, nutrizionista, onAccount, onEsci, onEmailSupporto, onTelefonoSupporto, onNutrizionista }: SchermataStatoSupportoProps) {
  return (
    <Pagina
      piede={
        <View style={stili.comandi}>
          {onAccount && <Pulsante etichetta="Account" livello="secondario" onPress={onAccount} />}
          <Pulsante etichetta="Esci" livello="terziario" onPress={onEsci} style={stili.centrato} />
        </View>
      }
    >
      <BarraSuperiore notifiche="nascosta" azione="nascosta" />
      <View style={stili.contenuto}>
        <View style={stili.saluto}>
          {titolo}
          <Testo stile="body" colore={colori.testo.corpoAttenuato}>
            {testo}
          </Testo>
        </View>
        <View style={stili.gruppo}>
          <ElencoSupporto onEmail={onEmailSupporto} onTelefono={onTelefonoSupporto} />
          {nutrizionista && <CardNutrizionista nome={nutrizionista.nome} foto={nutrizionista.foto} onPress={onNutrizionista} />}
        </View>
      </View>
    </Pagina>
  );
}

// Misure da Figma 558:4206: Contenuto pt 16 / px 20, gap 24; Saluto gap 8; gruppo gap 12; Comandi pt 12 / pb 8 / px 20, gap 4.
const stili = StyleSheet.create({
  contenuto: { flex: 1, paddingTop: spazio[16], paddingHorizontal: margine.pagina, gap: spazio[24] },
  saluto: { gap: spazio[8] },
  gruppo: { gap: spazio[12] },
  centrato: { alignSelf: 'center' },
  comandi: { paddingTop: spazio[12], paddingBottom: spazio[8], paddingHorizontal: margine.pagina, gap: spazio[4], alignItems: 'center' },
});
