# Balanced · app clienti

App nativa Balanced per iOS e Android: Expo SDK 58, TypeScript, Expo Router.
Workspace npm con l'app in `apps/app`.

## Requisiti

- macOS con Xcode 27 (Device Hub al posto di Simulator.app)
- Node 24.3+ e npm
- CocoaPods e Watchman (`brew install cocoapods watchman`)

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

Dalla seconda volta, se non sono cambiati moduli nativi, basta il dev server:

```bash
npm run start      # poi premere i per aprire il simulatore
```

Le modifiche a `app/`, `src/ui/` e `src/core/` si vedono in tempo reale
senza ricompilare (Fast Refresh).

## Verifiche

```bash
npm run lint
npm run typecheck
```

## Struttura

```
apps/app/
  app/        rotte Expo Router (ogni file è una schermata)
  src/ui/     componenti React Native
  src/core/   TypeScript puro, senza React Native né ui/
  assets/     icone e splash
```

Le convenzioni complete sono in `CLAUDE.md`.
