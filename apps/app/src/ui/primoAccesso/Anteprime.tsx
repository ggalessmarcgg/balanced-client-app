import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';

import type { RigaSettimana } from '@/core/diario/letture';
import { giorniSettimana } from '@/core/diario/settimana';
import type { RigaPiano } from '@/core/piano/composizione';
import { TESTI_CAROSELLO } from '@/core/primoAccesso/carosello';
import { BarraSuperiore } from '@/ui/BarraSuperiore';
import { CardDiario, SalutoDiario } from '@/ui/diario/CardDiario';
import { CardSettimana } from '@/ui/diario/CardSettimana';
import { PulsanteTondo } from '@/ui/diario/PulsanteTondo';
import { Icona } from '@/ui/icone';
import { Logo } from '@/ui/Logo';
import { GruppoRighe } from '@/ui/piano/ContenutoPiano';
import { EtichettaAIToccabile } from '@/ui/piano/EtichettaAI';
import { SelettoreSegmentato } from '@/ui/piano/SelettoreSegmentato';
import { Testo } from '@/ui/Testo';
import { colori, margine, raggio, spazio } from '@/ui/theme';

// Anteprime del carosello (Figma Primo accesso · 2 586:4966 e · 4 586:5068): una card bianca 380 di altezza, raggio card,
// che ritaglia la schermata vera (Oggi · 1 con l'andamento, Piano · 1 fisso) ridotta all'84 % (330,12 / 393) e alzata
// di 40, così la barra di stato resta fuori. Le anteprime sono composte con gli stessi componenti delle schermate.
const ALTEZZA_ANTEPRIMA = 380;
const LARGHEZZA_SCHERMATA = 393;
const SCALA = 0.84;
const SPOSTAMENTO_ALTO = -40;
const BARRA_DI_STATO = 59;

/** Oggi · 1 della schermata di esempio: venerdì 9 ottobre 2026, L M condivisi, M non condiviso, G condiviso. */
const OGGI = '2026-10-09';
function riga(data: string): RigaSettimana {
  return { id: data, submission_date: data, status: 'submitted', updated_at: null, energy_level: null, satiety_level: null, hydration_level: null, sport_type: null, sport_duration: null, nutritionist_comment: null, comment_author_id: null, comment_acknowledged: null, review_status: 'positive' };
}
const SETTIMANA = [riga('2026-10-05'), riga('2026-10-06'), riga('2026-10-08')];
const GIORNI = giorniSettimana(OGGI, SETTIMANA);

function Cornice({ children }: { children: ReactNode }) {
  return (
    <View style={stili.anteprima} accessible={false} importantForAccessibility="no-hide-descendants" pointerEvents="none">
      <View style={stili.schermata}>
        <View style={stili.barraDiStato} />
        {children}
      </View>
    </View>
  );
}

/** Pagina 2: Oggi con la Card diario da iniziare e la Card settimana. */
export function AnteprimaOggi() {
  return (
    <Cornice>
      <BarraSuperiore />
      <View style={stili.contenutoOggi}>
        <CardDiario>
          <SalutoDiario prima="Ciao " accento="Giulia, " dopo="come è andata oggi?" dataEtichetta="Venerdì 9 ottobre" />
          <View style={stili.scelta}>
            <PulsanteTondo etichetta="Scrivi" icona={<Icona misura={32} nome="Matita" />} />
            <PulsanteTondo etichetta="Racconta" icona={<Icona misura={24} nome="Microfono" dimensione={32} />} />
          </View>
        </CardDiario>
        <CardSettimana giorni={GIORNI} />
      </View>
    </Cornice>
  );
}

const GIORNI_PIANO = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];
const GIORNO_SELEZIONATO = 3;
const rigaPiano = (testo: string): RigaPiano => ({ id: null, nome: testo, quantita: null, testo });
const COLAZIONE = [rigaPiano('Yogurt greco bianco · 150 g'), rigaPiano('Fiocchi d’avena · 3 cucchiai'), rigaPiano('Frutti di bosco · a piacere')];
const SPUNTINO = [rigaPiano('Mela · 1 frutto')];

