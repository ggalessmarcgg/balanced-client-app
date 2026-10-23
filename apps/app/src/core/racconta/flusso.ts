// Macchina a stati di "Racconta" (sezione Figma 3.1: lotto 1 da "Racconta" a "Il tuo racconto", lotto 2 la
// compilazione del diario). Funzione pura: riceve lo stato e un evento, restituisce il nuovo stato e gli effetti da
// eseguire (chiedere il permesso, avviare o fermare il registratore, trascrivere, compilare, salvare o cancellare
// l'audio e il racconto). Chi la usa (src/servizi/racconta.ts) esegue
// gli effetti e rimanda qui gli esiti come eventi.
import { limiteRaggiunto, livelloDaDecibel } from './audio.ts';
import type { AudioRacconto, TestoRacconto } from './attesa.ts';
import type { ErroreTrascrizione } from './server.ts';

export type PermessoMicrofono = 'concesso' | 'negato' | 'daChiedere';

/** Avviso nella schermata Pronto: nessuno, "Non ho capito" (Figma 11, dal lotto 2) o registrazione non riuscita. */
export type AvvisoPronto = 'nessuno' | 'nonHoCapito' | 'registrazioneNonRiuscita';

export type StatoRacconta =
  /** All'apertura: si leggono permesso e audio in attesa. */
  | { tipo: 'avvio' }
  /** Racconta · 2: consenso e richiesta del permesso. */
  | { tipo: 'permesso'; inRichiesta: boolean }
  /** Racconta · 3: permesso negato nelle impostazioni. */
  | { tipo: 'microfonoDisattivato' }
  /** Racconta · 4 (e 11 con l'avviso). */
  | { tipo: 'pronto'; avviso: AvvisoPronto }
  /** Racconta · 5: `inPausa` quando l'app è in secondo piano o una chiamata interrompe; `fermando` dopo lo stop, in attesa del file; `livello` 0–1 dal microfono. */
  | { tipo: 'registrazione'; durataMs: number; inPausa: boolean; fermando: boolean; livello: number }
  /** Racconta · 5.2: registrazione terminata, l'audio è sul telefono; la trascrizione parte solo con il pulsante "Da inviare". */
  | { tipo: 'terminata'; audio: AudioRacconto }
  /** Racconta · 7.1: audio inviato al server. */
  | { tipo: 'trascrizione'; audio: AudioRacconto }
  /** Racconta · 10: audio salvato sul telefono, si riprova da soli al ritorno della rete. */
  | { tipo: 'senzaConnessione'; audio: AudioRacconto; inRiprova: boolean }
  /** Racconta · 12 e varianti: errore del server; con `audio` c'è "Riprova", senza si ricomincia. */
  | { tipo: 'errore'; audio: AudioRacconto | null; errore: ErroreTrascrizione }
  /** Racconta · 6: il racconto trascritto, modificabile a mano. */
  | { tipo: 'racconto'; testo: string; durataMs: number; data: string }
  /** Racconta · 7: "Preparando il tuo diario" (compilazione in corso, senza freccia indietro). */
  | { tipo: 'compilazione'; racconto: TestoRacconto }
  /** Diario compilato e già messo nella bozza di oggi: la schermata passa al riepilogo (Racconta · 8). */
  | { tipo: 'compilato'; data: string }
  /** Racconta · 12 "Elaborazione non riuscita": il racconto resta salvato; con un errore riprovabile c'è "Riprova". */
  | { tipo: 'erroreCompilazione'; racconto: TestoRacconto; errore: ErroreTrascrizione };

