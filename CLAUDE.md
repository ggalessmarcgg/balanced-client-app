# Balanced · app clienti nativa

## Cos'è il progetto

App clienti nativa Balanced per iOS e Android, costruita con Expo (SDK 58),
TypeScript strict ed Expo Router. Sostituirà la web app Lovable
(`balanced-client-app-lovable`). Repository GitHub privato:
`ggalessmarcgg/balanced-client-app`. Build locale sul Mac con Xcode 27.

Documenti di riferimento nel progetto Claude (da leggere prima di proporre
qualsiasi cosa): `piano-app-balanced`, `mappa-app-balanced`,
`contratto-lettura-piani-app`, `piano-sviluppo-app`,
`mappa-dismissione-webapp`, `step0-censimento-app`.

## Metodo

- **Censimento in sola lettura prima di proporre.** Prima di ogni modifica si
  legge e si riferisce cosa esiste; solo dopo si propone.
- **Solo dopo approvazione esplicita di Alessmarc:** migrazioni SQL,
  scritture sul database, deploy, build, pubblicazioni e push su GitHub.
- **Migrazioni:** prima come file nel repo (solo additive: niente drop,
  rename o modifiche distruttive), poi applicate via MCP, identiche al file.
- **Migrazioni e scritture sul database si applicano dalla chat di progetto**
  (Claude.ai), mai da Claude Code: qui si salvano solo i file in
  `supabase/migrations/`, con lo stesso testo e la stessa versione applicati
  in produzione, e si verifica via MCP in sola lettura che l'oggetto esista.
- **Edge Function esistenti:** non si modificano né si rideployano senza
  censimento e approvazione.
- **Prima di scrivere su una tabella** si ispezionano trigger, policy RLS e
  consumatori (CRM, cron, altre app).
- **Prove solo con entità sintetiche:** account
  `aless.marchetto6+<tag>@gmail.com`. Mai push notification o scritture di
  prova verso clienti reali.
- **Segreti mai nel repo:** niente chiavi, token o `.env` tracciati; il
  `.gitignore` li esclude in ogni forma.

## Principio

Compatibili sui dati, efficienti nel resto.

- **Compatibili sui dati:** campi, valori e formati devono restare quelli che
  CRM, trigger e cron si aspettano. Non si inventano stati, enum o formati
  paralleli.
- **Efficienti nel resto:** scritture minime, letture mirate (select dei soli
  campi necessari), cache lato client, indici e policy leggere.

## Design

- **Figma prima del codice.** File `gEx2IMz69sIuUnOYkLBjcf`, pagine
  "📱 App iOS Android" (schermate, `414:39`), "🧩 Componenti · App nativa"
  (componenti, `418:2`), "🧱 Foundations · App nativa" (token, `413:2`).
  L'elenco completo di sezioni e schermate con i node-id è in
  `docs/figma-indice.md`.
- **Si parte sempre dagli ID.** L'elenco pagine del connettore Figma
  (`get_metadata` senza nodeId) restituisce solo la prima pagina del file:
  non cercare le pagine per nome, usare i node-id sopra o quelli
  dell'indice.
- **Fedeltà pixel-perfect** verificata con confronto a schermo tra Figma e
  simulatore prima di dichiarare chiusa una schermata.
- **Nessun valore scritto a mano se esiste il token:** colori, font,
  spaziature e raggi vengono dai token del design system (dallo step 2).
  Allo step 1 la schermata provvisoria non definisce alcun valore visivo.

## Token del design system

- Unica fonte: Figma. In codice i token stanno in `apps/app/src/ui/theme/`:
  `figma-tokens.json` (fotografia in sola lettura) → `tokens.generated.ts`
  (generato) → `index.ts` (punto d'ingresso: `import { colori, spazio, testi,
  icone } from '@/ui/theme'`). Nessun valore visivo scritto a mano fuori da
  `src/ui/theme`: la regola ESLint `no-restricted-syntax` blocca i colori
  letterali (esadecimali, `rgb()`/`rgba()`, nomi CSS) in `app/` e `src/`.
- **Rigenerare quando Figma cambia** (solo lettura su Figma):
  1. Eseguire nel connettore Figma (`use_figma`, file `gEx2IMz69sIuUnOYkLBjcf`)
     il contenuto di `apps/app/scripts/figma/01-variabili-stili.js` e incollare
     il risultato nelle chiavi omonime di `figma-tokens.json` (`collections`,
     `variables`, `textStyles`, `paintStyles`, `effectStyles`).
  2. Eseguire `apps/app/scripts/figma/02-icone.js` (pagina Componenti `418:2`)
     e incollare il risultato in `icons`; aggiornare `letturaDel`.
  3. Dentro `apps/app`: `npm run tokens`, poi `npm run typecheck` e `npm run lint`.
  4. Un font o uno stile nuovo in Figma richiede di aggiornare la mappa `FONT`
     in `scripts/tokens/genera-token.mjs` e il caricamento in `src/ui/theme/font.ts`.
- **Font**: DM Sans e DM Serif Display dai pacchetti `@expo-google-fonts` (dimensione
  ottica predefinita 14) più tre istanze statiche alla dimensione ottica che Figma
  applica agli stili grandi (`assets/font`: 40pt SemiBold per Display 44, 36pt
  SemiBold per H1 Accesso, 32pt Regular per H1), ricavate dal font variabile
  ufficiale con fontTools (procedura e licenza in `assets/font/README.md`). Il
  generatore sceglie l'istanza con `ISTANZE_OTTICHE`; uno stile nuovo sopra i 24 px
  richiede una nuova istanza.
- **Testi sempre con il componente `Testo`** (`src/ui/Testo.tsx`, prop `stile`): applica
  lo stile e la correzione verticale per stile di `src/ui/theme/testo-correzioni.ts`,
  misurata con il confronto a pixel (su iOS, con interlinea ≤ altezza naturale del font,
  i glifi stanno più in alto che in Figma). Da rimisurare se cambiano font,
  interlinee o versione di React Native. Su iOS il testo viene inoltre ritagliato al
  riquadro di riga: per gli stili con interlinea sotto l'altezza naturale (H1, Display,
  Accento serif, H1 Accesso) `Testo` allarga il riquadro con un padding verticale
  compensato da margini negativi, altrimenti accenti e discendenti spariscono
  (verifica: `/sviluppo/titoli`, esiti in `step3-confronti/titoli/`). Su Android il padding da solo non basta: la TextView
  ritaglia il disegno al riquadro delle righe, quindi per gli stessi stili `Testo` aggiunge `overflow: 'visible'` (31/10/2026,
  vedi la sezione dello step 6).
- **Icone**: tratto unico per misura (`misura/12`: 16 → 1,33, 20 → 1,67, 24 → 2,
  32 → 2,67, 36 → 3), lo stesso in Figma. I componenti icona in Figma seguono la
  versione Lucide installata (`lucide-react-native`): se un aggiornamento cambia un
  disegno, si riallinea Figma (scrittura approvata caso per caso), non l'app.
- Conversioni fatte dal generatore: interlinea e spaziatura da percentuale a
  pixel (`fontSize × %`), colori con alfa in `rgba()`, gradienti da
  `gradientTransform` a punti `inizio`/`fine` relativi (0–1), icone con chiave
  `"misura/nome"` e nome Lucide dalla descrizione del componente. Gli stili
  senza prefisso `App/` (Intro title, Heading, Body…) sono del funnel web e
  non vengono generati. Le opacità di livello (`opacitaLivello`) non sono
  variabili in Figma: vengono da `docs/figma-pulizia.md`. I colori decisi in
  codice (`coloriCodice`, es. `sfondoBarraAndroid`) sono una variabile Figma di
  base più un'alfa, risolti dal generatore.
- **Effetto vetro** (Barra di navigazione, `App/Vetro` in Figma): su iOS vetro
  nativo con `expo-glass-effect` (Liquid Glass, iOS 26+) e tinta `sfondo/barra`;
  su Android e dove il vetro non è disponibile fondo `sfondo/card` al 90 % senza
  sfocatura (`coloriCodice.sfondoBarraAndroid`). Decisione del 19/10/2026.

## Tastiera (regola unica per tutta l'app)

Vale per diario, pannello di modifica, login, recupero password, email non confermata e
ogni schermata futura con campi di testo (decisione del 20/10/2026). In codice:
`react-native-keyboard-controller` (`KeyboardProvider` in `app/_layout.tsx`,
`KeyboardAwareScrollView` in `Pagina` e nel `PannelloDalBasso`), costanti e proprietà
comuni dei campi in `src/ui/tastiera.ts`.

- **Il campo a fuoco sta subito sopra la tastiera** con un piccolo margine
  (`MARGINE_SOPRA_TASTIERA`, 16): la pagina o il pannello scorrono da soli; mentre
  si scrive e il campo si allunga, lo scorrimento segue il cursore. **Campi lunghi**
  (decisione del 23/10/2026): se il campo è più alto dello spazio libero sopra la
  tastiera, a stare sopra la tastiera è la **riga del cursore**, seguita mentre si scrive
  o si tocca in un altro punto del testo (anche verso l'alto se la riga finisce sotto la
  barra di stato); con i campi brevi resta la regola del campo intero. Posizione del
  campo e del cursore dal thread dell'interfaccia (`useReanimatedFocusedInput`,
  `useFocusedInputHandler` di keyboard-controller, regole pure in
  `src/core/tastiera/cursore.ts`), limitate allo scorrimento che contiene il campo
  (tag dello ScrollView genitore o campo registrato nel contesto); scorrimenti animati,
  mai a scatti. **Cambio di campo con la tastiera aperta**: un solo punto scorre
  (`portaInVista`, sul thread dell'interfaccia), sempre della sola differenza calcolata
  dalle posizioni correnti (`spostamentoPerCampo`, idempotente); il gestore della tastiera
  non applica lo scorrimento proporzionale quando riceve un nuovo "mostra" alla stessa
  altezza (difetto del 23/10/2026: doppia spinta al cambio di campo). Il JS misura solo il
  contenitore del campo (campo più ciò che deve restare visibile, es. "Invia"), mai scorre.
- **Lo scorrimento non chiude la tastiera** (`keyboardDismissMode="none"`).
- **La tastiera si chiude solo** toccando fuori dai campi
  (`keyboardShouldPersistTaps="handled"`) oppure con "Avanti", "Chiudi", "Invia" o il
  tasto Invio dove previsto. Il tocco fuori dai campi lo gestisce `ChiudiCampiAlTocco`
  (`src/ui/tastiera.tsx`, intorno a tutta la `Pagina` e al foglio del `PannelloDalBasso`,
  regola pura in `src/core/tastiera/tocco.ts`): un tocco su qualunque punto non interattivo
  toglie il fuoco al campo e chiude la tastiera anche senza tastiera software (tastiera
  fisica, simulatore con la tastiera spenta), dove lo ScrollView di React Native da solo non
  lo farebbe (difetto del 23/10/2026: il cursore restava nel campo). Nei moduli Invio passa al campo successivo
  (`returnKeyType="next"`, `submitBehavior="submit"`, `inputRef`) e dall'ultimo campo
  esegue l'azione (nel Login da email a password, dalla password "Accedi").
- **I piedi fissi non salgono sopra la tastiera**: i pulsanti in fondo a una schermata
  o a un pannello restano al loro posto, coperti, e tornano visibili quando si chiude.
  Mai `KeyboardAvoidingView`. Lo scorrimento tiene conto del piede con
  `extraKeyboardSpace` negativo (altezza del piede + area sicura).
- **Aspetto chiaro** (`keyboardAppearance="light"`, l'app è solo in tema chiaro) e
  nessuna zona scura tra contenuto e tastiera: lo sfondo sopra e dietro la tastiera è
  quello della schermata o del pannello (per questo il pannello dal basso è uno strato
  sopra la pagina, non un Modal).
- I campi usano sempre `PROPRIETA_CAMPO` (tastiera chiara, cursore e selezione nel
  colore dell'azione, segnaposto). Verifica con la tastiera software del simulatore
  (Device Hub › Dispositivo › Tastiera) sulle rotte di sviluppo `login-tastiera`,
  `oggi-2-pasti`, `oggi-2-pasti-spuntini`, `oggi-5-commento-tastiera`,
  `giornate-5-modifica`.

## Stati trasversali (Caricamento, Senza connessione, Errore di caricamento, Notifica breve)

- Compaiono **dentro la pagina in cui si trova il cliente** e ne rispettano la
  struttura (barra superiore, titolo, margini). La **barra di navigazione c'è
  solo se la pagina ce l'ha**, cioè solo nell'app dell'abbonato (stato J).
  All'avvio (stato ancora non noto), nel login, nelle schermate di accesso e in
  tutte le schermate dei non abbonati: senza barra, barra superiore con il solo
  logo. I disegni "Trasversali" in Figma (`563:4516`) mostrano il caso
  dell'abbonato. In codice: `StrutturaPagina` in
  `src/ui/schermate/SchermateTrasversali.tsx` (`barraSuperiore`,
  `barraNavigazione`), predefinito senza barra. Vale anche per le pagine future.
- Notifica breve: 16 sopra l'area sicura inferiore, margini 20
  (`NotificaInBasso`); nelle pagine con la barra di navigazione sta sopra la barra.
- Contatti del supporto: si **copiano** negli appunti (`expo-clipboard`, icona
  Copia) con Notifica breve di conferma; nessun reindirizzamento fuori dall'app.

## Verifiche a schermo e rotte di sviluppo

- Rotte solo di sviluppo (`Stack.Protected guard={__DEV__}` in `app/_layout.tsx`,
  mai nelle versioni per i clienti): `/sviluppo/componenti?sezione=Colori|Misure|Testi|Icone`
  (pagina dei componenti, dal lotto 2 anche le sezioni dei componenti: `?sezione=Pulsante`,
  `Riga elenco`, …), `/sviluppo/stati` (elenco) e `/sviluppo/stati?stato=H` (una schermata dello
  step 3 con dati finti, chiavi in `src/ui/sviluppo/PaginaStati.tsx`), `/sviluppo/confronto-testi` e `/sviluppo/confronto-icone`
  (celle su fondo `sfondo/card` per il ritaglio automatico dei confronti),
  `/sviluppo/confronto-componenti?componente=<nome>` (varianti in colonna per il confronto
  con il set Figma; esiti in `~/Desktop/censimenti-app/step2b-confronti/lotto2/` e `lotto3/`).
- `xcrun simctl openurl` con lo schema `balanced://` fa comparire il dialogo di
  sistema «Open in Balanced?», che non si può confermare senza permessi di
  accessibilità. Per aprire una rotta negli screenshot automatici si usa la
  variabile `EXPO_PUBLIC_ROTTA_SVILUPPO=/sviluppo/...` (letta solo in `__DEV__`
  da `app/index.tsx`), riavviando Metro: script
  `~/Desktop/censimenti-app/strumenti/apri-rotta.sh "<rotta>" <uscita.png>`.