/** Pagina 4: Piano fisso con il selettore dei giorni, "Ricetta" e la colazione. */
export function AnteprimaPiano() {
  const posizione = useSharedValue(GIORNO_SELEZIONATO);
  return (
    <Cornice>
      <BarraSuperiore />
      <View style={stili.intestazionePiano}>
        <Testo stile="accentoSerif">Piano</Testo>
        <SelettoreSegmentato voci={GIORNI_PIANO} posizione={posizione} indice={GIORNO_SELEZIONATO} onSeleziona={() => {}} />
      </View>
      <View style={stili.contenutoPiano}>
        <View style={stili.rigaRicetta}>
          <EtichettaAIToccabile etichetta="Ricetta" />
        </View>
        <View style={stili.gruppi}>
          <GruppoRighe titolo="Colazione" righe={COLAZIONE} />
          <GruppoRighe titolo="Spuntino" righe={SPUNTINO} />
        </View>
      </View>
    </Cornice>
  );
}

/** Logo nell'icona dell'app (40, sfondo/card, raggio badge): 71,1 % = 13,47 × 24. */
const ICONA_APP = 40;
const LOGO_ICONA = 24;

/** Pagina 5: tre "Notifica di esempio" (Figma 586:5190): card bianca, padding 14, gap 12, raggio contenuto, ombra. */
export function NotificheEsempio() {
  return (
    <View style={stili.notifiche} accessible accessibilityLabel="Esempi di notifiche">
      {TESTI_CAROSELLO.notificheEsempio.map((testo) => (
        <View key={testo} style={stili.notifica}>
          <View style={stili.iconaApp}>
            <Logo altezza={LOGO_ICONA} />
          </View>
          <View style={stili.testiNotifica}>
            <Testo stile="caption" colore={colori.testo.secondario}>
              {TESTI_CAROSELLO.mittente}
            </Testo>
            <Testo stile="etichettaPiccola">{testo}</Testo>
          </View>
        </View>
      ))}
    </View>
  );
}

const stili = StyleSheet.create({
  anteprima: { alignSelf: 'stretch', height: ALTEZZA_ANTEPRIMA, borderRadius: raggio.card, backgroundColor: colori.sfondo.pagina, overflow: 'hidden' },
  schermata: { position: 'absolute', top: SPOSTAMENTO_ALTO, left: 0, width: LARGHEZZA_SCHERMATA, transform: [{ scale: SCALA }], transformOrigin: 'top left' },
  barraDiStato: { height: BARRA_DI_STATO },
  contenutoOggi: { paddingTop: spazio[16], paddingHorizontal: margine.pagina, gap: spazio[12] },
  scelta: { alignSelf: 'stretch', flexDirection: 'row', justifyContent: 'center', gap: spazio[4] },
  intestazionePiano: { paddingTop: spazio[16], paddingHorizontal: margine.pagina, gap: spazio[24] },
  contenutoPiano: { paddingTop: spazio[24], paddingHorizontal: margine.pagina, gap: spazio[24] },
  rigaRicetta: { alignSelf: 'stretch', flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', paddingLeft: spazio[4], marginBottom: -spazio[24] },
  gruppi: { alignSelf: 'stretch', gap: spazio[24] },
  notifiche: { alignSelf: 'stretch', gap: spazio[4] },
  // Ombra della card (Figma: 0 6 20 al 8 %): nessun token per le ombre, valori dal disegno; su Android l'elevazione.
  notifica: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spazio[12],
    padding: spazio[14],
    borderRadius: raggio.contenuto,
    backgroundColor: colori.sfondo.pagina,
    shadowColor: colori.testo.primario,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  iconaApp: { width: ICONA_APP, height: ICONA_APP, borderRadius: raggio.badge, backgroundColor: colori.sfondo.card, alignItems: 'center', justifyContent: 'center' },
  testiNotifica: { flex: 1, gap: spazio[2] },
});
