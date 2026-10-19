// Contatti del supporto: si copiano negli appunti (icona Copia in Figma), nessun reindirizzamento fuori dall'app.
import * as Clipboard from 'expo-clipboard';

import { SUPPORTO } from '@/core/accesso/costanti';

export type ContattoCopiato = 'email' | 'telefono';

export const TESTO_COPIATO: Record<ContattoCopiato, string> = {
  email: 'Email copiata negli appunti.',
  telefono: 'Numero copiato negli appunti.',
};

export async function copiaContattoSupporto(contatto: ContattoCopiato): Promise<boolean> {
  try {
    return await Clipboard.setStringAsync(contatto === 'email' ? SUPPORTO.email : SUPPORTO.telefono);
  } catch {
    return false;
  }
}
