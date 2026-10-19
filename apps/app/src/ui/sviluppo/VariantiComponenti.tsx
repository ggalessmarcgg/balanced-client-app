import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { BarraSuperiore } from '@/ui/BarraSuperiore';
import { CampoPassword } from '@/ui/CampoPassword';
import { CampoTesto, type StatoCampo } from '@/ui/CampoTesto';
import { Intestazione } from '@/ui/Intestazione';
import { Logo } from '@/ui/Logo';
import { Messaggio } from '@/ui/Messaggio';
import { Opzione } from '@/ui/Opzione';
import { Pulsante, type LivelloPulsante, type StatoPulsante } from '@/ui/Pulsante';
import { RigaElenco } from '@/ui/RigaElenco';
import { Separatore } from '@/ui/Separatore';
import { colori, spazio } from '@/ui/theme';

// Catalogo delle varianti dei componenti del lotto 2, nello stesso ordine dei set Figma: lo usano la
// pagina dei componenti (con le didascalie) e la rotta di confronto (solo i componenti, per lo screenshot).

export type Variante = { nome: string; figma?: string; elemento: ReactNode; larghezza?: number };
export type GruppoVarianti = { titolo: string; figma: string; varianti: Variante[] };

export const COMPONENTI = ['Pulsante', 'Campo di testo', 'Campo password', 'Messaggio', 'Intestazione', 'Logo', 'Barra superiore', 'Opzione', 'Riga elenco', 'Separatore'] as const;
export type NomeComponente = (typeof COMPONENTI)[number];

const LIVELLI: { nome: string; livello: LivelloPulsante }[] = [
  { nome: 'Primario', livello: 'primario' },
  { nome: 'Secondario', livello: 'secondario' },
  { nome: 'Terziario', livello: 'terziario' },
];
const STATI: { nome: string; stato: StatoPulsante }[] = [
  { nome: 'Normale', stato: 'normale' },
  { nome: 'Premuto', stato: 'premuto' },
  { nome: 'Disabilitato', stato: 'disabilitato' },
  { nome: 'Caricamento', stato: 'caricamento' },
];
const STATI_CAMPO: { nome: string; stato: StatoCampo; valore: string; messaggio?: string }[] = [
  { nome: 'Vuoto', stato: 'vuoto', valore: '' },
  { nome: 'Attivo', stato: 'attivo', valore: 'nome@email.it' },
  { nome: 'Compilato', stato: 'compilato', valore: 'nome@email.it' },
  { nome: 'Errore', stato: 'errore', valore: 'nome@email.it', messaggio: 'Inserisci un indirizzo email valido' },
  { nome: 'Disabilitato', stato: 'disabilitato', valore: '' },
];
const NOTIFICHE = [
  { nome: 'Campanella', notifiche: 'campanella' },
  { nome: 'Con nuove', notifiche: 'conNuove' },
  { nome: 'Nascosta', notifiche: 'nascosta' },
] as const;
const AZIONI = [
  { nome: 'Menu', azione: 'menu' },
  { nome: 'Chiudi', azione: 'chiudi' },
  { nome: 'Nascosta', azione: 'nascosta' },
] as const;
const FORME = [
  { nome: 'Standard', forma: 'standard' },
  { nome: 'Compatta', forma: 'compatta' },
  { nome: 'Su più righe', forma: 'suPiuRighe' },
] as const;

const nulla = () => {};

