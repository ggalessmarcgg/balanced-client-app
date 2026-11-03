# Piano di traccia · analisi dell'uso con PostHog (modalità anonima)

Step 4, lotto 2 (3/11/2026). Decisioni di Alessandro del 2/11/2026 (censimento
`~/Desktop/censimenti-app/censimento-monitoraggio.md`, §C e §D): PostHog nella regione UE
(`https://eu.i.posthog.com`), progetto "Balanced app", piano gratuito; **modalità anonima**: un codice casuale per
installazione generato dall'SDK, nessun `identify`, nessun profilo della persona, nessun dato personale o sanitario,
nessun testo dell'utente, IP non conservato (impostazione del progetto). Niente cattura automatica dei tocchi o delle
schermate, niente Session Replay, niente sondaggi, niente feature flag. Nessun consenso nell'app (statistiche anonime
di prima parte; da confermare con il consulente). Spenta durante lo sviluppo, salvo `EXPO_PUBLIC_POSTHOG_IN_SVILUPPO=1`.

**I numeri ufficiali restano quelli del database** (diari condivisi, revisioni, consensi in `client_consents`, telefoni
in `client_devices`): PostHog serve a capire il comportamento nell'app, non a contare.

In codice: catalogo chiuso in `apps/app/src/core/analisi/eventi.ts` (`CATALOGO`, test `eventi.test.ts`), unico punto di
invio `misura(evento, proprietà)` in `apps/app/src/servizi/analisi.ts` (l'unico file che importa `posthog-react-native`).
Un evento o una proprietà fuori dal catalogo non parte: il compilatore lo rifiuta, `validaProprieta` lo rifiuta di nuovo
a runtime e `filtraEventoInUscita` (`before_send` dell'SDK) scarta tutto ciò che non è nel catalogo e toglie il nome del
telefono e qualunque proprietà di persona.

## Regole

- **Nomi stabili in italiano con i trattini bassi** (`area_azione`): non cambiano al cambiare dei testi a schermo.
- **Proprietà solo da elenchi chiusi, booleani o interi piccoli** (0–4): mai testo libero, mai identificativi di diari,
  piani, revisioni, clienti, nutrizioniste o telefoni, mai date, mai contenuti, mai messaggi d'errore (solo codici stabili).
- **Tempi e durate a fasce**: tempo di risposta `fino_a_5s`, `5_10s`, `10_20s`, `20_30s`, `30_60s`, `oltre_60s`; durata
  dell'audio `fino_a_30s`, `30s_1min`, `1_2min`, `2_3min` (`sconosciuta` se la registrazione non è partita).
- **Proprietà aggiunte dall'SDK** su ogni evento (tecniche, non personali): versione e build dell'app (`$app_version`,
  `$app_build`, `$app_namespace`), sistema e versione (`$os_name`, `$os_version`), tipo di dispositivo, produttore e modello
  (`$device_manufacturer`, `$device_model`; il nome leggibile `$device_name` viene tolto), lingua e fuso (`$locale`,
  `$timezone`), dimensioni dello schermo, `$session_id` (sessione di 30 minuti dell'SDK), `$lib`/`$lib_version`,
  `$process_person_profile = false`. Il `distinct_id` è il codice casuale dell'installazione: resta uguale dopo "Esci" e
  con un altro account sullo stesso telefono, cambia reinstallando l'app.
- **Aggiungere un evento**: prima qui (con la domanda a cui risponde), poi nel `CATALOGO`, poi la chiamata `misura`.
- **Richieste dell'SDK oltre agli eventi** (verifica del 3/11/2026 intercettando il traffico sull'emulatore): all'avvio
  una sola GET a `eu-assets.i.posthog.com/array/<chiave>/config` (configurazione pubblica del progetto; l'opzione
  `disableRemoteConfig` esiste nei tipi ma non nel codice dell'SDK 4.85.2), che non porta dati. La configurazione remota non
  può accendere nulla: sondaggi spenti da `disableSurveys`, cattura degli errori spenta perché con `errorTracking.autocapture:
  false` il gestore delle eccezioni non viene installato, Session Replay impossibile senza il plugin nativo. Nel progetto
  PostHog conviene comunque lasciare spenti "Autocapture exceptions" e le registrazioni.

## Eventi

### Ingresso

| Evento | Proprietà | Domanda di prodotto | Dove si emette |
|---|---|---|---|
| `app_aperta` | `da_sfondo` (booleano: vero al ritorno in primo piano dopo almeno 5 s di sfondo, falso all'avvio) | quante aperture al giorno per installazione; ritenzione (installazioni attive a 1, 7, 30 giorni) | `servizi/analisi.ts` (`avviaAnalisi`: all'avvio e sull'`AppState` attivo dopo lo sfondo). Sostituisce gli eventi del ciclo di vita dell'SDK, che restano spenti |
| `carosello_completato` | — | quanti arrivano in fondo al carosello del primo accesso (il carosello compare una volta per telefono) | `app/primo-accesso.tsx` (`fine`) |
| `consenso_ai` | `risposta` ∈ si, no; `dove` ∈ carosello, sostituzione, ricette, racconta, account | quanti accettano le funzioni AI e dove; quanti rifiutano o revocano. "si" = riga `granted` scritta; "no" = riga `revoked` scritta (Account) oppure "Non ora" (nessuna scrittura) | `servizi/consenso.ts` (`registraConsensoAI`, dopo la scrittura riuscita); "Non ora" in `app/primo-accesso.tsx`, `app/racconta.tsx`, `useSostituzione.ts`, `useRicette.ts` |
| `notifiche_permesso` | `esito` ∈ concesso, negato, piu_tardi; `dove` ∈ carosello, account | quanti attivano le notifiche al primo accesso; quanti rimandano; quanti le attivano poi dall'Account | `app/primo-accesso.tsx` ("Attiva le notifiche" con la risposta del sistema, "Più tardi"), `servizi/usePermessoNotifiche.ts` (Account) |

### Diario

| Evento | Proprietà | Domanda di prodotto | Dove si emette |
|---|---|---|---|
| `diario_bozza_salvata` | `blocchi_compilati` 0–4 (pasti, valori, sport, commento) | quante bozze restano bozze (confronto con `diario_condiviso`); quanto si compila prima di fermarsi | `servizi/giornate.ts` (`salvaBozzaInAttesa`, solo quando la riga è davvero in bozza sul server) |
| `diario_condiviso` | `modo` ∈ scritto, vocale; `blocchi_compilati` 0–4 | **metrica principale**: diari condivisi per installazione per settimana; quota del diario vocale; completezza dei diari | `servizi/condivisione.ts` (`condividiOggi`, esito `ok`; "scritto" dalla Card diario di Oggi, "vocale" dal riepilogo di Racconta) |
| `diario_vocale_avviato` | — | quanti provano il diario vocale (registrazione partita) | `servizi/racconta.ts` (evento `avviataRegistrazione`) |
| `diario_vocale_completato` | `durata_audio` (fascia) | quanti arrivano al diario creato dal racconto; quanto durano i racconti | `servizi/racconta.ts` (evento `compilato`) |
| `diario_vocale_fallito` | `passo` ∈ registrazione, trascrizione, compilazione; `esito` ∈ rete, riprovabile, sessione, non_disponibile, consenso_mancante, definitivo, non_capito; `durata_audio` | dove si rompe la catena vocale e perché (imbuto avviato → completato); quanti "Non ho capito" | `servizi/racconta.ts` (eventi `registrazioneNonRiuscita`, `trascrizioneFallita` al primo tentativo — i nuovi tentativi silenziosi senza rete non contano —, `trascritta` con testo vuoto, `nonCapito`, `compilazioneFallita`) |

### Piano

| Evento | Proprietà | Domanda di prodotto | Dove si emette |
|---|---|---|---|
| `piano_aperto` | `tipo` ∈ fisso, variabile, nessuno ("Piano in elaborazione") | quanti guardano il piano e quanto spesso; quanti lo aprono prima che esista | `app/(abbonato)/piano.tsx` (una volta per apertura della scheda, appena il piano è noto) |
| `sostituzione_chiesta` | `esito` ∈ alternative, nessuna_alternativa, non_riconosciuto, errore; `tempo` (fascia); `in_casa` (booleano: il cliente aveva scritto qualcosa) | funziona la sostituzione? quanto spesso non trova nulla? quanto aspetta il cliente? serve il campo "in casa"? | `servizi/sostituzione.ts` (`trovaAlternative`, a risposta ricevuta) |
| `ricette_idee` | `esito` ∈ idee, nessuna_idea, errore; `tempo` (fascia) | quanti chiedono idee; quante richieste finiscono senza idee o in errore; tempi | `servizi/ricette.ts` (`trovaIdee`) |
| `ricetta_aperta` | `origine` ∈ nuova (appena preparata), salvata (da "Le tue ricette") | imbuto idee → ricetta vista; le ricette salvate vengono riaperte? | `app/ricetta.tsx`, `app/ricette/[id].tsx` |
| `ricetta_salvata` | — | quante ricette vengono salvate rispetto a quelle viste | `app/ricetta.tsx` ("Salva ricetta" riuscito) |

### Revisioni

| Evento | Proprietà | Domanda di prodotto | Dove si emette |
|---|---|---|---|
| `revisione_aperta` | — | le revisioni vengono aperte? (confronto con le righe `sent` del database) | `servizi/useLetturaRevisione.ts` (dopo `segnaAperta`) |
| `revisione_letta` | — | quante aperture arrivano in fondo ("Hai letto tutta la revisione.") | `servizi/useLetturaRevisione.ts` (`onFondoRaggiunto`, una volta per apertura) |

### Notifiche

| Evento | Proprietà | Domanda di prodotto | Dove si emette |
|---|---|---|---|
| `notifica_aperta` | `tipo` ∈ nutritionist_comment, review_sent, review_unlocked, holiday_replacement, plan_sent, diary_reminder, measurement_update, weight_update, altro; `origine` ∈ sistema (banner, tendina, app chiusa), campanella (elenco nell'app) | tasso di apertura per tipo (confronto con `push_delivery_events`); i promemoria portano a un diario condiviso nella stessa sessione? | `servizi/aperturaNotifiche.ts` (tocco di sistema), `servizi/useNotifiche.ts` (riga della campanella) |

### Errori e tempi

| Evento | Proprietà | Domanda di prodotto | Dove si emette |
|---|---|---|---|
| `errore_chiamata` | `funzione` ∈ avvio, diario_salva, diario_condividi, piano, trascrivi, compila, alternative, idee, ricetta; `codice` (elenco chiuso: `rete`, `tempo_scaduto`, `risposta_non_valida`, `sessione_assente`, i codici stabili del server degli agenti, `http_4xx`, `http_5xx`, `altro`) | quanto pesa la rete nei fallimenti; quali funzioni del server falliscono e con quale codice (il dettaglio è in Sentry e nei registri del server) | `servizi/analisi.ts` (`registraChiamata`) dalle chiamate al server degli agenti in `racconta.ts`, `sostituzione.ts`, `ricette.ts`; funzione del piano in `piano.ts`; scritture del diario in `giornate.ts` e `condivisione.ts`; lettura di avvio in `app/index.tsx` |
| `attesa_lunga` | `funzione` (come sopra); `secondi` (fascia, da `10_20s` in su) | quanti vedono "Ancora qualche secondo…"; quali funzioni superano i 10 s e di quanto | `servizi/analisi.ts` (`registraChiamata`: ogni chiamata, riuscita o no, oltre i 10 s) |
| `prova_analisi` | — | nessuna: serve solo a verificare che gli eventi arrivino (pagina `/sviluppo/monitoraggio`, in sviluppo o con `EXPO_PUBLIC_PAGINA_MONITORAGGIO=1`) | `app/sviluppo/monitoraggio.tsx` |

## Cosa non si misura (per scelta)

- Schermate viste (`$screen`), tocchi, durata per schermata: richiederebbero la cattura automatica o il nome della rotta a
  ogni cambio; rimandati finché non serve una domanda precisa.
- Accesso (esiti del login, recupero password): la schermata è prima dell'app; si misurerà con un evento dedicato se serve.
- Stato del cliente (A–L), prenotazioni, Account (promemoria, eliminazione), menu, peso e misure: rimandati.
- Qualunque cosa richieda un identificativo della persona (percorsi del singolo cliente tra funnel e app, §C3 del censimento).

## Verifica

- Test: `npm test` in `apps/app` (`src/core/analisi/eventi.test.ts`: nomi stabili, nessun testo libero, nessun
  identificativo, filtro in uscita, fasce, disattivazione in sviluppo).
- Sul telefono o sull'emulatore con `EXPO_PUBLIC_POSTHOG_IN_SVILUPPO=1` nel `.env`: la pagina `/sviluppo/monitoraggio`
  mostra "analisi (PostHog): attiva", il codice anonimo dell'installazione e il pulsante dell'evento di prova; su PostHog
  (Activity, filtro per `distinct_id`) si vedono gli eventi con le sole proprietà del catalogo più quelle tecniche dell'SDK.
