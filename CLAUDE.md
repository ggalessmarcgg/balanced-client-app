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
  (verifica: `/sviluppo/titoli`, esiti in `step3-confronti/titoli/`).
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
  si scrive e il campo si allunga, lo scorrimento segue il cursore.
- **Lo scorrimento non chiude la tastiera** (`keyboardDismissMode="none"`).
- **La tastiera si chiude solo** toccando fuori dai campi
  (`keyboardShouldPersistTaps="handled"`) oppure con "Avanti", "Chiudi", "Invia" o il
  tasto Invio dove previsto. Nei moduli Invio passa al campo successivo
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
  (con la barra solo per l'abbonato; dagli stati H e K senza) e `app/notifiche.tsx`. L'eliminazione dell'account
  ha già le schermate definitive (avviso e conferma, disegno Figma invariato): oggi l'azione finale mostra la
  Notifica breve "disponibile a breve" perché nessun sistema la esegue (censimento §7); **prima della
  pubblicazione** va implementata quella vera, con la verifica della password lato server (funzione con chiave di
  servizio, opzioni nel §7), senza rifare le schermate.
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
  nessun orario) e `src/ui/appuntamenti/CardAppuntamento.tsx` (contenuto della card condiviso con Appuntamenti);
  schermate `SchermataPrenotazione` (C e D), `SchermataPrenotato` (F), `SchermataConsulenzaConfermata` (G); rotte
  `app/stato/prenotazione.tsx` e `app/stato/prenotato.tsx`. Il menu (`app/menu.tsx`) negli stati C, D, F, G ha la sola
  voce "La tua nutrizionista" oltre a "Esci".
- Regole (censimento `~/Desktop/censimenti-app/step12-censimento-stati.md`): nessuna logica di prenotazione nuova,
  nessuna scrittura diretta dell'app (scrive solo la funzione del database); orari letti all'apertura del pannello,
  dopo `slot_taken`/`day_full`/`slot_in_past` e su "Riprova", mai al cambio di scheda; elenco vuoto → variante
  "Nessun orario" con il supporto da copiare; "Modifica" in C tiene la scelta solo in memoria e **non scrive mai sul
  lead**; `p_start_time` in `HH:MM:00`; G compare solo dopo una conferma nell'app e "Torna alla home" rilegge lo
  stato; in F senza link lo stato si rilegge al ritorno in primo piano. Lettura dello stato estesa a `phone_number`,
  `appointments.end_time`, `expertise`, `registration_number`.
- **Durate (decisione del 22/10/2026, tutta l'app)**: al cliente si mostra la durata della visita, non il blocco in
  calendario: prima visita 40 minuti, visita di controllo 20 (`DURATA_VISITA_MINUTI`, `fasciaOraria` in
  `src/core/appuntamenti/appuntamenti.ts`); fascia = inizio – inizio + durata (es. 18:30 – 19:10); `end_time` serve solo
  a decidere se la visita è in corso. Gli orari si scelgono a ore intere.
- Pagina di sviluppo: `/sviluppo/stati?stato=stati-1-da-confermare|stati-2-prima|stati-3-orario-passato|stati-4-scegli|stati-4.1-non-disponibile|stati-4.2-cambia|stati-4.3-nessun-orario|stati-5-confermata|…`;
  esiti dei confronti in `~/Desktop/censimenti-app/step12-confronti/`.

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
