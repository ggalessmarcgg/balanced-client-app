// Foto remote (nutrizioniste) con expo-image: precaricamento in memoria e su disco, e verifica della cache su disco.
// Le foto già in cache si mostrano subito e senza dissolvenza (CardCommento).
import { Image } from 'expo-image';

/** Scarica (o legge dal disco) la foto e la tiene in memoria: la prima apertura del pannello la trova pronta. */
export async function precaricaFoto(url: string): Promise<void> {
  try {
    await Image.prefetch(url, 'memory-disk');
  } catch {
    // senza rete o URL non valido: si tenterà al momento della visualizzazione
  }
}

/** Vero se la foto è già nella memoria su disco (quindi non c'è nessuno scaricamento da attendere). */
export async function fotoInCache(url: string): Promise<boolean> {
  try {
    return (await Image.getCachePathAsync(url)) !== null;
  } catch {
    return false;
  }
}
