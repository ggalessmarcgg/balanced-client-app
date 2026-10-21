import { useMemo, useState, type ReactNode } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';

import type { AndamentoSettimana } from '@/core/diario/andamento';
import type { DiarioLocale } from '@/core/diario/bozza';
import { etichettaData } from '@/core/diario/data';
import { BLOCCHI, haContenuto, TITOLI_BLOCCHI, type Blocco, type Diario, type Pasto } from '@/core/diario/modello';
import type { GiornoSettimana } from '@/core/diario/settimana';
import type { StatoPannello } from '@/servizi/usePannelloGiornata';
import { BarraSuperiore } from '@/ui/BarraSuperiore';
import type { VoceNavigazione } from '@/ui/BarraNavigazione';
import { BloccoCommento, BloccoPasti, BloccoSport, BloccoValori } from '@/ui/diario/Blocchi';
import { SezioneAndamento } from '@/ui/diario/CardAndamento';
import { CardDiario, ComandiDiario, SalutoDiario } from '@/ui/diario/CardDiario';
import { CardSettimana } from '@/ui/diario/CardSettimana';
import { IndicatoreAvanzamento } from '@/ui/diario/IndicatoreAvanzamento';
import { PannelloGiornata } from '@/ui/diario/PannelloGiornata';
import { PulsanteTondo } from '@/ui/diario/PulsanteTondo';
import { TransizioneBlocco } from '@/ui/diario/TransizioneBlocco';
import { Icona } from '@/ui/icone';
import type { NotificaBreveProps } from '@/ui/NotificaBreve';
import { NotificaInBasso } from '@/ui/schermate/NotificaInBasso';
import { Pagina } from '@/ui/schermate/Pagina';
import { BarraNavigazioneFissa, INGOMBRO_BARRA_NAVIGAZIONE } from '@/ui/schermate/SchermateTrasversali';
import { colori, margine, spazio } from '@/ui/theme';

/** Azioni del pannello della giornata (tutte opzionali: senza, i giorni della settimana non si aprono). */
export type AzioniPannelloGiornata = {
  pannello: StatoPannello | null;
  onApriGiorno: (data: string) => void;
  onChiudiPannello: () => void;
  onRiprovaPannello: () => void;
  onModifica: () => void;
  onChiudiModifica: () => void;
  onAvantiModifica: () => void;
  onIndietroModifica: () => void;
  onVaiAModifica: (blocco: Blocco) => void;
  onAggiornaGiornata: (diario: Diario) => void;
  /** Solo per la pagina di sviluppo. */
  schermoPieno?: boolean;
  pastoApertoIniziale?: Pasto | null;
};

export type SchermataOggiProps = {
  nome: string;
  locale: DiarioLocale;
  giorni: GiornoSettimana[];
  /** Andamento della settimana (lotto 4): tre grafici sotto la Card settimana, o le card "Pochi dati". */
  andamento: AndamentoSettimana;
  /** Blocco aperto; null = card chiusa (da iniziare / in bozza) o condivisa. */
  blocco: Blocco | null;
  inviando: boolean;
  onScrivi: () => void;
  onRacconta: () => void;
  onChiudi: () => void;
  onAvanti: () => void;
  onIndietro: () => void;
  /** Tacchetta dell'indicatore: va a quel blocco, avanti o indietro. */
  onVaiA: (blocco: Blocco) => void;
  onAggiorna: (diario: Diario) => void;
  onCondividi: () => void;
  onNavigazione?: (voce: VoceNavigazione) => void;
  /** Pallino rosso sulla voce Revisioni della barra (almeno una revisione Nuova). */
  revisioneNuova?: boolean;
  /** Icona Calendario della Card settimana: apre lo storico delle giornate. */
  onApriStorico?: () => void;
  onNotifiche?: () => void;
  onMenu?: () => void;
  /** Pasto aperto all'avvio (pagina di sviluppo). */
  pastoApertoIniziale?: Pasto | null;
  /** Nota del Commento a fuoco all'avvio (pagina di sviluppo: verifica della tastiera). */
  commentoAFuoco?: boolean;
  /** Notifica breve: sopra la barra di navigazione, o dentro il pannello se è aperto. */
  notifica?: NotificaBreveProps & { chiave?: string };
  /** Altri elementi sopra la pagina. */
  sovrapposti?: ReactNode;
  giornata?: AzioniPannelloGiornata;
  /** Pagina di sviluppo: parte scorsa in fondo (screenshot dell'andamento). */
  scorriInFondoAllAvvio?: boolean;
};

