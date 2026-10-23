// Macchina a stati di "Racconta" (sezione Figma 3.1, lotto 1: da "Racconta" a "Il tuo racconto"). Funzione pura:
// riceve lo stato e un evento, restituisce il nuovo stato e gli effetti da eseguire (chiedere il permesso, avviare
// o fermare il registratore, trascrivere, salvare o cancellare l'audio). Chi la usa (src/servizi/racconta.ts) esegue
// gli effetti e rimanda qui gli esiti come eventi.
import { aggiungiLivello, limiteRaggiunto, livelloDaDecibel } from './audio.ts';
import type { AudioRacconto } from './attesa.ts';
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
  /** Racconta · 5: `inPausa` quando l'app è in secondo piano o una chiamata interrompe; `fermando` dopo lo stop, in attesa del file. */
  | { tipo: 'registrazione'; durataMs: number; inPausa: boolean; fermando: boolean; livelli: number[] }
  /** Caricamento (Figma 7): audio inviato al server. */
  | { tipo: 'trascrizione'; audio: AudioRacconto }
  /** Racconta · 10: audio salvato sul telefono, si riprova da soli al ritorno della rete. */
  | { tipo: 'senzaConnessione'; audio: AudioRacconto; inRiprova: boolean }
  /** Racconta · 12 e varianti: errore del server; con `audio` c'è "Riprova", senza si ricomincia. */
  | { tipo: 'errore'; audio: AudioRacconto | null; errore: ErroreTrascrizione }
  /** Racconta · 6: il racconto trascritto, modificabile a mano. */
  | { tipo: 'racconto'; testo: string; durataMs: number; data: string };

export type EventoRacconta =
  | { tipo: 'avviato'; permesso: PermessoMicrofono; audioInAttesa: AudioRacconto | null }
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
  | { tipo: 'trascritta'; testo: string; durataMs: number }
  | { tipo: 'trascrizioneFallita'; errore: ErroreTrascrizione }
  /** "Riprova" (dalla schermata d'errore, con caricamento visibile) o nuovo tentativo silenzioso senza rete. */
  | { tipo: 'riprova'; silenzioso?: boolean }
  | { tipo: 'modificaTesto'; testo: string }
  | { tipo: 'ricomincia' }
  | { tipo: 'azzera' };

export type EffettoRacconta =
  | { tipo: 'chiediPermesso' }
  | { tipo: 'avviaRegistrazione' }
  | { tipo: 'fermaRegistrazione'; motivo: 'tocco' | 'limite' }
  | { tipo: 'mettiInPausa' }
  | { tipo: 'riprendiRegistrazione' }
  | { tipo: 'salvaAudio'; audio: AudioRacconto }
  | { tipo: 'trascrivi'; audio: AudioRacconto }
  | { tipo: 'cancellaAudio'; uri: string };

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

/** Lo stato dopo un evento, con gli effetti da eseguire. Gli eventi fuori posto non cambiano nulla. */
export function riduci(stato: StatoRacconta, evento: EventoRacconta): Transizione {
  switch (evento.tipo) {
    case 'azzera':
      return resta(STATO_INIZIALE);

    case 'avviato': {
      if (stato.tipo !== 'avvio') return resta(stato);
      // Un audio di oggi non ancora trascritto ha la precedenza: si riparte dalla trascrizione, senza registrare di nuovo.
      if (evento.audioInAttesa) return trascrivi(evento.audioInAttesa);
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
      return { stato: { tipo: 'registrazione', durataMs: 0, inPausa: false, fermando: false, livelli: [] }, effetti: [{ tipo: 'avviaRegistrazione' }] };

    case 'avviataRegistrazione':
      return resta(stato);

    case 'registrazioneNonRiuscita':
      if (stato.tipo !== 'registrazione') return resta(stato);
      return resta(pronto('registrazioneNonRiuscita'));

    case 'avanzamento': {
      if (stato.tipo !== 'registrazione' || stato.fermando) return resta(stato);
      const durataMs = Math.max(stato.durataMs, evento.durataMs);
      const livelli = evento.registrando ? aggiungiLivello(stato.livelli, livelloDaDecibel(evento.livelloDb)) : stato.livelli;
      // Allo scadere dei 3 minuti si ferma da sola (contratto §1.2).
      if (limiteRaggiunto(durataMs)) {
        return { stato: { ...stato, durataMs, livelli, fermando: true }, effetti: [{ tipo: 'fermaRegistrazione', motivo: 'limite' }] };
      }
      return resta({ ...stato, durataMs, livelli, inPausa: !evento.registrando });
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
      // Arriva sia dalla promessa dello stop sia dall'ascoltatore del registratore: conta la prima.
      if (stato.tipo !== 'registrazione') return resta(stato);
      return { stato: { tipo: 'trascrizione', audio: evento.audio }, effetti: [{ tipo: 'salvaAudio', audio: evento.audio }, { tipo: 'trascrivi', audio: evento.audio }] };

    case 'trascritta': {
      if (stato.tipo !== 'trascrizione' && stato.tipo !== 'senzaConnessione') return resta(stato);
      // L'audio si cancella dal telefono subito dopo una trascrizione riuscita (contratto §1.6).
      return { stato: { tipo: 'racconto', testo: evento.testo, durataMs: evento.durataMs, data: stato.audio.data }, effetti: [{ tipo: 'cancellaAudio', uri: stato.audio.uri }] };
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
      return resta(stato);
    }

    case 'modificaTesto':
      if (stato.tipo !== 'racconto') return resta(stato);
      return resta({ ...stato, testo: evento.testo });

    case 'ricomincia': {
      // Da "Il tuo racconto", da un errore o da "Senza connessione" si torna a Pronto; l'audio rimasto si cancella.
      if (stato.tipo === 'racconto' || (stato.tipo === 'errore' && !stato.audio)) return resta(pronto());
      if (stato.tipo === 'errore' && stato.audio) return { stato: pronto(), effetti: [{ tipo: 'cancellaAudio', uri: stato.audio.uri }] };
      if (stato.tipo === 'senzaConnessione') return { stato: pronto(), effetti: [{ tipo: 'cancellaAudio', uri: stato.audio.uri }] };
      if (stato.tipo === 'pronto') return resta(pronto());
      return resta(stato);
    }
  }
}

/** Giorno del diario a cui lo stato si riferisce (null per gli stati senza audio né racconto). */
export function dataDelloStato(stato: StatoRacconta): string | null {
  switch (stato.tipo) {
    case 'trascrizione':
    case 'senzaConnessione':
      return stato.audio.data;
    case 'errore':
      return stato.audio?.data ?? null;
    case 'racconto':
      return stato.data;
    default:
      return null;
  }
}

/** Vero se lo stato appartiene a un altro giorno del diario: si riparte dall'avvio (l'audio scaduto lo cancella la lettura della nota). */
export function statoScaduto(stato: StatoRacconta, oggi: string): boolean {
  const data = dataDelloStato(stato);
  return data !== null && data !== oggi;
}
