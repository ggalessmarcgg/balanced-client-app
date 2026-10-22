import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

// Collegamento del Pannello scelta orario nell'app vera (step 12, decisione del 22/10/2026): senza un renderer di
// React Native nei test, si verifica sul sorgente che la variante "Nessun orario" chiuda con "Chiudi" e con il velo
// tramite la stessa azione, che l'azione sia quella del pannello (chiudiPannello) e che la copia del supporto passi
// da useAzioniStato, che mostra la Notifica breve. Le transizioni sono provate in pannello.test.ts.

const APP = join(import.meta.dirname, '..', '..', '..');
const leggi = (percorso: string) => readFileSync(join(APP, percorso), 'utf8');

describe('cablaggio del pannello degli orari nell\'app', () => {
  const pannello = leggi('src/ui/prenotazione/PannelloSceltaOrario.tsx');
  const rotta = leggi('app/stato/prenotazione.tsx');
  const hook = leggi('src/servizi/usePrenotazione.ts');
  const azioni = leggi('src/servizi/useAzioniStato.tsx');

  it('"Nessun orario": velo e "Chiudi" chiamano la stessa onAnnulla', () => {
    const variante = pannello.slice(pannello.indexOf('if (nessunOrario)'), pannello.indexOf('const confermabile'));
    assert.match(variante, /<PannelloDalBasso[\s\S]*?onChiudi=\{onAnnulla\}/, 'il velo (onChiudi del PannelloDalBasso) deve chiudere con onAnnulla');
    assert.match(variante, /etichetta=\{TESTI_CONFERMA\.chiudi\}[^/]*onPress=\{onAnnulla\}/, '"Chiudi" deve chiudere con onAnnulla');
    assert.match(variante, /etichetta=\{SUPPORTO\.email\} onPress=\{onEmailSupporto\}/);
    assert.match(variante, /etichetta=\{SUPPORTO\.telefono\} onPress=\{onTelefonoSupporto\}/);
  });

  it('la rotta collega onAnnulla alla chiusura del pannello e la copia del supporto a useAzioniStato', () => {
    assert.match(rotta, /onAnnulla=\{p\.onChiudiPannello\}/);
    assert.match(rotta, /onEmailSupporto=\{onEmailSupporto\}/);
    assert.match(rotta, /onTelefonoSupporto=\{onTelefonoSupporto\}/);
    assert.match(rotta, /const \{ onEmailSupporto, onTelefonoSupporto, sovrapposti \} = useAzioniStato\(\)/);
    assert.match(rotta, /\{sovrapposti\}/, 'la Notifica breve della copia sta nei sovrapposti di useAzioniStato');
    assert.match(hook, /const onChiudiPannello = useCallback\(\(\) => setStato\(chiudiPannello\)/);
  });

  it('la copia del supporto mostra la Notifica breve di conferma', () => {
    assert.match(azioni, /if \(await copiaContattoSupporto\(contatto\)\) setCopiato\(contatto\)/);
    assert.match(azioni, /\{copiato \? <NotificaInBasso key=\{copiato\} tipo="conferma" testo=\{TESTO_COPIATO\[copiato\]\}/);
  });

  it('"Conferma orario" non chiama la conferma: solo la transizione del pannello', () => {
    assert.match(hook, /const onConfermaOrario = useCallback\(\(\) => setStato\(confermaOrario\), \[\]\)/);
    assert.doesNotMatch(hook, /onConfermaOrario[\s\S]*?void conferma\(/);
    assert.match(rotta, /onConferma=\{p\.onConfermaOrario\}/);
  });
});