export type EventoRacconta =
  | { tipo: 'avviato'; permesso: PermessoMicrofono; audioInAttesa: AudioRacconto | null; testoInAttesa: TestoRacconto | null }
  | { tipo: 'consenti' }
  | { tipo: 'permessoRisposto'; concesso: boolean }
  | { tipo: 'avvia' }
  | { tipo: 'avviataRegistrazione' }
  | { tipo: 'registrazioneNonRiuscita' }
  /** Lettura periodica del registratore: durata, se sta registrando, livello in dB. */
  | { tipo: 'avanzamento'; durataMs: number; registrando: boolean; livelloDb?: number | null }
  | { tipo: 'pausa' }
  | { tipo: 'riprendi' }
  | { tipo: 'ferma' }
  | { tipo: 'registrata'; audio: AudioRacconto }
  /** Il pulsante "Da inviare" della 5.2: parte la trascrizione. */
  | { tipo: 'invia' }
  | { tipo: 'trascritta'; testo: string; durataMs: number }
  | { tipo: 'trascrizioneFallita'; errore: ErroreTrascrizione }
  /** "Riprova" (dalla schermata d'errore, con caricamento visibile) o nuovo tentativo silenzioso senza rete. */
  | { tipo: 'riprova'; silenzioso?: boolean }
  | { tipo: 'modificaTesto'; testo: string }
  | { tipo: 'ricomincia' }
  /** "Crea il mio diario" da "Il tuo racconto". */
  | { tipo: 'creaDiario' }
  /** Il server ha compilato il diario e la bozza di oggi è già aggiornata. */
  | { tipo: 'compilato' }
  /** Il server non ha capito il racconto (vuoto, incomprensibile o fuori tema). */
  | { tipo: 'nonCapito' }
  | { tipo: 'compilazioneFallita'; errore: ErroreTrascrizione }
  /** La schermata si smonta (qualunque sia il motivo): il registratore che possedeva non esiste più. */
  | { tipo: 'uscita' }
  | { tipo: 'azzera' };

export type EffettoRacconta =
  | { tipo: 'chiediPermesso' }
  | { tipo: 'avviaRegistrazione' }
  | { tipo: 'fermaRegistrazione'; motivo: 'tocco' | 'limite' }
  | { tipo: 'mettiInPausa' }
  | { tipo: 'riprendiRegistrazione' }
  | { tipo: 'salvaAudio'; audio: AudioRacconto }
  | { tipo: 'trascrivi'; audio: AudioRacconto }
  | { tipo: 'cancellaAudio'; uri: string }
  /** Il testo trascritto (o corretto) va nella cartella documenti fino a fine giornata o alla creazione del diario. */
  | { tipo: 'salvaTesto'; racconto: TestoRacconto }
  | { tipo: 'cancellaTesto' }
  /** Il racconto va al server con la bozza di oggi; il diario restituito diventa la bozza (servizi/racconta.ts). */
  | { tipo: 'compila'; racconto: TestoRacconto };

export type Transizione = { stato: StatoRacconta; effetti: EffettoRacconta[] };

export const STATO_INIZIALE: StatoRacconta = { tipo: 'avvio' };

function resta(stato: StatoRacconta): Transizione {
  return { stato, effetti: [] };
}

function pronto(avviso: AvvisoPronto = 'nessuno'): StatoRacconta {
  return { tipo: 'pronto', avviso };
}

function trascrivi(audio: AudioRacconto): Transizione {
  return { stato: { tipo: 'trascrizione', audio }, effetti: [{ tipo: 'trascrivi', audio }] };
}

function compila(racconto: TestoRacconto): Transizione {
  return { stato: { tipo: 'compilazione', racconto }, effetti: [{ tipo: 'compila', racconto }] };
}