- Confronto a pixel Figma ↔ simulatore (3×): `~/Desktop/censimenti-app/strumenti/`
  (`confronta-png.mjs`, `ritaglia-celle.mjs`, `componi-su-fondo.mjs`,
  `confronto-lotto1.sh`); esiti in `~/Desktop/censimenti-app/step2b-confronti/`.
- Icone: componente `Icona` (`src/ui/icone`), `nome` italiano + `misura` dai
  token; tratto e colore di Figma per ogni icona; Lucide via
  `lucide-react-native` con `absoluteStrokeWidth`, le non Lucide come SVG.

## Architettura

- Workspace npm con l'app in `apps/app`. Server e regole condivise si
  aggiungeranno come altri workspace quando serviranno.
- `apps/app/app/` → rotte di Expo Router (ogni file è una schermata,
  `_layout.tsx` definisce i navigator). Niente logica o componenti qui.
  Le schede dell'abbonato (Oggi `/abbonato`, Piano `/piano`, Revisioni
  `/revisioni`, Account `/account`) stanno nel gruppo `app/(abbonato)/`, il cui
  layout rende **una sola barra di navigazione persistente** (`Slot` sotto, barra
  sopra, portale degli elementi sovrapposti ancora sopra:
  `src/ui/schermate/Sovrapposti.tsx`); le schermate passano tra le voci con
  `router.replace` e la barra anima l'evidenza. Le `BarraNavigazioneFissa` delle
  schermate rendono nulla dentro il gruppo (servono alla pagina di sviluppo). Voce
  ↔ percorso in `src/core/navigazione/voci.ts`. Le pagine senza barra (lettura
  della revisione `/revisione/<id>`, storico, racconta) stanno fuori dal gruppo.
  Verifica dell'animazione senza accesso: `/sviluppo/schede/oggi?ciclo=1`.
- `apps/app/src/ui/` → componenti React Native di presentazione. Possono
  importare da `core/`.
- `apps/app/src/core/` → TypeScript puro: tipi, validazioni, macchine a
  stati, client API. **Nessun import da React, React Native, Expo, `ui/` o
  `servizi/`** (come in `onboarding-v2`); la regola è imposta da ESLint. Gli
  import relativi interni a `core` portano l'estensione `.ts`, così i test
  girano con `node --test` senza bundler (`npm test` dentro `apps/app`,
  file `*.test.ts` accanto al modulo).
- `apps/app/src/servizi/` → collegamento ai servizi esterni (client Supabase,
  sessione nel portachiavi, lettura dello stato, accesso, contatti): l'unico
  posto che importa `@supabase/supabase-js` ed `expo-secure-store`; usa
  `core/` e viene usato dalle rotte in `app/`.
- Alias `@/*` → `apps/app/src/*`.
- **Dipendenze pinnate** a versione esatta (niente `^` o `~`);
  `package-lock.json` tracciato. Nuovi pacchetti con `npx expo install`,
  poi si rimuove il range nel `package.json`.
- **TypeScript strict** (`strict`, `noUncheckedIndexedAccess`).
- Cartelle native `ios/` e `android/` generate da `expo run:*` e ignorate
  da git (prebuild continuo): le modifiche native passano da `app.json` e
  dai config plugin, mai a mano dentro `ios/`.
- Identificativo app provvisorio `it.joinbalanced.app` (iOS e Android), da
  confermare prima dello step 3.

## Commit

In italiano, Conventional Commits con scope:
`feat(auth): …`, `fix(piani): …`, `docs(readme): …`, `chore(deps): …`,
`style(ui): …`, `refactor(core): …`. Un commit per unità logica. Mai push
senza approvazione esplicita.

## Comandi

Dalla radice del repository:

```bash
npm install                 # dipendenze di tutto il workspace
npm run start               # dev server Metro
npm run ios                 # prebuild + build + avvio su simulatore (Xcode)
npm run lint                # ESLint (configurazione ufficiale Expo)
npm run typecheck           # tsc --noEmit
```

Dentro `apps/app`: `npm test` esegue i test di `src/core` con il test runner
di Node (nessuna dipendenza).

Dentro `apps/app`:

```bash
npx expo run:ios --device "iPhone 17"   # scegliere un simulatore preciso
npx expo start --ios                     # solo Metro, riusa l'app già installata
npx expo-doctor                          # diagnosi dipendenze e config
npx expo install --fix                   # riallinea versioni alla SDK
```

## Accesso e stati (step 3)

- Supabase: URL e chiave pubblica "default" (`sb_publishable_…`) in `apps/app/.env`
  (non versionato; nomi in `.env.example`), letti da `src/servizi/supabase.ts`.
  Login con `signInWithPassword`; nessuna registrazione né accesso da link
  nell'app. Reinvio del link di conferma (`auth.resend` tipo `signup`) e recupero
  password (`resetPasswordForEmail`) con gli stessi redirect web di funnel e
  web app (`src/core/accesso/costanti.ts`).
- Sessione nel portachiavi (`expo-secure-store`) a pezzi da 1,8 KB
  (`src/servizi/archivio.ts`, logica in `src/core/sessione/pezzi.ts`), rinnovata
  in automatico con l'app in primo piano. "Esci" = `signOut` globale + svuotamento
  della cache locale.
- **Tre archivi locali** (decisione del 21/10/2026), `src/servizi/archivio.ts` e
  `src/servizi/archivioFile.ts` (`expo-file-system`):
  1. portachiavi: solo ciò che è piccolo e sensibile (sessione, stato del cliente,
     profili delle nutrizioniste);
  2. cartella cache della sandbox (`balanced-cache/`): dati già sul server,
     rigenerabili (diario di oggi, settimana, giornate, primo diario, revisioni con i
     testi); il sistema può svuotarla quando manca spazio;
  3. cartella documenti della sandbox (`balanced-attesa/`): copie di sicurezza delle
     modifiche non ancora confermate dal server (bozza del diario, modifiche di
     giornate condivise, "letto" dei commenti, aperture e letture delle revisioni);
     il sistema non la svuota e l'app non cancella mai una copia prima della
     conferma: il file si aggiorna per fusione per data
     (`src/core/diario/attesa.ts`), anche la pulizia delle cache dei giorni passati
     non la tocca; le bozze di giorni passati si salvano alla prima apertura di Oggi.
  Tutti e tre si svuotano all'uscita. **"Esci"** (`useAzioniStato`, `src/servizi/attesa.ts`):
  prima prova a inviare le modifiche in attesa (bozza, giornate modificate, "letto"
  dei commenti, aperture e letture delle revisioni); se ne restano (es. senza rete)
  chiede conferma con il `Dialogo` ("Hai modifiche non ancora salvate" / "Se esci ora
  andranno perse." / "Esci comunque" · "Annulla") e solo con "Esci comunque" esce e
  cancella tutto. Con la rete attiva nessun avviso.
- **Dialogo** (`src/ui/Dialogo.tsx`): Pannello dal basso con titolo H2, testo Body e
  due azioni terziarie centrate (Figma 499:2568, "Elimina account"); l'azione sicura
  a sinistra in Etichetta (`Pulsante` livello `terziarioEvidenziato`).
- **Barra di navigazione**: al cambio di voce l'evidenza scorre e i colori si
  dissolvono in 300 ms ease-out (`TRANSIZIONI.tacchetteMs`, come le tacchette del
  diario); con "Riduci movimento" l'evidenza salta e resta una dissolvenza breve.
- Smistamento: una sola lettura all'avvio (`clients` per `user_id` con lead,
  appuntamenti e nutrizionista incorporati, colonne esplicite in
  `src/core/stato/letture.ts`) → `calcolaStato` (`src/core/stato/stato.ts`,
  stati A–L, orari in Europe/Rome senza dipendenze) → rotta in
  `src/servizi/rotte.ts`. Mai `select *`, mai `nutritionist_id` dal lead.
