# Balanced · app clienti

App nativa Balanced per iOS e Android: Expo SDK 58, TypeScript, Expo Router.
Workspace npm con l'app in `apps/app`.

## Requisiti

- macOS con Xcode 27 (Device Hub al posto di Simulator.app)
- Node 24.3+ e npm
- CocoaPods e Watchman (`brew install cocoapods watchman`)
- Permesso di automazione **System Events** per il terminale (vedi sotto)

## Installazione

```bash
git clone git@github.com:ggalessmarcgg/balanced-client-app.git
cd balanced-client-app
npm install
```

## Avvio sul simulatore iOS

```bash
npm run ios
```

Il comando genera la cartella nativa `apps/app/ios/` (ignorata da git),
esegue `pod install`, compila con Xcode e apre l'app in Device Hub. Per
scegliere un simulatore preciso:

```bash
cd apps/app
npx expo run:ios --device "iPhone 17"
```

### Permesso System Events (una tantum)

Per portare in primo piano Device Hub, Expo CLI usa AppleScript tramite
System Events. Al primo `npm run ios` macOS chiede: «"Terminale" vuole
accedere e controllare "System Events"». Va concesso, altrimenti il comando
si ferma alla fase di apertura dell'app sul simulatore. Il permesso vale per
l'app da cui si lancia il comando (Terminale, iTerm, VS Code…) e si può
rivedere in Impostazioni di Sistema → Privacy e sicurezza → Automazione.

Dalla seconda volta, se non sono cambiati moduli nativi, basta il dev server:

```bash
npm run start      # Metro per la development build (expo start --dev-client)
```

`npm run start` serve la **development build** installata da `npm run ios`
(schema `balanced://`), non Expo Go: l'app contiene moduli nativi
(`expo-secure-store`, `expo-clipboard`, `expo-glass-effect`) che Expo Go non
ha. Se l'app è già aperta sul simulatore si ricollega da sola a Metro; altrimenti
si apre da Device Hub o con `xcrun simctl launch booted it.joinbalanced.app`.
Dopo aver aggiunto un modulo nativo serve di nuovo `npm run ios`.

Le modifiche a `app/`, `src/ui/`, `src/servizi/` e `src/core/` si vedono in
tempo reale senza ricompilare (Fast Refresh).

### Collegamento a Supabase

Copiare `apps/app/.env.example` in `apps/app/.env` (non versionato) e
compilare `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
con i valori della dashboard del progetto. Senza `.env` l'app si ferma
all'avvio con un errore esplicito.

## Verifiche

```bash
npm run lint
npm run typecheck
cd apps/app && npm test     # test di src/core con il test runner di Node
```

## Struttura

```
apps/app/
  app/          rotte Expo Router (ogni file è una schermata)
  src/ui/       componenti React Native e schermate
  src/servizi/  Supabase, sessione nel portachiavi, lettura dello stato
  src/core/     TypeScript puro, senza React Native, ui/ né servizi/
  assets/       icone, splash e font
```

Le convenzioni complete sono in `CLAUDE.md`.