/** Lo stato dopo un evento, con gli effetti da eseguire. Gli eventi fuori posto non cambiano nulla. */
export function riduci(stato: StatoRacconta, evento: EventoRacconta): Transizione {
  switch (evento.tipo) {
    case 'azzera':
      return resta(STATO_INIZIALE);

    case 'uscita':
      // Una registrazione in corso (o in pausa, o in arresto) vive solo con la schermata che possiede il registratore:
      // uscendo si riparte dall'avvio, mai da una registrazione "bloccata" senza registratore. Gli altri stati restano
      // (l'audio terminato e il racconto sono sul telefono, una trascrizione in corso arriva comunque).
      // Il diario compilato è già nella bozza: si riparte dall'avvio (la prossima apertura registra un racconto nuovo).
      return resta(stato.tipo === 'registrazione' || stato.tipo === 'compilato' ? STATO_INIZIALE : stato);

    case 'avviato': {
      if (stato.tipo !== 'avvio') return resta(stato);
      // Un racconto di oggi già trascritto si riprende da "Il tuo racconto"; un audio di oggi non ancora inviato dalla
      // schermata "Registrazione terminata" (la trascrizione parte solo su richiesta), senza registrare di nuovo.
      if (evento.testoInAttesa) return resta({ tipo: 'racconto', ...evento.testoInAttesa });
      if (evento.audioInAttesa) return resta({ tipo: 'terminata', audio: evento.audioInAttesa });
      if (evento.permesso === 'concesso') return resta(pronto());
      if (evento.permesso === 'negato') return resta({ tipo: 'microfonoDisattivato' });
      return resta({ tipo: 'permesso', inRichiesta: false });
    }

    case 'consenti':
      if (stato.tipo !== 'permesso' || stato.inRichiesta) return resta(stato);
      return { stato: { tipo: 'permesso', inRichiesta: true }, effetti: [{ tipo: 'chiediPermesso' }] };

    case 'permessoRisposto':
      if (stato.tipo !== 'permesso' && stato.tipo !== 'microfonoDisattivato') return resta(stato);
      return resta(evento.concesso ? pronto() : { tipo: 'microfonoDisattivato' });

    case 'avvia':
      if (stato.tipo !== 'pronto') return resta(stato);
      return { stato: { tipo: 'registrazione', durataMs: 0, inPausa: false, fermando: false, livello: 0 }, effetti: [{ tipo: 'avviaRegistrazione' }] };

    case 'avviataRegistrazione':
      return resta(stato);

    case 'registrazioneNonRiuscita':
      if (stato.tipo !== 'registrazione') return resta(stato);
      return resta(pronto('registrazioneNonRiuscita'));

    case 'avanzamento': {
      if (stato.tipo !== 'registrazione' || stato.fermando) return resta(stato);
      // Il registratore sta ancora partendo (prepareToRecordAsync → record): una lettura "non sta registrando" prima che
      // il tempo sia mai avanzato non è una pausa, è lo stato precedente all'avvio arrivato in ritardo (difetto del
      // 23/10/2026: "In pausa" per un istante sopra il livello della voce). Lo stato resta com'è.
      if (!evento.registrando && evento.durataMs === 0 && stato.durataMs === 0) return resta(stato);
      const durataMs = Math.max(stato.durataMs, evento.durataMs);
      const livello = evento.registrando ? livelloDaDecibel(evento.livelloDb) : 0;
      // Allo scadere dei 3 minuti si ferma da sola (contratto §1.2).
      if (limiteRaggiunto(durataMs)) {
        return { stato: { ...stato, durataMs, livello, fermando: true }, effetti: [{ tipo: 'fermaRegistrazione', motivo: 'limite' }] };
      }
      return resta({ ...stato, durataMs, livello, inPausa: !evento.registrando });
    }

    case 'pausa':
      if (stato.tipo !== 'registrazione' || stato.fermando || stato.inPausa) return resta(stato);
      return { stato: { ...stato, inPausa: true }, effetti: [{ tipo: 'mettiInPausa' }] };

    case 'riprendi':
      if (stato.tipo !== 'registrazione' || stato.fermando || !stato.inPausa) return resta(stato);
      return { stato: { ...stato, inPausa: false }, effetti: [{ tipo: 'riprendiRegistrazione' }] };

    case 'ferma':
      if (stato.tipo !== 'registrazione' || stato.fermando) return resta(stato);
      return { stato: { ...stato, fermando: true }, effetti: [{ tipo: 'fermaRegistrazione', motivo: 'tocco' }] };

    case 'registrata':
      // Arriva sia dalla promessa dello stop sia dall'ascoltatore del registratore: conta la prima. Il file resta sul
      // telefono e la trascrizione parte solo dal pulsante "Da inviare" (decisione del 23/10/2026).
      if (stato.tipo !== 'registrazione') return resta(stato);
      return { stato: { tipo: 'terminata', audio: evento.audio }, effetti: [{ tipo: 'salvaAudio', audio: evento.audio }] };

    case 'invia':
      if (stato.tipo !== 'terminata') return resta(stato);
      return trascrivi(stato.audio);

    case 'trascritta': {
      if (stato.tipo !== 'trascrizione' && stato.tipo !== 'senzaConnessione') return resta(stato);
      // L'audio si cancella dal telefono subito dopo una trascrizione riuscita (contratto §1.6).
      const cancella: EffettoRacconta = { tipo: 'cancellaAudio', uri: stato.audio.uri };
      // Silenzio o quasi: "Non ho capito" (Figma 11) senza passare da un racconto vuoto.
      if (raccontoVuoto(evento.testo)) return { stato: pronto('nonHoCapito'), effetti: [cancella] };
      const racconto: TestoRacconto = { testo: evento.testo, durataMs: evento.durataMs, data: stato.audio.data };
      return { stato: { tipo: 'racconto', ...racconto }, effetti: [cancella, { tipo: 'salvaTesto', racconto }] };
    }

    case 'trascrizioneFallita': {
      if (stato.tipo !== 'trascrizione' && stato.tipo !== 'senzaConnessione') return resta(stato);
      const { audio } = stato;
      const { errore } = evento;
      if (errore.esito === 'rete') return resta({ tipo: 'senzaConnessione', audio, inRiprova: false });
      if (errore.esito === 'riprovabile') return resta({ tipo: 'errore', audio, errore });
      // Esiti definitivi: l'audio non serve più.
      return { stato: { tipo: 'errore', audio: null, errore }, effetti: [{ tipo: 'cancellaAudio', uri: audio.uri }] };
    }

    case 'riprova': {
      if (stato.tipo === 'senzaConnessione') {
        if (stato.inRiprova) return resta(stato);
        // Senza rete si riprova in silenzio: la schermata resta "Senza connessione" finché il server non risponde.
        if (evento.silenzioso) return { stato: { ...stato, inRiprova: true }, effetti: [{ tipo: 'trascrivi', audio: stato.audio }] };
        return trascrivi(stato.audio);
      }
      if (stato.tipo === 'errore' && stato.audio) return trascrivi(stato.audio);
      if (stato.tipo === 'erroreCompilazione' && (stato.errore.esito === 'riprovabile' || stato.errore.esito === 'rete')) return compila(stato.racconto);
      return resta(stato);
    }

    case 'modificaTesto': {
      if (stato.tipo !== 'racconto') return resta(stato);
      const nuovo = { ...stato, testo: evento.testo };
      return { stato: nuovo, effetti: [{ tipo: 'salvaTesto', racconto: { testo: nuovo.testo, durataMs: nuovo.durataMs, data: nuovo.data } }] };
    }

    case 'ricomincia': {
      // Da "Il tuo racconto", da una registrazione terminata, da un errore o da "Senza connessione" si torna a Pronto;
      // l'audio o il testo rimasti si cancellano.
      if (stato.tipo === 'racconto') return { stato: pronto(), effetti: [{ tipo: 'cancellaTesto' }] };
      if (stato.tipo === 'errore' && !stato.audio) return resta(pronto());
      if (stato.tipo === 'terminata') return { stato: pronto(), effetti: [{ tipo: 'cancellaAudio', uri: stato.audio.uri }] };
      if (stato.tipo === 'errore' && stato.audio) return { stato: pronto(), effetti: [{ tipo: 'cancellaAudio', uri: stato.audio.uri }] };
      if (stato.tipo === 'senzaConnessione') return { stato: pronto(), effetti: [{ tipo: 'cancellaAudio', uri: stato.audio.uri }] };
      if (stato.tipo === 'erroreCompilazione') return { stato: pronto(), effetti: [{ tipo: 'cancellaTesto' }] };
      if (stato.tipo === 'pronto') return resta(pronto());
      return resta(stato);
    }

    case 'creaDiario':
      // Il testo così com'è (eventualmente corretto a mano) va al server; resta salvato finché il diario non è creato.
      if (stato.tipo !== 'racconto') return resta(stato);
      return compila({ testo: stato.testo, durataMs: stato.durataMs, data: stato.data });

    case 'compilato':
      // La bozza di oggi è già aggiornata: il racconto salvato sul telefono non serve più.
      if (stato.tipo !== 'compilazione') return resta(stato);
      return { stato: { tipo: 'compilato', data: stato.racconto.data }, effetti: [{ tipo: 'cancellaTesto' }] };

    case 'nonCapito':
      // "Non ho capito" (Figma 11): si torna a Pronto per raccontare di nuovo; il racconto non serve più.
      if (stato.tipo !== 'compilazione') return resta(stato);
      return { stato: pronto('nonHoCapito'), effetti: [{ tipo: 'cancellaTesto' }] };

    case 'compilazioneFallita':
      if (stato.tipo !== 'compilazione') return resta(stato);
      return resta({ tipo: 'erroreCompilazione', racconto: stato.racconto, errore: evento.errore });
  }
}

