import { Fragment, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import type { Ricetta } from '@/core/ricette/server';
import { rigaPorzioni, sottotitoloRicetta, testoIngrediente } from '@/core/ricette/tempo';
import type { NotificaPiano } from '@/servizi/useSostituzione';
import { Intestazione } from '@/ui/Intestazione';
import { EtichettaAI } from '@/ui/piano/EtichettaAI';
import { CardSpiegazioneAI } from '@/ui/piano/PannelloSostituzione';
import { Pulsante } from '@/ui/Pulsante';
import { NotificaInBasso } from '@/ui/schermate/NotificaInBasso';
import { Pagina } from '@/ui/schermate/Pagina';
import { Separatore } from '@/ui/Separatore';
import { Testo } from '@/ui/Testo';
import { colori, margine, spazio } from '@/ui/theme';

export const TESTI_PAGINA_RICETTA = {
  etichetta: 'Ricetta',
  ingredienti: 'Ingredienti',
  preparazione: 'Preparazione',
  salva: 'Salva ricetta',
  salvata: 'Salvata',
  elimina: 'Elimina ricetta',
} as const;

/** L'azione in fondo: "Salva ricetta" (appena preparata; "Salvata" disattivo dopo il salvataggio) o "Elimina ricetta" (dalle tue ricette). */
export type AzioneRicetta =
  | { tipo: 'salva'; stato: 'normale' | 'inCorso' | 'salvata'; onPress: () => void }
  | { tipo: 'elimina'; stato: 'normale' | 'inCorso'; onPress: () => void };

export type SchermataRicettaProps = {
  ricetta: Ricetta;
  /** Nome del pasto di partenza, nel sottotitolo ("20 minuti · Pranzo"). */
  pasto: string;
  azione: AzioneRicetta;
  onIndietro: () => void;
  /** Notifica breve in fondo ("Ricetta salvata", errori di salvataggio o eliminazione). */
  notifica?: NotificaPiano | null;
  onNotificaScomparsa?: () => void;
  onRiprovaNotifica?: () => void;
  sovrapposti?: ReactNode;
  /** Pagina di sviluppo: parte scorsa in fondo (screenshot della card AI e del pulsante). */
  scorriInFondoAllAvvio?: boolean;
};

/**
 * Ricetta a pagina intera (Figma Piano · 5.4 539:3500, 5.5 più porzioni 818:7834, 5.6 salvata 818:7907, Menu · 7.2
 * 818:7983): intestazione con la sola freccia (12 sopra), contenuto scorrevole (16 sopra, margini 20, 40 sotto, gap 24)
 * con Etichetta AI, titolo H2 e sottotitolo Body details secondario (gap 4), Ingredienti (Heading, eventuale riga della
 * porzione, righe "nome · quantità" con Separatore), Preparazione (Heading, paragrafi Body, gap 12), Card spiegazione AI
 * e il pulsante in fondo al contenuto. Stessa navigazione delle pagine del menu.
 */
export function SchermataRicetta({ ricetta, pasto, azione, onIndietro, notifica, onNotificaScomparsa, onRiprovaNotifica, sovrapposti, scorriInFondoAllAvvio }: SchermataRicettaProps) {
  const porzioni = rigaPorzioni(ricetta.porzioni);
  return (
    <Pagina
      scorriInFondoAllAvvio={scorriInFondoAllAvvio}
      sovrapposti={
        <>
          {notifica && <NotificaInBasso key={notifica.chiave} testo={notifica.testo} tipo={notifica.tipo} onScomparsa={onNotificaScomparsa} onRiprova={notifica.tipo === 'errore' ? onRiprovaNotifica : undefined} />}
          {sovrapposti}
        </>
      }
    >
      <View style={stili.intestazione}>
        <Intestazione mostraTitolo={false} onIndietro={onIndietro} />
      </View>
      <View style={stili.contenuto}>
        <EtichettaAI etichetta={TESTI_PAGINA_RICETTA.etichetta} />
        <View style={stili.titolo}>
          <Testo stile="h2" accessibilityRole="header">
            {ricetta.titolo}
          </Testo>
          <Testo stile="bodyDetails" colore={colori.testo.secondario}>
            {sottotitoloRicetta(ricetta.tempoMinuti, ricetta.riposoMinuti, pasto)}
          </Testo>
        </View>
        {ricetta.ingredienti.length > 0 && (
          <View style={stili.sezione}>
            <Testo stile="heading" accessibilityRole="header">
              {TESTI_PAGINA_RICETTA.ingredienti}
            </Testo>
            {porzioni && (
              <Testo stile="bodyDetails" colore={colori.testo.secondario}>
                {porzioni}
              </Testo>
            )}
            <View style={stili.elenco}>
              {ricetta.ingredienti.map((ing, i) => (
                <Fragment key={i}>
                  {i > 0 && <Separatore />}
                  <View style={stili.riga}>
                    <Testo stile="body">{testoIngrediente(ing.nome, ing.quantita)}</Testo>
                  </View>
                </Fragment>
              ))}
            </View>
          </View>
        )}
        {ricetta.preparazione.length > 0 && (
          <View style={stili.preparazione}>
            <Testo stile="heading" accessibilityRole="header">
              {TESTI_PAGINA_RICETTA.preparazione}
            </Testo>
            {ricetta.preparazione.map((p, i) => (
              <Testo key={i} stile="body">
                {p}
              </Testo>
            ))}
          </View>
        )}
        {ricetta.spiegazione && <CardSpiegazioneAI spiegazione={{ primo: ricetta.spiegazione, secondo: null }} />}
        {azione.tipo === 'salva' ? (
          <Pulsante
            etichetta={azione.stato === 'salvata' ? TESTI_PAGINA_RICETTA.salvata : TESTI_PAGINA_RICETTA.salva}
            stato={azione.stato === 'salvata' ? 'disabilitato' : azione.stato === 'inCorso' ? 'caricamento' : 'normale'}
            onPress={azione.onPress}
            accessibilityHint="Salva la ricetta tra le tue ricette"
          />
        ) : (
          <Pulsante etichetta={TESTI_PAGINA_RICETTA.elimina} livello="secondario" stato={azione.stato === 'inCorso' ? 'caricamento' : 'normale'} onPress={azione.onPress} accessibilityHint="Elimina la ricetta dalle tue ricette" />
        )}
      </View>
    </Pagina>
  );
}

const stili = StyleSheet.create({
  intestazione: { paddingTop: spazio[12], paddingHorizontal: margine.pagina },
  contenuto: { paddingTop: spazio[16], paddingHorizontal: margine.pagina, paddingBottom: spazio[40], gap: spazio[24] },
  titolo: { alignSelf: 'stretch', gap: spazio[4] },
  sezione: { alignSelf: 'stretch', gap: spazio[8] },
  elenco: { alignSelf: 'stretch' },
  riga: { alignSelf: 'stretch', paddingVertical: spazio[10] },
  preparazione: { alignSelf: 'stretch', gap: spazio[12] },
});
