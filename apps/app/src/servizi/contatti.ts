// Apre le app del telefono per i contatti del supporto (mail e WhatsApp, stessi link della web app).
import { Linking } from 'react-native';

import { linkEmailSupporto, linkWhatsAppSupporto } from '@/core/accesso/costanti';

export function apriEmailSupporto(): void {
  Linking.openURL(linkEmailSupporto()).catch(() => {});
}

export function apriWhatsAppSupporto(): void {
  Linking.openURL(linkWhatsAppSupporto('Ciao! Vorrei gestire il mio percorso Balanced.')).catch(() => {});
}
