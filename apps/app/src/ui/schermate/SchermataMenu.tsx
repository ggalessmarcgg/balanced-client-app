import { Fragment, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { BarraSuperiore } from '@/ui/BarraSuperiore';
import { Pulsante } from '@/ui/Pulsante';
import { RigaElenco } from '@/ui/RigaElenco';
import { Pagina } from '@/ui/schermate/Pagina';
import { Separatore } from '@/ui/Separatore';
import { Testo } from '@/ui/Testo';
import { colori, margine, spazio, type IconaPerMisura } from '@/ui/theme';

export type VoceMenu = 'nutrizionista' | 'appuntamenti' | 'pesoEMisure' | 'contenuti';

const VOCI: Record<VoceMenu, { etichetta: string; icona: IconaPerMisura[24] }> = {
  nutrizionista: { etichetta: 'La tua nutrizionista', icona: 'Nutrizionista' },
  appuntamenti: { etichetta: 'Appuntamenti', icona: 'Calendario semplice' },
  pesoEMisure: { etichetta: 'Peso e misure', icona: 'Grafico' },
  contenuti: { etichetta: 'Contenuti', icona: 'Contenuti' },
};

export type SchermataMenuProps = {
  /** Voci mostrate, nell'ordine di Figma; una voce compare solo quando la sua schermata esiste ("Le tue ricette" allo step 9). */
  voci: VoceMenu[];
  versione: string;
  onVoce: (voce: VoceMenu) => void;
  onChiudi: () => void;
  onEsci: () => void;
  sovrapposti?: ReactNode;
};

/**
 * Menu · 1 · Menu a tutta pagina (Figma 508:2614): barra superiore con la sola X, titolo "Menu" in Accento serif
 * (16 sopra, margini 20, gap 24), righe con icona 24 e freccia separate da Separatore (nessuna card); in fondo "Esci"
 * e la versione dell'app (Caption al 50 %), blocco con padding verticale 16.
 */
export function SchermataMenu({ voci, versione, onVoce, onChiudi, onEsci, sovrapposti }: SchermataMenuProps) {
  return (
    <Pagina
      sovrapposti={sovrapposti}
      piede={
        <View style={stili.uscita}>
          <Pulsante etichetta="Esci" livello="terziario" onPress={onEsci} style={stili.centrato} />
          <Testo stile="caption" colore={colori.testo.terziario}>
            {`Versione ${versione}`}
          </Testo>
        </View>
      }
    >
      <BarraSuperiore notifiche="nascosta" azione="chiudi" onAzione={onChiudi} />
      <View style={stili.contenuto}>
        <Testo stile="accentoSerif" accessibilityRole="header">
          Menu
        </Testo>
        <View style={stili.elenco} accessibilityRole="menu">
          {voci.map((voce, i) => (
            <Fragment key={voce}>
              {i > 0 && <Separatore />}
              <RigaElenco tipo="frecciaConIcona" etichetta={VOCI[voce].etichetta} icona={VOCI[voce].icona} onPress={() => onVoce(voce)} />
            </Fragment>
          ))}
        </View>
      </View>
    </Pagina>
  );
}

const stili = StyleSheet.create({
  contenuto: { flex: 1, paddingTop: spazio[16], paddingHorizontal: margine.pagina, gap: spazio[24] },
  elenco: { alignSelf: 'stretch' },
  uscita: { alignItems: 'center', paddingVertical: spazio[16] },
  centrato: { alignSelf: 'center' },
});