/**
 * Oggi (Figma 444:1103 … 446:3777): barra superiore completa, Card diario (chiusa, aperta su un passaggio, in bozza o
 * condivisa), Card settimana, andamento della settimana, barra di navigazione con Oggi attiva. Contenuto: 16 sopra,
 * margini 20, gap 12. Dal lotto 2 i giorni condivisi della Card settimana aprono il pannello della giornata.
 */
export function SchermataOggi({
  nome,
  locale,
  giorni,
  andamento,
  blocco,
  inviando,
  onScrivi,
  onRacconta,
  onChiudi,
  onAvanti,
  onIndietro,
  onVaiA,
  onAggiorna,
  onCondividi,
  onNavigazione,
  revisioneNuova = false,
  onApriStorico,
  onNotifiche,
  onMenu,
  pastoApertoIniziale = null,
  commentoAFuoco = false,
  notifica,
  sovrapposti,
  giornata,
  scorriInFondoAllAvvio = false,
}: SchermataOggiProps) {
  const [pastoAperto, setPastoAperto] = useState<Pasto | null>(pastoApertoIniziale);
  // Cambiando blocco si richiude l'eventuale pasto aperto (stato derivato in render dal cambio di `blocco`).
  const [bloccoPrecedente, setBloccoPrecedente] = useState(blocco);
  if (blocco !== bloccoPrecedente) {
    setBloccoPrecedente(blocco);
    if (blocco !== 'pasti') setPastoAperto(null);
  }

  // Scorrimento orizzontale del contenuto della card: verso sinistra il blocco successivo, verso destra il precedente.
  // Si attiva solo con un movimento chiaramente orizzontale; il cursore della sazietà non lo cede (termination request).
  const scorrimento = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > SOGLIA_INIZIO && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
        onPanResponderTerminationRequest: () => false,
        onPanResponderRelease: (_, g) => {
          if (g.dx < -SOGLIA_CAMBIO || g.vx < -VELOCITA_CAMBIO) onAvanti();
          else if (g.dx > SOGLIA_CAMBIO || g.vx > VELOCITA_CAMBIO) onIndietro();
        },
      }),
    [onAvanti, onIndietro],
  );

  const data = etichettaData(locale.data);
  const condiviso = locale.riga.tipo === 'condiviso';
  // In bozza (Figma 451:758): c'è una riga draft o un contenuto locale non ancora salvato → "Continua" in verde.
  const inBozza = locale.riga.tipo === 'bozza' || haContenuto(locale.diario);
  const pannelloAperto = giornata?.pannello !== null && giornata?.pannello !== undefined;
  const { chiave: chiaveNotifica, ...propsNotifica } = notifica ?? { chiave: undefined, testo: '', tipo: 'conferma' as const };
  // Con il pannello aperto la notifica sta sopra il pannello (strato successivo) e non deve evitare la barra di navigazione.
  const elementoNotifica = notifica ? <NotificaInBasso key={chiaveNotifica ?? notifica.testo} {...propsNotifica} sopra={pannelloAperto ? 0 : INGOMBRO_BARRA_NAVIGAZIONE} /> : null;

  return (
    <Pagina
      scorriInFondoAllAvvio={scorriInFondoAllAvvio}
      sovrapposti={
        <>
          <BarraNavigazioneFissa attiva="oggi" revisioneNuova={revisioneNuova} onSeleziona={onNavigazione} />
          {giornata && (
            <PannelloGiornata
              pannello={giornata.pannello}
              onChiudi={giornata.onChiudiPannello}
              onRiprova={giornata.onRiprovaPannello}
              onModifica={giornata.onModifica}
              onChiudiModifica={giornata.onChiudiModifica}
              onAvanti={giornata.onAvantiModifica}
              onIndietro={giornata.onIndietroModifica}
              onVaiA={giornata.onVaiAModifica}
              onAggiorna={giornata.onAggiornaGiornata}
              schermoPieno={giornata.schermoPieno}
              pastoApertoIniziale={giornata.pastoApertoIniziale}
            />
          )}
          {elementoNotifica}
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
              {inBozza ? (
                <PulsanteTondo
                  etichetta="Continua"
                  colore={colori.azione.primaria}
                  icona={<Icona misura={32} nome="Matita" colore={colori.azione.primaria} />}
                  onPress={onScrivi}
                  accessibilityHint="Riprende la bozza del diario"
                />
              ) : (
                <PulsanteTondo etichetta="Scrivi" icona={<Icona misura={32} nome="Matita" />} onPress={onScrivi} accessibilityHint="Compila il diario a blocchi" />
              )}
              <PulsanteTondo etichetta="Racconta" icona={<Icona misura={24} nome="Microfono" dimensione={32} />} onPress={onRacconta} accessibilityHint="Racconta la giornata a voce" />
            </View>
          </CardDiario>
        ) : (
          <View {...scorrimento.panHandlers}>
            <CardDiario aperta>
              <SalutoDiario prima="Ciao " accento={`${nome}, `} dopo="come è andata oggi?" dataEtichetta={data} />
              <IndicatoreAvanzamento
                attivo={BLOCCHI.indexOf(blocco)}
                passi={BLOCCHI.length}
                etichette={BLOCCHI.map((b) => TITOLI_BLOCCHI[b])}
                onSeleziona={(i) => {
                  const scelto = BLOCCHI[i];
                  if (scelto) onVaiA(scelto);
                }}
              />
              <TransizioneBlocco indice={BLOCCHI.indexOf(blocco)}>
                {blocco === 'pasti' && <BloccoPasti diario={locale.diario} onChange={onAggiorna} pastoAperto={pastoAperto} onApri={setPastoAperto} />}
                {blocco === 'valori' && <BloccoValori diario={locale.diario} onChange={onAggiorna} />}
                {blocco === 'sport' && <BloccoSport diario={locale.diario} onChange={onAggiorna} />}
                {blocco === 'commento' && <BloccoCommento diario={locale.diario} onChange={onAggiorna} onCondividi={onCondividi} inviando={inviando} aFuoco={commentoAFuoco} />}
              </TransizioneBlocco>
              <ComandiDiario onChiudi={onChiudi} onAvanti={blocco === 'commento' ? undefined : onAvanti} />
            </CardDiario>
          </View>
        )}
        <CardSettimana giorni={giorni} onApriGiorno={giornata?.onApriGiorno} onApriStorico={onApriStorico} />
        <SezioneAndamento andamento={andamento} />
      </View>
    </Pagina>
  );
}

// Scorrimento: parte oltre 16 pt in orizzontale; cambia blocco oltre 60 pt o con un gesto veloce.
const SOGLIA_INIZIO = 16;
const SOGLIA_CAMBIO = 60;
const VELOCITA_CAMBIO = 0.5;

const stili = StyleSheet.create({
  contenuto: {
    paddingTop: spazio[16],
    paddingHorizontal: margine.pagina,
    paddingBottom: INGOMBRO_BARRA_NAVIGAZIONE + spazio[16],
    gap: spazio[12],
  },
  scelta: { alignSelf: 'stretch', flexDirection: 'row', justifyContent: 'center', gap: spazio[4] },
});