/** Caratteri minimi perché una trascrizione valga come racconto: sotto è silenzio o rumore ("Non ho capito"). */
export const CARATTERI_MINIMI_RACCONTO = 10;

/** Vero se la trascrizione è vuota o quasi (silenzio, rumore): meno di dieci caratteri utili o nessuna lettera. */
export function raccontoVuoto(testo: string): boolean {
  const pulito = testo.replace(/\s+/g, ' ').trim();
  return pulito.length < CARATTERI_MINIMI_RACCONTO || !/\p{L}/u.test(pulito);
}

/** Vero se, uscendo dalla schermata, c'è una registrazione da scartare (in corso o terminata e non inviata): avviso di sistema prima di uscire. */
export function uscitaDaConfermare(stato: StatoRacconta): boolean {
  return stato.tipo === 'registrazione' || stato.tipo === 'terminata';
}

/**
 * Vero se il gesto di scorrimento indietro di iOS va disattivato: durante la registrazione e sulla 5.2 (uscita da
 * confermare) e durante la compilazione (uscita bloccata). Su iOS il gesto interattivo non si può annullare dopo che è
 * partito: la schermata uscirebbe e l'avviso comparirebbe solo dopo (difetto del 23/10/2026). Con la freccia l'avviso
 * compare prima di uscire; il tasto indietro di Android resta com'è (avviso). Negli altri stati il gesto resta attivo.
 */
