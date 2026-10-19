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
  interlinee o versione di React Native.
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

## Verifiche a schermo e rotte di sviluppo

- Rotte solo di sviluppo (`Stack.Protected guard={__DEV__}` in `app/_layout.tsx`,
  mai nelle versioni per i clienti): `/sviluppo/componenti?sezione=Colori|Misure|Testi|Icone`
  (pagina dei componenti, dal lotto 2 anche le sezioni dei componenti: `?sezione=Pulsante`,
  `Riga elenco`, …), `/sviluppo/confronto-testi` e `/sviluppo/confronto-icone`
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
- `apps/app/src/ui/` → componenti React Native di presentazione. Possono
  importare da `core/`.
- `apps/app/src/core/` → TypeScript puro: tipi, validazioni, macchine a
  stati, client API. **Nessun import da React, React Native, Expo o `ui/`**
  (come in `onboarding-v2`); la regola è imposta da ESLint.
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

Dentro `apps/app`:

```bash
npx expo run:ios --device "iPhone 17"   # scegliere un simulatore preciso
npx expo start --ios                     # solo Metro, riusa l'app già installata
npx expo-doctor                          # diagnosi dipendenze e config
npx expo install --fix                   # riallinea versioni alla SDK
```

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
- Expo CLI punta sempre all'ultimo simulatore aperto: con più simulatori
  accesi usare `--device`.
- Requisiti SDK 58: Xcode 26.4+, Node 22.13+/24.3+/26+, iOS 16.4+ a runtime.
