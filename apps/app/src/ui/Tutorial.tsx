import { useCallback, useEffect, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';

import { riquadroNellaFinestra, stessoRiquadro, type Riquadro } from '@/core/tutorial/riquadro';
import { LARGHEZZA_SUGGERIMENTO, Suggerimento } from '@/ui/Suggerimento';
import { colori, margine, opacita, spazio } from '@/ui/theme';

/** Posizione nella finestra dell'elemento da evidenziare. */
export type RiquadroTutorial = Riquadro;

type Vista = ComponentRef<typeof View>;

/**
 * Misura nella finestra di un elemento dentro il contenuto scorrevole di una Pagina, fornita dalla Pagina stessa
 * (`null` se non si riesce). Serve perché dopo uno scorrimento programmato `measureInWindow` può restare alla posizione
 * di prima dello scorrimento: l'evento di scorrimento lo consuma il worklet di Reanimated sul thread dell'interfaccia e
 * l'albero di Fabric non riceve il nuovo spostamento (difetto del 23/10/2026, riepilogo di Racconta).
 */
export type MisuraNellaFinestra = (vista: Vista, esito: (riquadro: Riquadro | null) => void) => void;
/** Collegamento tra l'hook (nella schermata) e la Pagina, che gli dà la sua misura finché è montata (poi null). */
export type CollegaMisura = (misura: MisuraNellaFinestra | null) => void;

/**
 * Misura l'elemento da evidenziare: `ref` e `onLayout` vanno sul contenitore dell'elemento nella pagina; `riquadro`
 * è la sua posizione nella finestra, null finché non è misurato, se non sta per intero nello schermo o se il tutorial
 * non è attivo (in tutti questi casi il tutorial non compare). Se l'elemento sta nel contenuto scorrevole della Pagina,
 * la schermata passa `collegaMisura` alla Pagina e la misura passa da lei (vedi `MisuraNellaFinestra`); altrimenti
 * (elemento nel piede) si usa `measureInWindow`.
 */
export function useRiquadroTutorial(attivo: boolean): { ref: (v: Vista | null) => void; onLayout: () => void; riquadro: RiquadroTutorial | null; collegaMisura: CollegaMisura } {
  const { width: larghezzaFinestra, height: altezzaFinestra } = useWindowDimensions();
  const misuratore = useRef<MisuraNellaFinestra | null>(null);
  const vista = useRef<Vista | null>(null);
  const [riquadro, setRiquadro] = useState<RiquadroTutorial | null>(null);
  const misura = useCallback(() => {
    if (!attivo) return;
    const v = vista.current;
    if (!v) return;
    const esito = (r: Riquadro | null) => {
      const valido = r && riquadroNellaFinestra(r, { larghezza: larghezzaFinestra, altezza: altezzaFinestra }) ? r : null;
      setRiquadro((prec) => (stessoRiquadro(prec, valido) ? prec : valido));
    };
    const dallaPagina = misuratore.current;
    if (dallaPagina) dallaPagina(v, esito);
    else v.measureInWindow((x, y, larghezza, altezza) => esito({ x, y, larghezza, altezza }));
  }, [attivo, larghezzaFinestra, altezzaFinestra]);
  useEffect(() => {
    misura();
  }, [misura]);
  // Finché il tutorial è attivo e l'elemento non è ancora misurabile (scorrimento programmato non ancora applicato,
  // transizione di navigazione in corso, layout in arrivo) si riprova a intervalli per qualche secondo: senza, un solo
  // tentativo mancato lasciava il tutorial nascosto per sempre (difetto del 23/10/2026 al primo arrivo sul riepilogo).
  useEffect(() => {
    if (!attivo || riquadro) return;
    const timer = setInterval(misura, INTERVALLO_RIMISURA_MS);
    const fine = setTimeout(() => clearInterval(timer), DURATA_RIMISURA_MS);
    return () => {
      clearInterval(timer);
      clearTimeout(fine);
    };
  }, [attivo, riquadro, misura]);
  const ref = useCallback((v: Vista | null) => {
    vista.current = v;
  }, []);
  const collegaMisura = useCallback<CollegaMisura>((m) => {
    misuratore.current = m;
  }, []);
  // Da inattivo la misura non vale (l'elemento può essere cambiato): si rifà alla prossima attivazione.
  return { ref, onLayout: misura, riquadro: attivo ? riquadro : null, collegaMisura };
}

export type TutorialProps = {
  /** Posizione dell'elemento evidenziato; finché è null il tutorial non compare. */
  riquadro: RiquadroTutorial | null;
  /** Copia dell'elemento evidenziato, resa sopra il velo nella stessa posizione (non toccabile). */
  elemento: ReactNode;
  testo: string;
  /** "Ho capito", e anche un tocco sul velo: il tutorial si chiude e non ricompare. */
  onHoCapito: () => void;
  /**
   * Dove sta il fumetto rispetto all'elemento: sopra, centrato (Racconta, predefinito); sotto, allineato al margine
   * sinistro con la punta in alto (Tutorial · 1 del Piano 586:5457: fumetto a 20 dal bordo, 4 sotto l'evidenza);
   * sotto, allineato al margine destro con la punta sotto il centro dell'elemento (Tutorial · 2 586:5598).
   */
  disposizione?: 'sopraCentrato' | 'sottoASinistra' | 'sottoADestra';
  /** Indicazione del passo nel piede del fumetto ("1 di 2"); vuota nei tutorial a un solo fumetto. */
  passo?: string;
  /** Etichetta dell'azione ("Ho capito" predefinito, "Avanti" nel primo passo). */
  azione?: string;
};

/** Nuovi tentativi di misura dell'elemento da evidenziare: ogni 250 ms per 4 s. */
const INTERVALLO_RIMISURA_MS = 250;
const DURATA_RIMISURA_MS = 4000;

/** Distanza tra la punta del suggerimento e l'elemento evidenziato (Figma Tutorial · 3: 7 → spazio 8). */
const DISTANZA = spazio[8];
/** Con il fumetto sotto: 4 tra l'evidenza e la riga della punta (Figma 586:5457: evidenza fino a 356, suggerimento da 360). */
const DISTANZA_SOTTO = spazio[4];
/** Tutorial · 2 (586:5598): evidenza fino a 285, suggerimento da 287. */
const DISTANZA_SOTTO_DESTRA = spazio[2];

/**
 * Tutorial a schermo (sezione Figma 1.1, schema delle schermate Tutorial): velo testo/primario al 40 %, l'elemento
 * evidenziato sopra il velo nella sua posizione e il Suggerimento con la punta verso di lui; si chiude con "Ho capito"
 * e, per sicurezza, con un tocco sul velo (così non può mai bloccare la schermata).
 */
export function Tutorial({ riquadro, elemento, testo, onHoCapito, disposizione = 'sopraCentrato', passo, azione }: TutorialProps) {
  const { width: larghezzaFinestra } = useWindowDimensions();
  const [altezzaSuggerimento, setAltezzaSuggerimento] = useState(0);
  if (!riquadro) return null;
  const sotto = disposizione !== 'sopraCentrato';
  const sinistra = disposizione === 'sottoASinistra' ? margine.pagina : disposizione === 'sottoADestra' ? larghezzaFinestra - margine.pagina - LARGHEZZA_SUGGERIMENTO : Math.round((larghezzaFinestra - LARGHEZZA_SUGGERIMENTO) / 2);
  const alto = disposizione === 'sottoASinistra' ? riquadro.y + riquadro.altezza + DISTANZA_SOTTO : disposizione === 'sottoADestra' ? riquadro.y + riquadro.altezza + DISTANZA_SOTTO_DESTRA : riquadro.y - DISTANZA - altezzaSuggerimento;
  const centroPunta = disposizione === 'sottoADestra' ? riquadro.x + riquadro.larghezza / 2 - sinistra : undefined;
  return (
    <View style={StyleSheet.absoluteFill} accessibilityViewIsModal>
      <Pressable style={[StyleSheet.absoluteFill, stili.velo]} onPress={onHoCapito} accessible={false} />
      <View style={{ position: 'absolute', left: riquadro.x, top: riquadro.y, width: riquadro.larghezza, height: riquadro.altezza }} pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants">
        {elemento}
      </View>
      <View style={[stili.suggerimento, { left: sinistra, top: alto, opacity: altezzaSuggerimento > 0 ? 1 : 0 }]} onLayout={(e) => setAltezzaSuggerimento(e.nativeEvent.layout.height)}>
        <Suggerimento testo={testo} passo={passo} azione={azione} onHoCapito={onHoCapito} freccia={sotto ? 'sopra' : 'sotto'} centroPunta={centroPunta} />
      </View>
    </View>
  );
}

const stili = StyleSheet.create({
  velo: { backgroundColor: colori.testo.primario, opacity: opacita.veloTutorial },
  suggerimento: { position: 'absolute' },
});
