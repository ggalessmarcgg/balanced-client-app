# src/core

Logica in TypeScript puro: tipi, validazioni, macchine a stati, client API.

**Regola:** nessun import da `react`, `react-native`, `expo*` o da `src/ui/`.
Tutto ciò che sta qui deve poter girare anche fuori da React Native (test
in Node, condivisione con altri progetti). La regola è verificata da ESLint
(`no-restricted-imports` in `eslint.config.js`).
