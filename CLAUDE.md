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
