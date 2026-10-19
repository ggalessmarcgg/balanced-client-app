# src/servizi

Collegamento ai servizi esterni (Supabase Auth e PostgREST, portachiavi del telefono): l'unico
posto che importa `@supabase/supabase-js` ed `expo-secure-store`. Usa la logica pura di `src/core`
(stati, errori, pezzi di sessione) e viene usato dalle rotte in `app/`. `src/core` non può importarlo
(regola ESLint); `src/ui` non ne ha bisogno: le schermate ricevono dati e callback dalle rotte.
