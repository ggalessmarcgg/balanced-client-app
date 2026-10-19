import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import type { DiarioLocale } from '@/core/diario/bozza';
import { etichettaData } from '@/core/diario/data';
import { BLOCCHI, type Blocco, type Diario, type Pasto } from '@/core/diario/modello';
import type { GiornoSettimana } from '@/core/diario/settimana';
import { BarraSuperiore } from '@/ui/BarraSuperiore';
import type { VoceNavigazione } from '@/ui/BarraNavigazione';
import { BloccoCommento, BloccoPasti, BloccoSport, BloccoValori } from '@/ui/diario/Blocchi';
import { CardDiario, ComandiDiario, SalutoDiario } from '@/ui/diario/CardDiario';
import { CardSettimana } from '@/ui/diario/CardSettimana';
import { IndicatoreAvanzamento } from '@/ui/diario/IndicatoreAvanzamento';
import { PulsanteTondo } from '@/ui/diario/PulsanteTondo';
import { Icona } from '@/ui/icone';
import { Pagina } from '@/ui/schermate/Pagina';
import { BarraNavigazioneFissa, INGOMBRO_BARRA_NAVIGAZIONE } from '@/ui/schermate/SchermateTrasversali';
import { margine, spazio } from '@/ui/theme';

export type SchermataOggiProps = {
  nome: string;
  locale: DiarioLocale;
  giorni: GiornoSettimana[];
  /** Blocco aperto; null = card chiusa (da iniziare / in bozza) o condivisa. */
  blocco: Blocco | null;
  inviando: boolean;
  onScrivi: () => void;
  onRacconta: () => void;
  onChiudi: () => void;
  onAvanti: () => void;
  onAggiorna: (diario: Diario) => void;
  onCondividi: () => void;
  onNavigazione?: (voce: VoceNavigazione) => void;
  onNotifiche?: () => void;
  onMenu?: () => void;
  /** Pasto aperto all'avvio (pagina di sviluppo). */
  pastoApertoIniziale?: Pasto | null;
  /** Notifica breve e altri elementi sopra la pagina. */
  sovrapposti?: ReactNode;
};

/**
 * Oggi (Figma 444:1103 … 446:3777): barra superiore completa, Card diario (chiusa, aperta su un passaggio, in bozza o
 * condivisa), Card settimana, barra di navigazione con Oggi attiva. Contenuto: 16 sopra, margini 20, gap 12.
 */
export function SchermataOggi({
  nome,
  locale,
  giorni,
  blocco,
  inviando,
  onScrivi,
  onRacconta,
  onChiudi,
  onAvanti,
  onAggiorna,
  onCondividi,
  onNavigazione,
  onNotifiche,
  onMenu,
  pastoApertoIniziale = null,
  sovrapposti,
}: SchermataOggiProps) {
  const [pastoAperto, setPastoAperto] = useState<Pasto | null>(pastoApertoIniziale);
  // Cambiando blocco si richiude l'eventuale pasto aperto (stato derivato in render dal cambio di `blocco`).
  const [bloccoPrecedente, setBloccoPrecedente] = useState(blocco);
  if (blocco !== bloccoPrecedente) {
    setBloccoPrecedente(blocco);
    if (blocco !== 'pasti') setPastoAperto(null);
  }

  const data = etichettaData(locale.data);
  const condiviso = locale.riga.tipo === 'condiviso';

  return (
    <Pagina
      sovrapposti={
        <>
          <BarraNavigazioneFissa attiva="oggi" onSeleziona={onNavigazione} />
          {sovrapposti}
        </>
      }
    >
      <BarraSuperiore onNotifiche={onNotifiche} onAzione={onMenu} />
      <View style={stili.contenuto}>
        {condiviso ? (
          <CardDiario>
            <SalutoDiario prima="Hai " accento="condiviso " dopo="la giornata!" dataEtichetta={data} />
          </CardDiario>
        ) : blocco === null ? (
          <CardDiario>
            <SalutoDiario prima="Ciao " accento={`${nome}, `} dopo="come è andata oggi?" dataEtichetta={data} />
            <View style={stili.scelta}>
              <PulsanteTondo etichetta="Scrivi" icona={<Icona misura={32} nome="Matita" />} onPress={onScrivi} accessibilityHint="Compila il diario a blocchi" />
              <PulsanteTondo etichetta="Racconta" icona={<Icona misura={24} nome="Microfono" dimensione={32} />} onPress={onRacconta} accessibilityHint="Racconta la giornata a voce" />
            </View>
          </CardDiario>
        ) : (
          <CardDiario aperta>
            <SalutoDiario prima="Ciao " accento={`${nome}, `} dopo="come è andata oggi?" dataEtichetta={data} />
            <IndicatoreAvanzamento attivo={BLOCCHI.indexOf(blocco)} passi={BLOCCHI.length} />
            {blocco === 'pasti' && <BloccoPasti diario={locale.diario} onChange={onAggiorna} pastoAperto={pastoAperto} onApri={setPastoAperto} />}
            {blocco === 'valori' && <BloccoValori diario={locale.diario} onChange={onAggiorna} />}
            {blocco === 'sport' && <BloccoSport diario={locale.diario} onChange={onAggiorna} />}
            {blocco === 'commento' && <BloccoCommento diario={locale.diario} onChange={onAggiorna} onCondividi={onCondividi} inviando={inviando} />}
            <ComandiDiario onChiudi={onChiudi} onAvanti={blocco === 'commento' ? undefined : onAvanti} />
          </CardDiario>
        )}
        <CardSettimana giorni={giorni} />
      </View>
    </Pagina>
  );
}

const stili = StyleSheet.create({
  contenuto: {
    paddingTop: spazio[16],
    paddingHorizontal: margine.pagina,
    paddingBottom: INGOMBRO_BARRA_NAVIGAZIONE + spazio[16],
    gap: spazio[12],
  },
  scelta: { alignSelf: 'stretch', flexDirection: 'row', justifyContent: 'center', gap: spazio[4] },
});