export function gestoIndietroDisattivato(stato: StatoRacconta): boolean {
  return uscitaDaConfermare(stato) || uscitaBloccata(stato);
}

/** Giorno del diario a cui lo stato si riferisce (null per gli stati senza audio né racconto). */
export function dataDelloStato(stato: StatoRacconta): string | null {
  switch (stato.tipo) {
    case 'terminata':
    case 'trascrizione':
    case 'senzaConnessione':
      return stato.audio.data;
    case 'errore':
      return stato.audio?.data ?? null;
    case 'racconto':
      return stato.data;
    case 'compilazione':
    case 'erroreCompilazione':
      return stato.racconto.data;
    case 'compilato':
      return stato.data;
    default:
      return null;
  }
}

/** Vero durante la compilazione (Racconta · 7, senza freccia indietro): l'uscita non è possibile finché il server non risponde. */
export function uscitaBloccata(stato: StatoRacconta): boolean {
  return stato.tipo === 'compilazione';
}

/**
 * Vero se all'apertura della schermata il flusso deve ripartire dall'avvio: altro giorno del diario, una registrazione
 * rimasta senza registratore (la schermata precedente si è smontata senza azzerare) o un diario già compilato.
 */
export function ripartiDallAvvio(stato: StatoRacconta, oggi: string): boolean {
  return stato.tipo === 'registrazione' || stato.tipo === 'compilato' || statoScaduto(stato, oggi);
}

/** Vero se lo stato appartiene a un altro giorno del diario: si riparte dall'avvio (l'audio scaduto lo cancella la lettura della nota). */
export function statoScaduto(stato: StatoRacconta, oggi: string): boolean {
  const data = dataDelloStato(stato);
  return data !== null && data !== oggi;
}