- Account di prova: tabella in `docs/account-prova.md` (senza password); le
  scritture le applica la chat di progetto.

## Diario (step 5, lotto 1)

- Logica pura in `src/core/diario/` (`data.ts` date in Europe/Rome, `modello.ts` formati dei campi,
  `bozza.ts` macchina a stati bozza/condivisione, `settimana.ts`, `letture.ts` colonne esplicite,
  `nomi.ts` nomi stabili per gli eventi → `docs/diario-nomi.md`); collegamento in
  `src/servizi/diario.ts` e hook `useDiario.ts`; componenti in `src/ui/diario/`, schermata
  `src/ui/schermate/SchermataOggi.tsx`, rotta `app/abbonato.tsx`.
- Regole sui dati (censimento `~/Desktop/censimenti-app/step5-censimento-diario.md`): data sempre in ora
  italiana e nelle chiavi di cache; `client_id` dallo stato letto una volta per sessione; una lettura per
  l'intervallo settimana + ultimi 7 giorni (senza testi) e al massimo una seconda per la riga di oggi; mai
  una bozza vuota; salvataggi della bozza senza `status`; condivisione in una sola modifica filtrata su
  `status = draft` (0 righe → la riga era già condivisa: si mostra condiviso, nulla da riscrivere); mai
  scrivere colonne della nutrizionista, `submission_number`, `review_id`, `client_id` dopo la creazione.
- Pagina di sviluppo: `/sviluppo/stati?stato=J|oggi-2-pasti|…|oggi-7-condiviso|racconta`; esiti dei
  confronti in `~/Desktop/censimenti-app/step5-confronti/lotto1/`.

## Revisioni (step 7)

- Logica pura in `src/core/revisioni/` (`letture.ts` colonne esplicite di `client_reviews`, `stato.ts` card e
  elenco con la "Inizia" virtuale, `testo.ts` sezioni ed elenchi puntati, `lettura.ts` regola del letto e le due sole
  scritture, `autore.ts`, `nomi.ts` → `docs/diario-nomi.md`); servizi `src/servizi/revisioni.ts`,
  `memoriaRevisioni.ts` (memoria di sessione + cache nel portachiavi), hook `useRevisioni.ts` e
  `useLetturaRevisione.ts`; componenti in `src/ui/revisioni/`, schermate `SchermataRevisioni.tsx` e
  `SchermataLetturaRevisione.tsx`, rotte `app/(abbonato)/revisioni/index.tsx` e `app/revisione/[id].tsx`.