export function variantiDi(componente: NomeComponente): GruppoVarianti {
  switch (componente) {
    case 'Pulsante':
      return {
        titolo: 'Pulsante',
        figma: '418:62',
        varianti: [
          ...LIVELLI.flatMap((l) =>
            STATI.map((s) => ({
              nome: `${l.nome} · ${s.nome}`,
              elemento: <Pulsante etichetta="Accedi" livello={l.livello} stato={s.stato} onPress={nulla} />,
            })),
          ),
          { nome: 'Terziario compatto · Normale', elemento: <Pulsante etichetta="Accedi" livello="terziarioCompatto" onPress={nulla} /> },
          {
            nome: 'Terziario compatto evidenziato · Normale',
            elemento: <Pulsante etichetta="Accedi" livello="terziarioCompattoEvidenziato" onPress={nulla} />,
          },
        ],
      };
    case 'Campo di testo':
      return {
        titolo: 'Campo di testo',
        figma: '418:182',
        varianti: STATI_CAMPO.map((s) => ({
          nome: s.nome,
          elemento: <CampoTesto etichetta="Email" valore={s.valore} segnaposto="nome@email.it" stato={s.stato} messaggio={s.messaggio} keyboardType="email-address" />,
        })),
      };
    case 'Campo password':
      return {
        titolo: 'Campo password',
        figma: '418:250',
        varianti: STATI_CAMPO.map((s) => ({
          nome: s.nome,
          elemento: (
            <CampoPassword
              etichetta="Password"
              valore={s.valore ? '••••••••••' : ''}
              segnaposto="La tua password"
              stato={s.stato}
              messaggio={s.messaggio && 'Password non corretta'}
            />
          ),
        })),
      };
    case 'Messaggio':
      return {
        titolo: 'Messaggio',
        figma: '419:104',
        varianti: [
          { nome: 'Errore', elemento: <Messaggio tipo="errore" testo="Email o password non corrette. Riprova." /> },
          { nome: 'Info', elemento: <Messaggio tipo="info" testo="Email o password non corrette. Riprova." /> },
        ],
      };
    case 'Intestazione':
      return {
        titolo: 'Intestazione',
        figma: '638:416',
        varianti: [
          { nome: 'App', elemento: <Intestazione titolo="Recupera password" contesto="app" onIndietro={nulla} />, larghezza: 393 },
          { nome: 'Accesso', elemento: <Intestazione titolo="Recupera password" contesto="accesso" onIndietro={nulla} />, larghezza: 393 },
        ],
      };
    case 'Logo':
      return { titolo: 'Logo', figma: '625:254', varianti: [{ nome: 'Logo', elemento: <Logo etichetta="Balanced" /> }] };
    case 'Barra superiore':
      return {
        titolo: 'Barra superiore',
        figma: '625:382',
        varianti: NOTIFICHE.flatMap((n) =>
          AZIONI.map((a) => ({
            nome: `Notifiche ${n.nome} · Azione ${a.nome}`,
            elemento: <BarraSuperiore notifiche={n.notifiche} azione={a.azione} onNotifiche={nulla} onAzione={nulla} />,
            larghezza: 393,
          })),
        ),
      };
    case 'Opzione':
      return {
        titolo: 'Opzione',
        figma: '439:96',
        varianti: FORME.flatMap((f) => [
          { nome: `${f.nome} · Non selezionata`, elemento: <Opzione etichetta="Buona" forma={f.forma} selezionata={false} onPress={nulla} /> },
          { nome: `${f.nome} · Selezionata`, elemento: <Opzione etichetta="Buona" forma={f.forma} selezionata onPress={nulla} /> },
        ]),
      };
    case 'Riga elenco':
      return {
        titolo: 'Riga elenco',
        figma: '498:220',
        varianti: [
          { nome: 'Freccia', elemento: <RigaElenco tipo="freccia" etichetta="Informativa privacy" onPress={nulla} />, larghezza: 305 },
          { nome: 'Interruttore', elemento: <RigaElenco tipo="interruttore" etichetta="Informativa privacy" acceso onChange={nulla} />, larghezza: 305 },
          { nome: 'Valore', elemento: <RigaElenco tipo="valore" etichetta="Informativa privacy" valore="6 mesi" />, larghezza: 305 },
          { nome: 'Copia', elemento: <RigaElenco tipo="copia" etichetta="Informativa privacy" onPress={nulla} />, larghezza: 305 },
          {
            nome: 'Freccia con icona',
            elemento: <RigaElenco tipo="frecciaConIcona" icona="Account" etichetta="Informativa privacy" onPress={nulla} />,
            larghezza: 305,
          },
          {
            nome: 'Due righe',
            elemento: (
              <RigaElenco
                tipo="dueRighe"
                titolo="Revisione 12 · 2 ottobre"
                sottotitolo="Una settimana molto regolare: colazioni proteiche e cena leggera quasi ogni sera."
                onPress={nulla}
              />
            ),
            larghezza: 305,
          },
          {
            nome: 'Con avatar',
            elemento: <RigaElenco tipo="conAvatar" etichetta="La tua nutrizionista" nome="Dott.ssa Margherita Chiadò" onPress={nulla} />,
            larghezza: 353,
          },
          {
            nome: 'Notifica',
            elemento: (
              <RigaElenco tipo="notifica" titolo="Nuovo commento sul tuo diario" testo="Margherita ha commentato la tua giornata di giovedì." ora="Oggi, 09:12" />
            ),
            larghezza: 353,
          },
        ],
      };
    case 'Separatore':
      return { titolo: 'Separatore', figma: '625:383', varianti: [{ nome: 'Separatore', elemento: <Separatore /> }] };
  }
}

/** Riquadro di una variante: larghezza come il componente Figma (353 se non indicata), su sfondo pagina. */
export function RiquadroVariante({ variante, suCard = false }: { variante: Variante; suCard?: boolean }) {
  return (
    <View style={[stili.riquadro, { width: variante.larghezza ?? 353 }, suCard && stili.riquadroCard]}>{variante.elemento}</View>
  );
}

const stili = StyleSheet.create({
  riquadro: { alignItems: 'flex-start' },
  riquadroCard: { backgroundColor: colori.sfondo.card, paddingHorizontal: spazio[24] },
});
