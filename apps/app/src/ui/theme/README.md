# src/ui/theme

Token del design system, letti da Figma (file `gEx2IMz69sIuUnOYkLBjcf`).

- `figma-tokens.json` → fotografia in sola lettura di variabili (modalità Chiaro),
  stili di testo/colore/effetto "App/…" e componenti icona. Non si modifica a mano.
- `tokens.generated.ts` → token tipizzati generati da `scripts/tokens/genera-token.mjs`
  (`npm run tokens`). Non si modifica a mano.
- `font.ts`, `index.ts` → caricamento dei font e punto d'ingresso (`import { colori, spazio, testi } from '@/ui/theme'`).

Come si rigenera quando Figma cambia: vedi `CLAUDE.md`, sezione "Token del design system".