- Regole sui dati (censimento `~/Desktop/censimenti-app/step7-censimento-revisioni.md`): il ciclo lo fa il trigger
  del diario, l'app non crea né conta nulla; lettura leggera dello stato per `user_id` senza testo (anche all'avvio
  dell'app dell'abbonato e dopo la condivisione di un diario, per il pallino sulla barra), testi solo per `sent`,
  `opened`, `read` e solo se non già in memoria; mai leggere né mostrare il testo di `unlocked` o `draft`; le uniche
  scritture sono `status = 'opened'` + `opened_at` (da `sent`, all'apertura della lettura) e `status = 'read'` +
  `read_at` (da `opened`/`sent`, appena il piè di pagina "Hai letto tutta la revisione." entra nello schermo, senza
  tempo minimo né pulsante; regola in `pianificaLetta`), mai altre colonne; cache aggiornata subito, scritture fallite
  riprovate in silenzio. Pallino sulla voce Revisioni: lettura leggera all'avvio, al ritorno in primo piano e dopo
  la condivisione di un diario.
- Pagina di sviluppo: `/sviluppo/stati?stato=revisioni-1-in-corso|…|revisioni-errore`; esiti dei confronti in
  `~/Desktop/censimenti-app/step7-confronti/`.

## Menu, Account e notifiche (step 11)

- Lotto 1 (menu, La tua nutrizionista, Appuntamenti): logica pura in `src/core/nutrizionista/profilo.ts`
  (profilo, telefono, ferie e sostituta, orari) e `src/core/appuntamenti/appuntamenti.ts` (prossimo e passati in
  ora italiana, etichette), nomi in `src/core/menu/nomi.ts` → `docs/diario-nomi.md`; servizi
  `src/servizi/nutrizionista.ts` (cache su file di un giorno), `appuntamenti.ts`, hook `useMenu.ts`; schermate
  `SchermataMenu`, `SchermataNutrizionista`, `SchermataAppuntamenti`; rotte `app/menu.tsx` (dall'icona Menu,
  `slide_from_bottom`), `app/nutrizionista.tsx` (anche dalla card degli stati), `app/appuntamenti.tsx`.
- Regole (censimento `~/Desktop/censimenti-app/step11-censimento-menu-account.md`): letture con colonne esplicite
  filtrate per cliente, mai `profile_image_url` né `email` del profilo; profilo e ferie incorporati, niente catene di
  query; "oggi" sempre in Europe/Rome; contatto diretto visibile solo con il percorso attivo (stato J); contatti
  del supporto copiati, mai aperti; "Entra" apre `meeting_url` con il tocco; nessuna scrittura in questo lotto.
- Lotto 2 (Peso e misure, Contenuti): `src/core/misure/misure.ts` (BMI, serie del peso, confronto prima/ultima
  misurazione, etichette) e `src/core/contenuti/contenuti.ts` (elenco, griglia a gruppi di quattro, paragrafi);
  servizi `misure.ts` (riletto all'apertura e al rientro) e `contenuti.ts` (cache di un giorno); grafici in
  `src/ui/menu/GraficiMisure.tsx` con react-native-svg; schermate `SchermataPesoMisure`, `SchermataContenuti`,
  `SchermataContenuto`; rotte `app/peso-misure.tsx`, `app/contenuti/index.tsx`, `app/contenuti/[id].tsx`. La
  barra del BMI usa le variabili Figma `grafico/bmi-1 … bmi-4` (sfumatura da sinistra a destra, segno sottile sul
  valore); la curva del peso è un'interpolazione cubica monotona (`src/core/misure/curva.ts`, mai oltre i valori
  reali); la scala di ogni asse del radar parte al 10 % sotto il più basso dei due valori; il selettore
  grafico/tabella si anima come la barra di navigazione (`src/ui/menu/SelettoreVista.tsx`).
- Competenze del profilo: chiavi del matching in `nutritionist_profiles.competences`, etichette italiane in
  `src/core/nutrizionista/competenze.ts` copiate da `BADGE_LABEL` del funnel (`~/Desktop/onboarding-v2/src/ui/pages/NutritionistPage.tsx`);
  il test `competenze.test.ts` segnala la divergenza quando il repo del funnel è sul disco.
- Lotto 3 (Account, Notifiche): `src/core/account/account.ts` (iniziali, dati dell'Account dalla riga `clients`
  già letta allo stato: `email, total_submissions, diary_reminder_enabled, diary_reminder_weekend_enabled,
  stripe_customer_id` aggiunte a `SELEZIONE_STATO`; cascata dei promemoria; card dell'abbonamento dalla risposta
  della edge function `get-client-subscription`; testi) e `src/core/notifiche/notifiche.ts` (lettura di
  `client_notifications` per `user_id`, ultimi 7 giorni, limite 50, colonne esplicite, promemoria esclusi nel
  filtro `not.in`; titolo e testo composti dall'app per tipo, `title`/`body` solo come riserva; destinazioni:
  commento → pannello della giornata, revisione inviata → lettura, sbloccata → Revisioni, ferie → La tua
  nutrizionista). Servizi `account.ts` (function una volta l'ora in memoria; `scriviPromemoria` = una modifica
  su `clients` per id, solo le due colonne; privacy e termini nel browser interno), `notifiche.ts` (memoria +
  copia su file, `aggiornaNotifiche` all'avvio e al rientro per il pallino, `segnaTutteViste` all'apertura
  dell'elenco, `segnaCliccataNotifica` al tocco), hook `useNotifiche.ts`; schermate `SchermataAccount`,
  `SchermataNotifiche`, pannello `src/ui/account/PannelloEliminaAccount.tsx`; rotte `app/(abbonato)/account.tsx`
  (con la barra solo per l'abbonato; dagli stati H e K senza) e `app/notifiche.tsx`.
- **Eliminazione dell'account (31/10/2026, contratto `balanced-client-agents/docs/contratti/contratto-eliminazione-account-v0_1.md` §2,
  server `docs/server-eliminazione-account.md`)**: schermate di avviso e conferma invariate (Figma 499:2568, 499:2709) con i testi
  del contratto (`TESTI_ELIMINAZIONE` in `src/core/account/account.ts`: l'avviso informa, non chiede di disdire prima; "L'eliminazione
  dell'account non disdice l'abbonamento: per disdirlo scrivi a supporto@joinbalanced.it."). "Elimina definitivamente" chiama
  `POST /v1/account/eliminazione` del server degli agenti con la password (`src/servizi/eliminazioneAccount.ts`, logica pura e
  codici d'errore in `src/core/account/eliminazione.ts`); l'hook `src/ui/account/useEliminazioneAccount.ts` governa il percorso
  (servizio iniettato: quello vero dalla rotta, uno finto dalla pagina di sviluppo). Esito positivo, anche `gia_registrata` →
  `esci()` e `/accesso?avviso=eliminazione`, che mostra per 10 s la Notifica breve di conferma (nessun disegno Figma dedicato:
  è la stessa Notifica breve del link di recupero). Password errata e troppi tentativi → messaggio sotto il campo (si resta sul
  pannello; così anche sessione scaduta e account non riconosciuto, perché la Notifica breve d'errore ha sempre "Riprova");
  rete o servizio non disponibile → Notifica breve d'errore con "Riprova" (stessa password), in fondo sopra le azioni del
  pannello per 6 s (`NotificaInBasso` ha zIndex 20, sopra il pannello). L'app non scrive nulla sul database per questo percorso e non
  cambia lo stato del cliente. Pagina di sviluppo: `/sviluppo/stati?stato=account-3-avviso|account-4-conferma|account-4-conferma-errore|account-4-conferma-troppi|account-4-conferma-in-corso|account-elimina-riprova|account-5-confermata|account-elimina-flusso`
  (l'ultima è il flusso completo con i tocchi e il server finto: la password decide l'esito).
- **Interruttore** (`src/ui/Interruttore.tsx`): al cambio di stato, anche quando lo spegne un altro interruttore
  (diario → weekend), il pomello scorre e il fondo cambia in dissolvenza in 300 ms ease-out
  (`TRANSIZIONI.tacchetteMs`, come selettore grafico/tabella e barra); con "Riduci movimento" solo la dissolvenza
  breve. Verifica: `/sviluppo/stati?stato=account-interruttori`. Privacy e termini si aprono nel browser interno
  (`expo-web-browser` 58.0.6, approvato il 21/10/2026, `apriPaginaWeb` in `src/servizi/account.ts`).
- **Memoria delle revisioni senza cicli** (bug del 21/10/2026: l'Account rileggeva lo stato quando le righe
  mancavano, ogni lettura rimetteva in memoria la cache vuota e notificava, la schermata rileggeva): la fusione
  (`fondiMemoria`) e la scelta di cosa portare dalla cache (`modificaDaCache`) sono pure in
  `src/core/revisioni/memoria.ts` con il test del ciclo; `aggiornaMemoriaRevisioni` notifica solo se qualcosa
  cambia davvero; `aggiornaStatoRevisioni` tiene una sola lettura leggera in corso per cliente. Regola per le
  schermate: un effetto che legge dipende solo dagli identificativi (cliente), mai dal risultato della lettura.
- Pagina di sviluppo: `/sviluppo/stati?stato=menu-1|menu-3-abbonato|menu-3-prenotato|menu-3.1-ferie|menu-4-appuntamenti|menu-6-grafici|menu-6.1-tabelle|menu-5-contenuti|menu-5.1-contenuto|account-1|account-3-avviso|account-4-conferma|menu-2-notifiche|…`;
  esiti dei confronti in `~/Desktop/censimenti-app/step11-confronti/lotto1/`, `lotto2/` e `lotto3/`.

## Stati prima dell'abbonamento (step 12)

- Logica pura in `src/core/prenotazione/` (`orari.ts`: selettore estratto da `SlotPage.tsx` del funnel con l'origine
  dichiarata, giorni **dalle date restituite dalla funzione** e mai dal fuso del telefono, una ripetizione dopo 300 ms,
  scelta azzerata se l'orario sparisce, selezione singola; `conferma.ts`: parametri di `confirm_initial_appointment`,
  traduzione dei codici in esiti, testi; `nomi.ts` → `docs/diario-nomi.md`); servizi `src/servizi/prenotazione.ts`
  (orari con `get_nutritionist_available_slots_v2` e il solo `p_nutritionist_id` = `clients.nutritionist_id`; conferma;
  le due email della web app dopo `confirmed`, una sola volta per appuntamento, errori registrati e mai bloccanti) e hook
  `usePrenotazione.ts`; `impostaStatoConfermato` in `statoCliente.ts` mette G in memoria (mai nel portachiavi).
- Componenti in `src/ui/prenotazione/` (card "I tuoi dati", "La tua Nutrizionista", "La tua consulenza" anche barrata;
  `PannelloSceltaOrario` con le varianti del componente Figma `555:422`: orario passato, non disponibile, modifica,
  nessun orario; "Conferma orario" / "Annulla" e "Chiudi" nel `piede` fisso del `PannelloDalBasso` con `distanzaPiede`
  0, sempre visibili come nel diario, il foglio si apre alto quanto il contenuto e con molti orari scorre solo la
  griglia, decisione del 22/10/2026) e `src/ui/appuntamenti/CardAppuntamento.tsx` (contenuto della card condiviso con Appuntamenti);
  schermate `SchermataPrenotazione` (C e D), `SchermataPrenotato` (F), `SchermataConsulenzaConfermata` (G); rotte
  `app/stato/prenotazione.tsx` e `app/stato/prenotato.tsx`. Il menu (`app/menu.tsx`) negli stati C, D, F, G ha la sola
  voce "La tua nutrizionista" oltre a "Esci".
- Regole (censimento `~/Desktop/censimenti-app/step12-censimento-stati.md`): nessuna logica di prenotazione nuova,
  nessuna scrittura diretta dell'app (scrive solo la funzione del database); orari letti all'apertura del pannello,
  dopo `slot_taken`/`day_full`/`slot_in_past` e su "Riprova", mai al cambio di scheda; elenco vuoto → variante
  "Nessun orario" con il supporto da copiare; **scelta dell'orario sempre in due passaggi** (decisione del 22/10/2026,
  macchina a stati pura in `src/core/prenotazione/pannello.ts`): "Conferma orario" chiude il pannello e aggiorna la card
  con l'orario scelto, tenuto solo in memoria e **mai scritto sul lead**, in ogni variante (modifica, orario passato,
  non più disponibile); prenota soltanto "Conferma la consulenza"; dopo `slot_in_past`/`no_desired_slot` la card resta
  barrata finché non si sceglie un nuovo orario; `p_start_time` in `HH:MM:00`; G compare solo dopo una conferma nell'app e "Torna alla home" rilegge lo
  stato; in F senza link lo stato si rilegge al ritorno in primo piano. Lettura dello stato estesa a `phone_number`,
  `appointments.end_time`, `expertise`, `registration_number`.
- **Durate (decisione del 22/10/2026, tutta l'app)**: al cliente si mostra la durata della visita, non il blocco in
  calendario: prima visita 40 minuti, visita di controllo 20 (`DURATA_VISITA_MINUTI`, `fasciaOraria` in
  `src/core/appuntamenti/appuntamenti.ts`); fascia = inizio – inizio + durata (es. 18:30 – 19:10); `end_time` serve solo
  a decidere se la visita è in corso. Gli orari si scelgono a ore intere.
- Pagina di sviluppo: `/sviluppo/stati?stato=stati-1-da-confermare|stati-2-prima|stati-3-orario-passato|stati-4-scegli|stati-4.1-non-disponibile|stati-4.2-cambia|stati-4.3-nessun-orario|stati-4-molti-orari|stati-5-confermata|…`;
  esiti dei confronti in `~/Desktop/censimenti-app/step12-confronti/`.

## Diario vocale "Racconta" (step 10, lotti 1 e 2)

- Riferimenti: `~/Desktop/censimenti-app/step10-censimento-voce.md`, contratto di prodotto
  `~/Desktop/balanced-client-agents/docs/contratti/contratto-diario-vocale-v0_4.md`, contratto delle funzioni del server
  `~/Desktop/balanced-client-agents/docs/server-diario-vocale.md` (si leggono, non si modificano). Server su Railway,
  indirizzo pubblico in `EXPO_PUBLIC_AGENTI_URL` (`.env`, nome in `.env.example`); ogni chiamata porta
  `Authorization: Bearer <access_token>` della sessione Supabase, mai il `client_id`.
- Logica pura in `src/core/racconta/` (`flusso.ts` macchina a stati con effetti, `audio.ts` qualità, limite dei 3 minuti,
  timer e livello voce, `server.ts` intestazioni, lettura della risposta e traduzione dei codici d'errore in esiti,
  `attesa.ts` nota dell'audio in attesa, `nomi.ts` → `docs/diario-nomi.md`); servizio `src/servizi/racconta.ts` (stato
  condiviso, consenso nel portachiavi, audio in attesa nella cartella documenti, `trascriviAudio` con `expo/fetch` e
  rinnovo del token su 401), hook `src/servizi/useRacconta.ts` (possiede il registratore expo-audio e lo collega al
  flusso, avviso di sistema all'uscita con `usePreventRemove`); componenti `src/ui/racconta/` (PulsanteRegistrazione con
  le varianti Pronto / In registrazione / Da inviare, LivelloVoce con Reanimated, Argomenti, CardRacconto,
  ComandiRegistrazione), tutorial `src/ui/Suggerimento.tsx` e `src/ui/Tutorial.tsx` (velo al 40 %, elemento misurato e
  rifatto sopra il velo, "Ho capito"); schermata `SchermataRacconta.tsx`; rotta `app/racconta.tsx`.
- Registrazione: `expo-audio` 58.0.10 (approvato il 23/10/2026; plugin in `app.json` con il testo italiano del permesso,
  senza modalità in secondo piano), mono AAC-LC in m4a a 24 kHz / 48 kbit/s (`QUALITA_VOCE`; 3 minuti ≈ 1,1 MB, inviato come
  `audio/mp4`), file nella cartella documenti (`directory: 'document'`, nome `racconto-<data>`), limite di 3 minuti con
  arresto automatico un passo di lettura (100 ms, anche per il livello voce) prima e `forDuration` nativo come riserva; pausa quando l'app va in
  secondo piano e ripresa al rientro; le interruzioni di sistema (chiamata) mettono in pausa il registratore da sole e la
  lettura periodica le mostra come "In pausa". Lo stop porta alla 5.2 "Registrazione terminata" (`756:7628`): la
  trascrizione parte solo dal pulsante "Da inviare" (penna, decisione del 23/10/2026). Uscire con una registrazione in
  corso o terminata e non inviata chiede conferma con l'`Alert` di sistema ("Vuoi interrompere la registrazione?");
  solo "Interrompi" scarta il file. **expo-router 58 non emette più `beforeRemove`** (react-navigation incorporato):
  per bloccare l'uscita si usa solo `usePreventRemove` di `expo-router`, che copre freccia (`router.back()`) e tasto
  indietro di Android (bug del 23/10/2026). **Il gesto di scorrimento indietro di iOS** non si può annullare una volta
  partito (la schermata usciva e l'avviso compariva dopo): la rotta lo disattiva con `Stack.Screen gestureEnabled`
  mentre si registra, sulla 5.2 e durante la compilazione (`gestoIndietroDisattivato` in `flusso.ts`); negli altri
  stati resta attivo. Il livello giusto è questo (stack radice, `gestureEnabled` dello screen di react-native-screens,
  che blocca sia il gesto dal bordo sia quello dal contenuto di iOS 26); il registratore parte però solo dopo due
  fotogrammi (`dueFotogrammi` in `useRacconta.ts`), così l'opzione arriva al navigatore nativo prima che la sessione
  audio occupi il thread principale: altrimenti un trascinamento subito dopo il tocco poteva ancora far uscire la
  schermata (corsa osservata una volta su sedici il 23/10/2026). Una lettura del registratore "non sta registrando" a durata 0 è il registratore che sta ancora
  partendo, non una pausa (prima mostrava "In pausa" per un istante). Allo smontaggio il registratore si ferma sempre e l'evento
  `uscita` riporta all'avvio una registrazione rimasta senza registratore (`ripartiDallAvvio` all'apertura). Livello voce: il livello reale del microfono (metering) ammorbidito con Reanimated
  e un'onda per barretta calcolata sul thread dell'interfaccia (`altezzaBarretta`, worklet); ferme con "Riduci movimento".
  I pallini dei caricamenti (`Pulsante` stato `caricamento`) saltellano come nel funnel (1,2 s, ritardi 0,15 s): un solo
  ciclo nativo (una fase 0–1 e tre interpolazioni sfalsate), mai tre cicli separati con `Animated.delay`, perché lo
  sfalsamento dipenderebbe dai timer del thread JS.
- Trascrizione su richiesta (`POST /v1/diario-vocale/trascrivi`, byte del file, `X-Diary-Date`, `X-Audio-Duration-Ms`
  mai oltre 180 000, `X-Request-Id`), schermata 7.1 (`756:7718`); l'audio si cancella subito dopo un testo ricevuto e il
  testo va nella cartella documenti (`balanced.racconta.testo.<client_id>`) fino a fine giornata o alla creazione del
  diario: riaprendo Racconta lo stesso giorno si riparte da "Il tuo racconto". Trascrizione vuota o quasi (meno di dieci
  caratteri utili) → "Non ho capito" (11) senza passare dal racconto. Senza rete l'audio resta nella cartella documenti
  con la nota `balanced.racconta.<client_id>` e si riprova ogni 15 s e al ritorno in primo piano senza cambiare
  schermata; all'apertura successiva un audio di oggi non inviato riparte dalla 5.2, uno di un altro giorno si cancella.
  Errori: `riprovabile` → schermata 12 con "Riprova" e audio conservato; `sessione`, `nonDisponibile`, `definitivo` →
  schermata senza "Riprova" e audio cancellato (`testiErrore`).
- Consenso e tutorial per account (portachiavi, restano dopo "Esci", un altro account li rifà):
  `balanced.racconta.consenso.<client_id>` (la schermata 2 compare finché il permesso non è concesso e il consenso non è
  registrato; "Consenti" registra il consenso e apre la richiesta di sistema) e `balanced.racconta.tutorial.<client_id>`
  (Tutorial · 3 su Pronto, · 4 sulla 5.2, · 5 su "Il tuo racconto", una volta ciascuno, chiusi solo da "Ho capito").
- **Lotto 2 (compilazione, riepilogo, invio)**: logica pura in `src/core/racconta/compila.ts` (corpo `{ data, racconto,
  bozza }` con la bozza di oggi nel formato del server e "oggi riposo", `corpo-libero` del database ↔ `corpo_libero` del
  server in entrambi i versi, risposta tradotta nel modello dell'app con i valori fuori formato a vuoto, codici d'errore,
  testi della 12) e stati `compilazione` / `compilato` / `erroreCompilazione` in `flusso.ts`. "Crea il mio diario" →
  Racconta · 7 "Preparando il tuo diario" (`459:922`, senza freccia, uscita bloccata con `usePreventRemove`, tempo massimo
  75 s) → `POST /v1/diario-vocale/compila`; il diario restituito, già fuso, **sostituisce** il diario di oggi in memoria
  (`aggiornaDiario`) e si salva subito con `salvaBozzaInAttesa` (mai status, mai bozze vuote), poi il racconto salvato si
  cancella e `router.replace('/racconta-riepilogo')`. `non_ho_capito` → 11 (il racconto si cancella); errori → 12 con il
  racconto e "Riprova" (riprovabili e senza rete) o "Scrivi il diario". Giornata già condivisa o diario di oggi non in
  memoria → nessuna chiamata. Riepilogo "Modifica e invia" (`747:7517`): `SchermataRiepilogo` con i componenti della
  Card diario (pasti tutti aperti, `RigaPasto fissa`), hook `src/servizi/useRiepilogo.ts` (copia locale a ogni modifica,
  bozza salvata all'uscita e in secondo piano), "Invia alla nutrizionista" = `condividiOggi` (`src/servizi/condivisione.ts`,
  la stessa di Oggi), conferma ed errori di salvataggio mostrati in Oggi (`mostraNotificaInOggi`). Tutorial · 6
  (`758:7773`) al primo arrivo sul riepilogo, scorso in fondo (`Pagina scorriInFondoAllAvvio` + `onScorsoInFondo`), punto
  `riepilogo` della stessa chiave dei tutorial. Rotta `app/racconta-riepilogo.tsx`. **Tutorial** (`src/ui/Tutorial.tsx`):
  compare solo se l'elemento è misurato e sta per intero nella finestra (`src/core/tutorial/riquadro.ts`), un tocco sul
  velo lo chiude come "Ho capito"; finché l'elemento non è misurabile si riprova ogni 250 ms per 4 s e la `Pagina`
  ripete lo scorrimento in fondo (subito, dopo 400 ms e comunque entro 500 ms anche senza misura del contenuto), perché
  un solo tentativo mancato lasciava il tutorial nascosto (primo arrivo sul riepilogo, 23/10/2026). Un elemento dentro il contenuto scorrevole si misura tramite la `Pagina`
  (`collegaMisura`: posizione nel contenuto + ScrollView nella finestra − scorrimento dagli eventi), perché dopo uno
  `scrollToEnd` programmato `measureInWindow` resta alla posizione di prima: l'evento di scorrimento lo consuma il
  worklet di Reanimated e l'albero di Fabric non riceve il nuovo spostamento (difetto del 23/10/2026, velo senza fumetto).
- Pagina di sviluppo: `/sviluppo/stati?stato=racconta-2-permesso|racconta-3-microfono-disattivato|racconta-4-pronto|racconta-5-registrazione|racconta-5-registrazione-animata|racconta-5-pausa|racconta-5.2-terminata|racconta-tutorial-3-pronto|racconta-tutorial-4-trascrizione|racconta-tutorial-5-crea-diario|racconta-6-racconto|racconta-6-tastiera|racconta-7-trascrizione|racconta-10-senza-connessione|racconta-11-non-ho-capito|racconta-12-errore|racconta-7-preparando|racconta-12-elaborazione|racconta-8-riepilogo|racconta-8-riepilogo-compilato|racconta-8-riepilogo-riposo|racconta-8-riepilogo-vuoto|racconta-8-riepilogo-tastiera|racconta-tutorial-6-invio|…`
  (registrazione finta con timer e livello voce); esiti dei confronti in `~/Desktop/censimenti-app/step10-confronti/lotto1/` e `lotto2/`.

## Piano alimentare (step 8, lotto 1: lettura e regole, senza schermate)

- Riferimenti: contratto `~/Desktop/balanced-agents/docs/piani/contratto-lettura-piani-app-v0_5.md` (§6: funzione e
  risposta), censimento `~/Desktop/censimenti-app/step8-censimento-piano.md`. **L'app legge il piano solo con
  `supabase.rpc('get_my_current_nutrition_plan', { p_known_plan_id, p_known_updated_at })`**: mai le tabelle
  `nutrition_*` né `plans`; nessuna scrittura. Risposta con discriminante `esito`: `nessun_piano` | `invariato` | `piano`.
- Logica pura in `src/core/piano/` (`tipi.ts` forma della risposta e `interpretaRisposta`, che porta a null i valori fuori
  formato e rifiuta le forme sconosciute; `riga.ts` quantità e "nome · quantità", nome breve del pasto; `composizione.ts`
  `componiPiano`; `preselezione.ts` giorno e pasto preselezionati). Regole (decisioni del 24/10/2026): sezioni senza
  righe, pasti senza sezioni visibili e giorni senza pasti visibili si nascondono; un piano senza righe vale "nessun
  piano" ("Piano in elaborazione"). Fisso: pasti per `position`, righe per sezione e poi per riga, senza categorie.
  Variabile: unico giorno, righe per categoria nell'ordine fisso carboidrati, proteine, grassi, fibre, zuccheri
  (sezioni della stessa categoria unite). Quantità: `a_piacere` → "a piacere"; altrimenti `practical_quantity` così
  com'è; altrimenti `quantity` + `measure_type` con i numeri all'italiana; senza nulla solo il nome. Nome del pasto nel
  selettore oltre i 6 caratteri: i primi 5 più "." ("Colaz.", "Spunt."), maiuscole come arrivano. Giorno preselezionato:
  oggi in ora italiana (lunedì = 1) se visibile, altrimenti il primo; pasto preselezionato per fascia (fino alle 10:30
  "colazione", 10:30–15:00 "pranzo", 15:00–18:30 "spuntin", dalle 18:30 "cena", confronto senza maiuscole e spazi ai
  lati, il confine appartiene alla fascia che inizia), altrimenti il primo. "Aggiornato il 12 ottobre" da `updated_at`
  in ora italiana (`etichettaGiornoMese`). Indicazioni per `position`; il pulsante esiste solo se ce n'è almeno una.
- Servizio `src/servizi/piano.ts`: lettura all'avvio dell'app dell'abbonato e al rientro (`aggiornaPiano` in
  `app/(abbonato)/abbonato.tsx`) e all'apertura della scheda (`usePiano`, `src/servizi/usePiano.ts`, sullo stampo di
  `useLetturaMenu`); sempre con la versione nota: `invariato` tiene la copia, `piano` la sostituisce, `nessun_piano` la
  cancella. Copia su file nella cache (`balanced.piano.<clientId>`), servita subito e senza rete; una sola chiamata in
  corso per cliente; memoria con l'esito dell'ultima chiamata (`useMemoriaPiano`). "Esci" la cancella (`svuotaPiano`).
- Vista di sviluppo: `/sviluppo/stati?stato=piano-lettura` (piano composto in forma testuale per l'account in
  sessione; legge lo stato dal portachiavi se la rotta è aperta con `EXPO_PUBLIC_ROTTA_SVILUPPO`). Account: `+test4`
  (fisso inviato), `alessandro@test10.com` (abbonato senza piano → "nessun piano").
- **Lotto 2 (schermate, 25/10/2026)**: `SchermataPiano` (`src/ui/schermate/SchermataPiano.tsx`, Figma 527:2947 fisso,
  527:3070 variabile, 527:3174 in elaborazione): barra superiore, intestazione **fissa** (16 sopra, margini 20, gap 24)
  con la riga del titolo ("Piano" in Accento serif + `AzioneTesto` "Indicazioni", Figma 775:7814, solo se il piano ha
  indicazioni) e il `SelettoreSegmentato` (`src/ui/piano/`, Segmento 528:221: pillola sfondo/campo padding 3/4, voci a
  larghezza uguale, evidenza sfondo/card); sotto, le pagine (giorni del fisso o pasti del variabile) in uno
  ScrollView orizzontale con scatto alla pagina, ciascuna scorrevole in verticale sotto la barra di navigazione
  (`INGOMBRO_BARRA_NAVIGAZIONE + 16`). Selettore e pagine condividono uno shared value di Reanimated (`posizione`):
  trascinando l'evidenza segue il dito, a fine scorrimento si assesta in 300 ms ease-out (`TRANSIZIONI.tacchetteMs`, con
  "Riduci movimento" niente scorrimento animato), il tocco su una voce anima l'evidenza e porta alla pagina. Contenuto:
  `GruppoRighe` (Heading + righe Body con Separatore) e `PieDiPaginaPiano` ("Aggiornato il…"); "Ricetta" non c'è
  (step 9) e non lascia spazio. Fasi: caricamento = segnaposti sulla forma della pagina; errore = Trasversali 3 con
  titolo "Piano"; senza rete senza copia = Trasversali 1; con copia (`daCache`) = Avviso connessione sopra il titolo;
  nessun piano = card "Piano in elaborazione" (padding 32, gap 16). `usePiano` parte dalla copia già in memoria
  (`useLetturaMenu(leggi, iniziale)`). Indicazioni: `SchermataIndicazioni` (Figma 775:7878: freccia sola, titolo in
  Accento serif, Heading + Body per indicazione), rotta `app/indicazioni.tsx` (`animation: 'default'`, gesto dal bordo),
  legge `memoriaPiano()` senza richieste. **Reanimated su nativo ignora gli array di dipendenze** di `useAnimatedStyle`
  e `useAnimatedScrollHandler` e lo segnala con un avviso: non passarli (il plugin Babel traccia da solo).
- Pagina di sviluppo: `/sviluppo/stati?stato=piano-1-fisso|piano-1-fisso-nomi-lunghi|piano-1-fisso-giorno-vuoto|piano-1-senza-indicazioni|piano-2-variabile|piano-2-variabile-nomi-lunghi|piano-3-in-elaborazione|piano-caricamento|piano-errore|piano-senza-rete|piano-senza-rete-copia|piano-1.1-indicazioni|piano-reale|piano-reale-indicazioni|piano-lettura`
  (piani sintetici con i testi di Figma in `src/ui/sviluppo/PianoSchermateSviluppo.tsx`; `piano-reale*` usa l'hook vero
  per l'account in sessione); esiti dei confronti in `~/Desktop/censimenti-app/step8-confronti/`.

## Sostituzione degli alimenti (step 9, lotto 3)

- Riferimenti: contratto `~/Desktop/balanced-client-agents/docs/contratti/contratto-sostituzione-alimenti-v0_8.md` (§1 percorso,
  §3 esiti), server `~/Desktop/balanced-client-agents/docs/server-sostituzione.md` (rotta `POST /v1/sostituzione/alternative`,
  tabella degli errori), contratto di lettura v0.6 (`id` delle righe, §3.1). **L'app non scrive sul database**: il server
  registra da sé ogni chiamata in `food_substitution_events` (mai il profilo).
- Id delle righe: `RigaServer.id` e `RigaPiano.id` (null se fuori formato: la riga resta visibile ma non toccabile). La copia
  del piano sul telefono è versionata (`src/core/piano/copia.ts`, `VERSIONE_COPIA` 2): una copia di un'altra versione (senza
  id) si scarta una volta e la prima lettura parte senza versione nota; `leggiPiano(clientId, { ignoraVersione: true })`
  forza la lettura intera (dopo `riga_non_disponibile`).
- Logica pura in `src/core/sostituzione/` (`server.ts`: corpo `{ riga_id, in_casa }` con il testo pulito e mai oltre 200
  caratteri, lettura della risposta con al massimo tre alternative e `fuori_catalogo` ignorato, codici d'errore → esiti,
  `paragrafiSpiegazione` = spiegazione del server + secondo paragrafo con i motivi degli alimenti in casa non adatti solo se
  il cliente ha scritto qualcosa, come frasi, senza ripetere quelli già nella spiegazione; `pannello.ts`: macchina a stati
  chiuso / avvio / ricerca / alternative / nessunaAlternativa / nonRiconosciuto / errore, ogni apertura riparte da capo, la
  chiamata parte solo da "Trova alternative", la risposta di una richiesta vecchia o dopo la chiusura si ignora,
  `riga_non_disponibile` chiude il pannello ed emette `rileggiPiano`; testi delle card in `testiEsito`).
- Servizi: `src/servizi/agenti.ts` (indirizzo `EXPO_PUBLIC_AGENTI_URL` e `tokenAccesso`, condivisi con il diario vocale),
  `sostituzione.ts` (`trovaAlternative`: `expo/fetch`, attesa massima 35 s, rinnovo del token su 401 e una ripetizione,
  `in_casa_troppo_lungo` → testo accorciato alla metà e una ripetizione; tutorial del Piano nel portachiavi
  `balanced.piano.tutorial.<client_id>`, resta dopo "Esci"), hook `useSostituzione.ts` (stato del pannello, effetti, Notifica
  breve "Il piano è stato aggiornato: tocca di nuovo l’alimento." con rilettura del piano) e `useTutorialPiano`.
- Interfaccia: righe del piano toccabili (`RigaDelPiano` in `src/ui/piano/ContenutoPiano.tsx`, anche "a piacere", fisso e
  variabile); `src/ui/piano/PannelloSostituzione.tsx` (Figma 4 531:3086, 4.1 531:3232, 4.2 531:3374, 4.3 531:3528, 4.4
  789:7727, 4.5 789:7865) sul `PannelloDalBasso` con `spaziatura` 24; `EtichettaAI` (532:3430); Card spiegazione AI con lo
  sfondo `gradienti.cardDiario` e Icona 20/Info; segnaposti della ricerca con il `Segnaposto` (barre 160 e 240); "La tua
  nutrizionista" (4.3, 4.4) chiude il pannello e apre `/nutrizionista`; "Riprova" (4.5) solo per rete, timeout ed errori
  riprovabili; sessione e abbonamento con i testi del diario vocale, senza "Riprova". Errori: rete, tempo scaduto,
  `sostituzione_fallita`, `sostituzione_timeout`, `catalogo_non_disponibile`, `piano_non_leggibile`, `errore_interno` → 4.5.
- Tutorial · 1 (586:5457): solo il fumetto della sostituzione, alla prima visita del Piano con un piano presente, una volta
  per account, sulla prima riga della pagina corrente (misurata con `measureInWindow`, ascissa e larghezza dal margine di
  pagina perché le pagine scorrono in orizzontale), evidenza sfondo/pagina con raggio piccolo (8 ai lati, 3 sopra e sotto);
  `Tutorial` con `disposizione="sottoASinistra"` e `Suggerimento` con `freccia="sopra"` (punta a 32 dal bordo). Un solo
  passo: niente "1 di 2", "Ho capito" come gli altri tutorial. Il fumetto della ricetta arriverà con le ricette.
- Pagina di sviluppo: `/sviluppo/stati?stato=piano-4-sostituzione-avvio|piano-4.1-sostituzione-ricerca|piano-4.2-sostituzione-alternative|piano-4.2-sostituzione-una|piano-4.2-sostituzione-in-casa|piano-4.3-sostituzione-nessuna|piano-4.4-sostituzione-non-riconosciuto|piano-4.5-sostituzione-errore|piano-4.5-sostituzione-sessione|piano-tutorial-1-sostituzione`
  (dati sintetici, nessun server; `piano-reale` usa la sostituzione vera); esiti dei confronti in
  `~/Desktop/censimenti-app/step9-confronti/` (`strumenti/confronto-step9.sh`).

## Ricette e Le tue ricette (step 9, lotto 3)

- Riferimenti: contratto `~/Desktop/balanced-client-agents/docs/contratti/contratto-ricette-v0_2.md` (§1 percorso, §3.2
  porzioni, §5 esiti), server `~/Desktop/balanced-client-agents/docs/server-ricette.md` (rotte `POST /v1/ricette/idee` e
  `/v1/ricette/ricetta`, tabella degli errori), tabella `client_saved_recipes` (migrazione `20261028220205` del repo degli
  agenti). **Unica scrittura dell'app sul database:** inserimento ed eliminazione in `client_saved_recipes` con la sessione
  del cliente (RLS, come il diario), mai modifiche; il server registra da sé ogni chiamata in `recipe_generation_events`.
- Logica pura in `src/core/ricette/` (`server.ts`: corpi delle due chiamate, campo pulito e mai oltre 200 caratteri, lettura
  delle risposte con al massimo tre idee, `richiesta_id` e `stima` rimandati tali e quali, ricetta con la forma `grezza` da
  salvare, codici d'errore → esiti; `tempo.ts`: "20 minuti · Pranzo", "30 minuti · più 3 ore di riposo · Spuntino", "Pranzo ·
  20 min", riga "Per 8 porzioni · La tua porzione: …"; `contesto.ts`: nel fisso il giorno del selettore con i pasti del giorno
  nel loro ordine e senza preselezione, nel variabile il pasto del selettore; `pannello.ts`: macchina a stati chiuso / avvio /
  ricerca / idee / attesaRicetta / nessunaIdea / errore, la chiamata parte solo da "Trova idee" e la seconda solo da "Vedi la
  ricetta" dopo il tocco di un'idea, risposte vecchie o dopo la chiusura ignorate; **ricetta pronta** (decisione del
  29/10/2026): il pannello resta aperto (`ricettaPronta`, stesso aspetto dell'attesa) mentre la pagina della ricetta entra da
  destra sopra di lui, e si chiude **senza animazione** solo a transizione finita (`transitionEnd` della rotta `/ricetta` →
  `segnalaRicettaMostrata` → evento `ricettaMostrata`; riserva di 1,5 s se l'evento non arriva; `PannelloDalBasso
  chiusuraIstantanea`), così tornando indietro si vede il Piano senza pannello e in mezzo non compare mai il Piano;
  `pasto_non_disponibile` chiude il pannello
  ed emette `rileggiPiano` (Notifica breve "Il piano è stato aggiornato: tocca di nuovo “Ricetta”."), `stima_non_plausibile` e
  `idea_non_ammessa` tornano alla ricerca delle idee, "Riprova" ripete la chiamata fallita; `salvate.ts`: riga da inserire,
  elenco dalla più recente, `salvaRicetta` / `eliminaRicetta` con uno scrittore iniettabile per i test; `nomi.ts` →
  `docs/diario-nomi.md`).
- Servizi: `src/servizi/ricette.ts` (`trovaIdee` attesa 65 s, `preparaRicetta` attesa 95 s, `expo/fetch`, rinnovo del token su
  401 e una ripetizione, `campo_troppo_lungo` → testo accorciato alla metà; memoria della ricetta pronta per la pagina),
  `ricetteSalvate.ts` (lettura con colonne esplicite filtrata per cliente e copia su file `balanced.ricette.<clientId>` nella
  cache, inserimento con `select('id, created_at')`, eliminazione per id, memoria aggiornata subito), hook `useRicette.ts`
  (pannello + `useRicetteSalvate`). "Esci" svuota memoria e copia.
- Interfaccia: accesso "Ricetta" sotto il selettore, a destra, in ogni pagina del fisso e del variabile
  (`EtichettaAIToccabile` in `src/ui/piano/EtichettaAI.tsx`, area toccabile 44 con l'hitSlop; riga alta 20 seguita subito dal
  primo pasto, Figma 817:7859); `src/ui/piano/PannelloRicetta.tsx` (Figma 5 536:3448, 5.1 536:3626, 5.2 537:4384, 5.3
  536:3770, 5.3.1 824:8046, 5.3.2 826:8118, 5.3.3 826:8283, 5.7 818:8055, 5.8 818:8193, 5.8.1 826:8443) con le `Opzione` dei pasti a capo (gap 4), le card delle idee (bordo 2
  `bordo/selezione` sulla scelta) e la Card spiegazione AI con la nota fissa e la frase sugli ingredienti;
  `src/ui/piano/BarraAttesa.tsx` (barra 4 che si riempie in 10 s con "Circa 10 secondi", poi ferma quasi piena con "Ancora
  qualche secondo…"; compare aprendosi in 300 ms ease-out, senza animazione con "Riduci movimento"; 10 s perché il server è
  pubblicato con `RICETTE_EFFORT=low`); `SchermataRicetta` (5.4 539:3500, 5.5 818:7834, 5.6 818:7907, Menu 7.2 818:7983: H2,
  sottotitolo, Ingredienti con l'eventuale riga della porzione, Preparazione, Card spiegazione AI, "Salva ricetta" →
  "Salvata" oppure "Elimina ricetta" con l'`Alert` di sistema) e `SchermataRicetteSalvate` (Menu 7 539:3724, 7.1 539:3777,
  righe `RigaElenco dueRighe`). Rotte `app/ricetta.tsx` (legge la memoria, nessuna richiesta), `app/ricette/index.tsx`,
  `app/ricette/[id].tsx`; voce "Le tue ricette" nel menu tra Peso e misure e Contenuti.
- **Tutorial del Piano a due fumetti** (chiave nuova `balanced.piano.tutorial-2.<client_id>`, così chi aveva chiuso quello a
  un fumetto vede la versione nuova): "1 di 2" sulla prima riga con "Avanti" (586:5457), "2 di 2" su "Ricetta" con "Ho capito"
  (586:5598, `Tutorial` con `disposizione="sottoADestra"`, punta sotto il centro dell'elemento, evidenza 8 ai lati e 6 sopra e
  sotto). `Suggerimento` ha `passo`, `azione` e `centroPunta`.
- Disegni aggiunti il 29/10/2026: 5.3.2 attesa oltre il tempo stimato (826:8118, barra ferma a 335/353), 5.3.3 idee con
  ingredienti non usati (826:8283, secondo paragrafo della Card spiegazione AI), 5.8.1 errore nella preparazione (826:8443),
  riposo nel sottotitolo di 5.5 ("50 minuti · più 2 ore di riposo · Spuntino"). La Notifica breve di 5.6 sta in basso come
  tutte le Notifiche brevi.
- Pagina di sviluppo: `/sviluppo/stati?stato=piano-5-ricetta-fisso|piano-5-ricetta-fisso-scelto|piano-5.1-ricetta-variabile|piano-5.2-ricetta-ricerca|piano-5.3-ricetta-idee|piano-5.3-ricetta-idee-selezionata|piano-5.3.3-ricetta-idee-frase|piano-5.3.1-ricetta-attesa|piano-5.3.2-ricetta-attesa-oltre|piano-5.4-ricetta|piano-5.5-ricetta-porzioni|piano-5.6-ricetta-salvata|piano-5.6-ricetta-errore-salvataggio|piano-5.7-ricetta-nessuna-idea|piano-5.8-ricetta-errore|piano-5.8.1-ricetta-errore-ricetta|piano-5.8-ricetta-errore-sessione|piano-tutorial-1-sostituzione|piano-tutorial-2-ricette|menu-7-ricette|menu-7.1-ricette-vuoto|menu-7.2-ricetta-salvata|menu-7-ricette-caricamento|menu-7-ricette-errore|menu-7-ricette-senza-rete-copia`
  (dati sintetici, nessun server; `piano-reale` usa le ricette vere); esiti dei confronti in
  `~/Desktop/censimenti-app/step9-confronti-ricette/` (`strumenti/confronto-step9-ricette.sh`).

## Notifiche push, carosello del primo accesso e consenso AI (step 6, lotto dell'app)

- Riferimenti: contratto `~/Desktop/balanced-client-agents/docs/contratti/contratto-notifiche-v0_2.md`, server
  `~/Desktop/balanced-client-agents/docs/server-notifiche.md` (tipi, testi, `data` della push, id delle categorie Android),
  censimento `~/Desktop/censimenti-app/step6-censimento-notifiche.md`. Tabelle `client_devices` e `client_consents` (migrazioni
  `20261029224322` e `20261029224353` del repo degli agenti, RLS per il cliente): **l'app scrive solo le proprie righe** con la
  sessione del cliente (telefoni: lettura, inserimento, aggiornamento, mai cancellazioni; consensi: lettura e inserimento).
- Logica pura in `src/core/notifiche/push.ts` (categorie Android `nutrizionista` / `promemoria` con gli id del server,
  lettura dei `data` della push, tipo → destinazione del contratto §2, scheda di partenza e rotta), `src/core/notifiche/dispositivo.ts`
  (righe di `client_devices`, azione in Account per permesso), `src/core/consenso/consenso.ts` (`ai_features`, `text_version`
  `v1`, valido se l'ultima riga è `granted`, testi del pannello per funzione), `src/core/primoAccesso/carosello.ts` (macchina a
  stati delle 5 pagine, testi di Figma 586:4905 … 586:5154).
- Servizi: `src/servizi/notifichePush.ts` (**unico import di expo-notifications**: banner anche con l'app aperta, categorie create
  prima della richiesta del permesso, permesso, codice FCM con `getDevicePushTokenAsync` — mai il codice push di Expo —, ascolto,
  notifiche locali di prova solo in `__DEV__`), `dispositivo.ts` (riga del telefono creata o aggiornata all'avvio da
  `app/index.tsx` con permesso, versioni, modello, ultimo accesso; ritrovata per `installation_id` nel portachiavi
  `balanced.installazione` o per codice; "Esci" la disattiva con motivo `logout` **prima** del signOut; il permesso cambiato si
  riscrive da solo; senza codice — iPhone senza credenziali Apple, simulatore — nessuna scrittura), `consenso.ts` (ultima riga
  in memoria, letta all'avvio; `registraConsensoAI(clientId, 'granted' | 'revoked')`), `primoAccesso.ts` ("visto" nel portachiavi
  `balanced.primo-accesso`, per telefono, resta dopo "Esci"), `aperturaNotifiche.ts` (ascolto avviato dal layout radice; la
  destinazione di una notifica toccata ad app chiusa si conserva finché il layout `(abbonato)` non è montato; apertura = chiusura
  delle pagine sopra le schede, `replace` della scheda di partenza e `push` della pagina, così "indietro" torna alla scheda; con
  l'app aperta all'arrivo si aggiornano campanella e pallino di Revisioni), hook `useConsensoAI.ts` e `usePermessoNotifiche.ts`.
- Carosello (`app/primo-accesso.tsx`, `src/ui/primoAccesso/`): dopo la lettura dello stato, per ogni cliente con profilo, una volta
  per telefono; "Salta" (pagine 1–3) → pagina 4; pagina 4 "Accetto" scrive `granted` e passa alla 5 (senza rete resta con la
  Notifica breve), "Non ora" prosegue senza scrivere, "Informativa" apre l'informativa privacy; pagina 5 "Attiva le notifiche"
  chiede il permesso di sistema (dopo le categorie) e aggiorna la riga del telefono, "Più tardi" prosegue. Le anteprime delle
  pagine 2 e 4 sono le schermate vere ridotte all'84 % dentro una card di 380 (`Anteprime.tsx`), la 3 è la Card revisione Nuova
  con foto e nome della nutrizionista del cliente (iniziali senza foto, `autoreRevisione`). **Correzioni del 31/10/2026**: le
  tacche sono l'`IndicatoreAvanzamento` del diario con `larghezzaAttivo="doppia"` (attiva lunga il doppio, Figma 586:4923) e la
  stessa animazione di 300 ms ease-out; nelle pagine 4 e 5 "Salta" non c'è e le tacche occupano tutta la larghezza: lo spazio
  del pulsante (misurato una volta, poi a larghezza fissa così il testo non va a capo) si anima a zero insieme alla dissolvenza,
  niente animazione con "Riduci movimento". L'illustrazione non ha più `overflow: hidden`: con poco spazio (schermi bassi, testo
  di sistema ingrandito) il titolo centrato della pagina 1 veniva tagliato sopra e sotto; lo spazio extra di `Testo` ora segue la
  scala dei font del sistema (`PixelRatio.getFontScale`). Verifica dei titoli: `/sviluppo/titoli` ha anche i cinque titoli del
  carosello; strisce dell'allungamento delle tacche in `step6-confronti/tacche-*.png`.
- Consenso al primo uso: `src/ui/consenso/ConsensoAI.tsx` (`CardConsensoAI` dentro i pannelli Sostituisci e Ricetta al posto del
  contenuto — stato `consenso` degli hook `useSostituzione` / `useRicette`: "Trova" senza consenso valido o risposta 403
  `consenso_mancante` → card; "Accetto" scrive e fa partire o ripetere la chiamata; `PannelloConsensoAI` sopra Racconta, "Non ora"
  torna a Oggi). I codici `consenso_mancante` → esito `consensoMancante` e `consenso_non_verificabile` → `riprovabile` stanno nei
  `server.ts` di sostituzione, ricette e racconta (e in `compila.ts`); in Racconta l'audio resta per il "riprova".
  Il consenso del diario vocale salvato solo sul telefono è stato tolto (la chiave vecchia si cancella all'apertura) e Racconta · 2
  è solo la richiesta del permesso del microfono (testo di Figma 459:676).
- Account: card Notifiche con Messaggio + "Attiva le notifiche" (permesso da chiedere) o "Apri le impostazioni" (negato senza
  poter richiedere), interruttore "Funzioni con intelligenza artificiale" in Privacy e dati (prima riga; `revoked` / `granted`).
  Campanella: tipo `plan_sent` → "Il tuo piano è pronto" / "<Nome> ha preparato il tuo piano alimentare." → Piano.
- Configurazione nativa: plugin `expo-notifications` in `app.json` (icona `assets/notifica-android.png` dal componente Figma
  831:8741, sagoma bianca 96 × 96 generata da `render.swift` sul Mac; colore `#347F75` = `azione/primaria`, unico valore scritto a
  mano perché `app.json` non legge i token; categoria predefinita `nutrizionista`), `android.googleServicesFile` =
  `google-services.json` (in `apps/app/`, **ignorato da git**), `expo-device` per modello e versione del sistema. Su iOS il plugin
  aggiunge l'entitlement `aps-environment = development` senza credenziali: predisposizione, nessuna push finché non c'è
  l'account Apple. Dopo le modifiche: `npx expo prebuild -p android` / `-p ios` e nuova build di sviluppo.
- Prove: `/sviluppo/notifiche-prova` (solo `__DEV__`) programma notifiche locali con gli stessi `data` del server per ogni tipo,
  mostra permesso, codice, riga del telefono, consenso e destinazione in attesa, azzera il carosello. Pagina degli stati:
  `/sviluppo/stati?stato=primo-accesso-1|…|primo-accesso-5|racconta-consenso|piano-4.6-sostituzione-consenso|piano-5.9-ricetta-consenso|account-2-notifiche-disattivate|account-3-notifiche-negate|account-1|menu-2-notifiche`;
  esiti dei confronti in `~/Desktop/censimenti-app/step6-confronti/` (`strumenti/confronto-step6.sh`).
- **Correzioni dopo le prove del 31/10/2026** (esiti in `~/Desktop/censimenti-app/correzioni-step6/`,
  `strumenti/confronto-correzioni-step6.sh`):
  1. Notifica toccata che portava a Oggi senza il pannello: il segnale "layout dell'abbonato montato" era un booleano e un
     `router.replace` sulla stessa scheda (apertura di una notifica, riga della campanella) rimonta il gruppo: il nuovo layout
     metteva vero, lo smontaggio del vecchio rimetteva falso e da lì ogni notifica restava parcheggiata. Ora si contano le istanze
     (`src/core/notifiche/montaggio.ts`, test del rimontaggio). Registro di sviluppo delle aperture (`registroApertura`, solo
     `__DEV__`, ultime 40 righe) nella pagina `/sviluppo/notifiche-prova`. Riprodotto e verificato con +test4 sull'emulatore:
     da Oggi, dalla pagina delle notifiche dopo una riga della campanella, da Piano, due notifiche ravvicinate, processo ucciso.
     Per le prove ad app chiusa: `am force-stop` cancella gli allarmi delle notifiche programmate; usare Home + `am kill`.
  2. Android, "g" di "giornata!" nella Card diario **tagliata in basso** (la prima verifica a occhio era sbagliata; con la
     misura a pixel la "g" scendeva 5,3 dp sotto la base della "i" contro 6,7 su iPhone). Causa: con l'interlinea sotto
     l'altezza naturale lo span dell'interlinea di React Native riduce la discesa dell'ultima riga e la TextView ritaglia il
     disegno al riquadro delle righe, padding compreso. Correzione in `Testo`, solo Android: `overflow: 'visible'` sugli stili
     con interlinea stretta (React Native disegna il layout senza il ritaglio della TextView e le discendenti escono nel padding
     già previsto). Dopo: 6,9 dp su Android a scala 1,0 e 1,3 (serif del carosello da 4,6 a 7,2; Display uguale al riferimento
     con interlinea larga); iPhone identico al pixel (0 pixel diversi a testo normale e molto grande). Verifica: blocco
     "discendenti" di `/sviluppo/titoli` con `strumenti/discesa-g.mjs` (discesa della g rispetto alla i che la segue) e
     `strumenti/profilo-g.mjs` (pixel delle ultime righe: un occhiello intero finisce con pochi pixel, uno tagliato con la riga
     più larga); numeri in `correzioni-step6/punto2-g-android/misure.md`. Il cambio della scala dei caratteri a app aperta
     lascia misure dei testi stantie (una riga serif andava a capo): per le prove riavviare l'app dopo `settings put system
     font_scale`; un elemento in fondo allo schermo è tagliato dal bordo, non dal testo.
  3. Indicazioni: freccia e titolo fissi, scorre solo il testo (`Pagina scorrevole={false}` + ScrollView, Figma 775:7878).
  4. Ricetta salvata: la Notifica breve sta sopra il pulsante "Salvata" (`NotificaInBasso sopra`, Figma 818:7907).
  5. Tutorial · 3 e · 4 di Racconta: l'elemento evidenziato è "Tocca per iniziare" + timer + pulsante (`TimerEPulsanteTutorial`),
     il fumetto sta sopra e il timer resta leggibile; il contenitore misurato è largo tutta la riga perché su Android la copia
     sopra il velo, larga al pixel quanto il testo, andava a capo.
  6. Segnaposti della ricerca (Sostituisci 4.1, Ricetta 5.2): barre 160 × 16 e 240 × 12 (`RigaSegnaposto` con altezza).
  7. **Notifiche viste quando il contenuto è visto** (unico meccanismo): all'apertura del pannello di una giornata
     (`usePannelloGiornata.apriGiornata`) o della lettura di una revisione (`useLetturaRevisione`), da qualunque percorso (push,
     tendina, campanella, Card settimana, Revisioni), `segnaVisteContenuto(riferimento, notificaId?)` prende dall'elenco in
     memoria gli id non visti con lo stesso `reference_id` (`idDaSegnareViste`) e scrive **una sola** modifica
     `viewed_at` (`.in('id', ids).is('viewed_at', null).eq('user_id')`), memoria e copia su file aggiornate subito (pallino della
     campanella spento senza riletture); nessun id → nessuna scrittura; ad app chiusa con l'elenco non caricato vale il
     `notifica_id` della push. Verificato: una PATCH sola nei log di PostgREST, nessuna per una giornata senza notifiche.

## Android (verifica del 29/10/2026 e lotto 1 di correzioni del 30/10/2026)

- Strumenti sul Mac: OpenJDK 17 (formula Homebrew `openjdk@17`, la cask Zulu chiede sudo) e SDK da riga di comando in
  `/opt/homebrew/share/android-commandlinetools` (platform-tools, emulator, platforms 37.0 e 36, build-tools 37.0.0,
  NDK 27.1, CMake, immagine Android 17 con Google Play); AVD `Pixel_9a_API_37`. Variabili d'ambiente in
  `~/Desktop/censimenti-app/strumenti/env-android.sh` (da aggiungere a `~/.zshrc`). Build: `npx expo run:android
  --device emulator-5554` (12 min la prima volta; `npx expo prebuild -p android` dopo ogni modifica ad `app.json`), poi
  `adb reverse tcp:8081 tcp:8081`. Screenshot e tocchi con `strumenti/android-azioni.sh` (pixel fisici 1080×2424;
  `input text` non accetta accenti); debugger di Metro per dispositivo con `strumenti/valuta-su.mjs sdk_gphone|iPhone`.
  Fast Refresh non sempre arriva al bundle Android: dopo una modifica ai moduli del tema riavviare l'app.
- **Le correzioni Android stanno in rami `Platform.OS === 'android'`**: su iOS non cambia nulla, verificato con il
  confronto a pixel prima/dopo (`android-verifica/dopo/ios-confronto/`). Esiti e confronti con Figma in
  `~/Desktop/censimenti-app/android-verifica/` (`report.md`, `dopo/`).
- Indietro di sistema (tasto o gesto): nel layout del gruppo `(abbonato)` un `BackHandler` con `useFocusEffect` porta a
  Oggi da Piano, Revisioni e Account e da Oggi lascia fare al sistema (app in secondo piano, ripresa senza riavvio);
  `Tutorial` e `PannelloDalBasso` hanno il loro gestore (registrato dopo, quindi chiamato prima) e chiudono se stessi;
  Racconta usa `usePreventRemove`. Nelle pagine sopra le schede vale lo stack.
- Testi: `correzioneVerticaleAndroid` in `testo-correzioni.ts` (scelta in `Testo` per piattaforma), misurata con
  `strumenti/misura-titoli2.mjs` (distanza cella → primo pixel del titolo su `/sviluppo/titoli`, emulatore 2,625× vs
  simulatore 3×, tolleranza 0,5 dp); per h1 e h1Accesso conta la riga mista di `TitoloAccento`.
- Alone sfumato (giorno di oggi in Card settimana, pallino della card revisione): `src/ui/Alone.tsx`, sfumatura radiale
  SVG sotto il cerchio con il profilo del rendering Figma 449:253, solo Android; su iOS resta `shadow*`.
- Piede dei pannelli: `paddingInferioreSicuro` (`src/ui/areaSicura.ts`) aggiunge 8 all'area di sistema di Android
  (24 gesti / 48 tre tasti, Figma «Schermo Android» 414:34) così la distanza dal bordo è quella dell'iPhone.
- Avvio: `android.backgroundColor` crema in `app.json` (finestra tra splash e primo frame). Appunti: su Android 13+
  nessuna Notifica breve dopo la copia (il sistema mostra la sua anteprima). Peso e misure: la copia su file compare
  subito (`useLetturaMenu` con `copia`, vale anche per iOS). Permesso microfono «solo questa volta»: alla scadenza
  il flusso riparte dalla schermata del consenso senza errori (nessuna modifica necessaria).
- Scorrimenti: ogni ScrollView, FlatList e pagina orizzontale del Piano prende `{...PROPRIETA_SCORRIMENTO}`
  (`src/ui/scorrimento.ts`): su Android `overScrollMode="never"` (niente stretch overscroll di Android 12+), su iOS
  la costante è vuota. Vale anche per le liste future. Verifica: screenshot a metà di un trascinamento oltre il bordo
  uguale a quello a riposo (`android-verifica/dopo/app/overscroll/`).
- Restano come sono: avvisi di sistema in stile Android, tastiera che segue il tema del telefono, richiesta
  «dispositivi nelle vicinanze» (solo build di sviluppo, `ACCESS_LOCAL_NETWORK` del manifest debug di react-android).

## Note su Xcode 27 / Device Hub

- Xcode 27 sostituisce Simulator.app con **Device Hub**
  (`/Applications/Xcode.app/Contents/Applications/DeviceHub.app`). Si apre
  con `open -a DeviceHub`. Expo CLI (SDK 58) lo rileva, avvia i simulatori
  tramite esso e porta in primo piano il dispositivo giusto con il deep link
  `devices://`.
- **Permesso System Events richiesto.** Per attivare Device Hub Expo CLI
  usa AppleScript via System Events: l'app terminale da cui si lancia
  `expo run:ios` deve avere il permesso di automazione su System Events
  (macOS lo chiede al primo avvio; si rivede in Impostazioni di Sistema →
  Privacy e sicurezza → Automazione). Senza, il comando si blocca alla fase
  di apertura dell'app sul simulatore. Concesso al Terminale il 18/10/2026.
- Elenco e avvio manuale dei simulatori: `xcrun simctl list devices
  available`, `xcrun simctl boot "iPhone 17"`.
- Screenshot del simulatore: `xcrun simctl io booted screenshot <file.png>`.
- **Tastiera software dell'iPhone:** in Device Hub si attiva dal menu Dispositivo ›
  Tastiera (disattivando "Simulate Hardware Keyboard"; "Toggle Software Keyboard"
  è ⌥⌘K, "Keyboard Capture" ⌘K). Non esiste più `defaults write
  com.apple.iphonesimulator ConnectHardwareKeyboard` e Device Hub non si pilota
  con AppleScript. Il controllo accanto a "Capturing keyboard" blocca lo schermo
  (schermo nero sfocato): si ripristina con `xcrun simctl shutdown` e `boot`.
- Per riportare l'app al Login senza signOut globale: `xcrun simctl keychain
  booted reset` (toglie sessione e cache locale dal simulatore).
- Expo CLI punta sempre all'ultimo simulatore aperto: con più simulatori
  accesi usare `--device`.
- Requisiti SDK 58: Xcode 26.4+, Node 22.13+/24.3+/26+, iOS 16.4+ a runtime.
