# Nomi stabili del diario, delle revisioni e del menu (schermate e azioni)

Decisione del 19/10/2026 (step 5, lotto 1), estesa il 20/10/2026 con il lotto 2 (settimana, pannello della
giornata e commenti), il 21/10/2026 con il lotto 3 (storico delle giornate), il lotto 4 (andamento della
settimana e durate dello sport) e lo step 7 (revisioni). Nomi da usare in futuro per gli eventi di misurazione: non
cambiano al cambiare dei testi a schermo. In codice: `apps/app/src/core/diario/nomi.ts` (`SCHERMATE_DIARIO`,
`AZIONI_DIARIO`), `apps/app/src/core/revisioni/nomi.ts` (`SCHERMATE_REVISIONI`, `AZIONI_REVISIONI`) e
`apps/app/src/core/menu/nomi.ts` (`SCHERMATE_MENU`, `AZIONI_MENU`, step 11).

## Schermate

| Nome | Figma | Cosa mostra |
|---|---|---|
| `oggi` | Oggi · 1, 6, 7 (`444:1103`, `446:3703`, `446:3777`) | pagina Oggi con la Card diario chiusa (da iniziare o in bozza) o condivisa e la Card settimana |
| `diario · pasti` | Oggi · 2 (`444:1539`) | passaggio 1: colazione, pranzo, cena, spuntini |
| `diario · valori` | Oggi · 3 (`444:2624`) | passaggio 2: energia, sazietà, idratazione |
| `diario · sport` | Oggi · 4 (`444:2962`) | passaggio 3: sport e durata (o riposo). Durate salvate nel formato storico `<30m`, `30m-1h`, `1h-1.5h`, `>1.5h` (etichette "Meno di 30 min", "30 min – 1 ora", "1 – 1,5 ore", "Più di 1,5 ore"; decisione del 21/10/2026); `<20m` dei diari della web app si legge ("Meno di 20 min") ma non si propone più |
| `diario · commento` | Oggi · 5 (`444:3247`) | passaggio 4: nota e "Invia alla nutrizionista" |
| `giornata · pannello` | Giornate · 2, 3, 4 (`474:1430`, `475:1337`, `475:1409`) | pannello dal basso di una giornata condivisa: data, Card commento (se c'è), "La tua giornata" con "Modifica"; si porta a schermo pieno con la maniglia. Rotta diretta: `/abbonato?giornata=YYYY-MM-DD` (per la push del commento, step 6) |
| `giornata · modifica` | Giornate · 5 (`475:1459`) | i quattro passaggi del diario dentro il pannello, a schermo pieno, per una giornata già condivisa (senza "Invia alla nutrizionista") |
| `storico` | Giornate · 6 (`475:1917`) | "Le tue condivisioni": i mesi dal primo diario al mese corrente, card con effetto vetro, una riga per settimana con i giorni allineati a sinistra, nessun indicatore di commento. Rotta `/storico` |
| `andamento` | Andamento · 1 (`479:1908`), Card andamento (`479:334`) | sulla pagina Oggi, sotto la Card settimana: tre card con il grafico a colonne della settimana in corso (lunedì–domenica, ora italiana), `andamento · energia`, `andamento · idratazione`, `andamento · sport`. Quattro gradini (30/60/90/120): energia e idratazione 1–4; sport `<20m` e `<30m` sul primo, poi `30m-1h`, `1h-1.5h`, `>1.5h`. Giorno passato non condiviso = trattino tratteggiato; riposo (sport) = trattino pieno; oggi non condiviso con un valore nella bozza = colonna tratteggiata alta quanto il valore; giorni futuri vuoti. Nessuna lettura in più, nessuna frase di sintesi, nessun selettore di periodo |
| `andamento · pochi dati` | Andamento · 2 (`479:2100`) | le tre card con "Registra un valore dal diario per vedere il tuo andamento": solo quando nella settimana non c'è alcun valore in nessuna categoria (basta un valore, anche solo nella bozza di oggi, perché compaiano i tre grafici; una categoria senza valori resta con le sole etichette e linee guida) |

## Azioni

| Nome | Dove | Effetto sui dati |
|---|---|---|
| `diario · scrivi` | pulsante tondo "Scrivi" | apre il passaggio Pasti; nessuna scrittura |
| `diario · racconta` | pulsante tondo "Racconta" | apre "Racconta la tua giornata" (step 10, nomi `racconta · …` qui sotto); nessuna scrittura |
| `diario · avanti` | link "Avanti" o scorrimento verso sinistra | passa al blocco successivo e salva la bozza se ci sono modifiche |
| `diario · indietro` | scorrimento verso destra | torna al blocco precedente e salva la bozza se ci sono modifiche |
| `diario · vai al blocco` | tocco su una tacchetta dell'indicatore | va a quel blocco (avanti o indietro) e salva la bozza se ci sono modifiche |
| `diario · chiudi` | link "Chiudi" | chiude la card e salva la bozza se ci sono modifiche |
| `diario · salva bozza` | automatico: chiusura/cambio di blocco, uscita dalla pagina, app in secondo piano, ritorno della rete; all'apertura di Oggi anche le bozze di giorni passati rimaste in attesa | inserimento (prima volta, solo con contenuto) o modifica dei soli campi, senza `status`; finché il server non conferma la bozza resta nella copia di sicurezza (cartella documenti) |
| `diario · condividi` | "Invia alla nutrizionista" | una sola modifica con `status = submitted` e `submitted_at` (o inserimento già condiviso) |
| `diario · riprova salvataggio` | "Riprova" nella Notifica breve di errore | ripete il salvataggio in attesa |
| `settimana · apri storico` | icona Calendario della Card settimana | apre `storico`; nessuna scrittura |
| `storico · giorno` | tocco su un giorno condiviso dello storico (anche oggi, se già condiviso) | apre `giornata · pannello` (riassunto, commento, letto all'apertura, "Modifica"); i giorni non condivisi non aprono nulla. Lettura: la riga completa per data (con commento e "letto") solo se non è già nota, poi in memoria |
| `storico · indietro` | icona Indietro dell'intestazione | torna a Oggi |
| `settimana · giorno` | tocco su un giorno condiviso della Card settimana (anche oggi, se già condiviso) | apre `giornata · pannello`; i giorni non condivisi non aprono nulla. Lettura: la giornata completa per `id` solo se non è già in cache (o se `updated_at` della settimana è cambiato) |
| `commento · letto` | automatico: apertura del pannello con un commento da leggere | una sola modifica `comment_acknowledged = true` su quella riga; la cache passa subito a letto (pallino verde); se la scrittura fallisce si riprova in silenzio alla prossima apertura |
| `giornata · schermo pieno` | maniglia del pannello trascinata verso l'alto | nessuna scrittura |
| `giornata · chiudi` | velo, maniglia verso il basso o chiusura di sistema | chiude il pannello e salva le modifiche in attesa |
| `giornata · modifica` | "Modifica" accanto a "La tua giornata" | apre `giornata · modifica` dal passaggio Pasti; nessuna scrittura |
| `giornata · salva modifica` | automatico: cambio di blocco, "Chiudi" della modifica, chiusura del pannello, uscita dalla pagina, app in secondo piano, ritorno della rete | una modifica dei soli dieci campi del cliente su quella riga, filtrata su `status = submitted`; mai `status`, `submitted_at`, `submission_date`, `submission_number` né le colonne della nutrizionista; nessun avviso alla nutrizionista |
| `giornata · fine modifica` | "Chiudi" nella modifica | torna al riassunto del pannello e salva se ci sono modifiche |

## Letture della settimana (lotto 2 e 4)

- All'apertura della pagina Oggi e a ogni ritorno in primo piano: una lettura di `daily_submissions` per `client_id`
  sulla sola settimana corrente, lunedì–domenica in ora italiana (colonne: `id, submission_date, status, updated_at,
  energy_level, satiety_level, hydration_level, sport_type, sport_duration, nutritionist_comment, comment_author_id,
  comment_acknowledged`). Nessuna rilettura dopo un salvataggio.
- Valutazione della nutrizionista (`review_status`, scritta dal CRM: `positive` approvata, `needs_review` da rivedere,
  null in attesa): letta nelle stesse letture della settimana e dei mesi dello storico, nessuna lettura in più; i giorni
  condivisi prendono il colore della valutazione (verde, senape, bianco) e il pallino del commento si combina come
  prima; oggi resta con le varianti "Oggi". Si aggiorna con la rilettura all'apertura e al ritorno in primo piano.
- Storico (lotto 3): all'apertura una lettura minima del primo diario del cliente (`submission_date`, ordinata, un
  solo risultato, per `client_id`), poi in memoria e nella cache del diario su file (dal 21/10/2026 nella cartella
  cache della sandbox, non più nel portachiavi; i file dei giorni passati si cancellano quando si scrive quello di
  oggi, mentre le copie in attesa di bozze e modifiche stanno in un file a parte nella cartella documenti e restano
  finché il server non conferma); una lettura per mese
  (`submission_date, status` per `client_id` e intervallo del mese) solo quando il mese entra, o sta per entrare, nello
  schermo, tenuta in memoria per la sessione; il mese corrente riusa la settimana già in memoria e legge solo la parte
  del mese che la precede (nulla se la settimana corrente comincia nel mese). Nessuna scrittura oltre a "letto" e
  modifica del pannello.
- Andamento (lotto 4): nessuna lettura nuova. I valori vengono dalla stessa lettura della settimana (`energy_level`,
  `hydration_level`, `sport_type`, `sport_duration`, già tra le colonne) e, per oggi, dalla bozza in corso in memoria
  (anche non ancora salvata); oggi condiviso prende i valori dalla riga della settimana, aggiornata dalle modifiche del
  pannello. Durate dello sport non riconosciute (né le quattro attuali né `<20m`): nessuna colonna, nessuna traduzione.
- Autore del commento: una lettura di `nutritionist_profiles` (`id, full_name, title, app_square_photo_url`) per
  `comment_author_id`, tenuta in memoria per la sessione e nel portachiavi per 30 giorni; se il profilo non è leggibile
  (inattivo) si mostra la nutrizionista del cliente; senza foto, le iniziali.

## Revisioni (step 7)

### Schermate

| Nome | Figma | Cosa mostra |
|---|---|---|
| `revisioni` | Revisioni · 1, 2, 3, 5 (`494:1944`, `494:2060`, `494:2165`, `494:2528`), Card revisione (`496:2350`) | la sezione: card attive in un contenitore con spazio 12 (avanzamento "Inizia" 0 su 7 o "Da sbloccare" n su 7, poi "In elaborazione" 7 su 7, poi le "Nuove" dalla più vecchia alla più recente per `sent_at`), quindi l'elenco delle passate (`opened` e `read`, per `sent_at` decrescente) con "Revisione N · giorno mese" e l'inizio del testo. "Inizia" è una riga virtuale (numero = massimo + 1) che l'app non crea mai; solo la revisione 1 ha il testo che spiega cos'è una revisione. Rotta `/revisioni` |
| `revisione · lettura` | Revisioni · 4 (`494:2487`) | intestazione "Revisione N", autrice ("<title> <full_name>" da `review_author_id`, ripiego sulla nutrizionista assegnata; foto dalla memoria su disco, iniziali durante il caricamento), data di invio in ora italiana, sezioni "Generale", "Correlazione", "Spunti e consigli" (le vuote nascoste; righe con `- `, `* `, `• ` come elenco puntato; `**` tolto), piè di pagina "Hai letto tutta la revisione.". Rotta diretta `/revisione/<id>` (per la notifica di invio, step 6; fuori dalle schede, senza barra): se la revisione non è più `sent` si apre comunque; se non esiste o non è inviata si torna a `/revisioni` |

### Azioni

| Nome | Dove | Effetto sui dati |
|---|---|---|
| `revisioni · apri` | riga dell'elenco delle passate | apre `revisione · lettura`; nessuna scrittura |
| `revisioni · leggi la revisione` | "Leggi la revisione" nella card Nuova | apre `revisione · lettura` |
| `revisione · aperta` | automatico: apertura della lettura | una sola modifica `status = 'opened'`, `opened_at = adesso`, filtrata su `status = 'sent'` (0 righe = già aperta altrove, nulla da riscrivere); la cache passa subito ad aperta (la card Nuova sparisce, la revisione va nell'elenco e il pallino sulla barra si spegne); se la scrittura fallisce resta in attesa e si riprova in silenzio |
| `revisione · letta` | automatico: il piè di pagina "Hai letto tutta la revisione." è entrato nello schermo (nessun tempo minimo, decisione del 21/10/2026; una volta per apertura) | una sola modifica `status = 'read'`, `read_at = adesso`, filtrata su `status in ('opened', 'sent')`; stessa cache e stesso ritentativo. Nessun pulsante "Ho capito!" |
| `revisione · indietro` | icona Indietro dell'intestazione | torna alla sezione; nessuna scrittura |
| `esci` | "Esci" nell'Account e nelle schermate di stato | prima invia le modifiche in attesa (bozza, giornate, "letto", aperture e letture delle revisioni); se ne restano chiede conferma ("Hai modifiche non ancora salvate"); con "Esci comunque" (o senza nulla in attesa) signOut globale e cancellazione di memoria, portachiavi dello stato e file locali |

### Letture

- All'apertura della sezione e a ogni ritorno in primo piano: una lettura leggera di `client_reviews` per `user_id`
  (`id, review_number, status, submissions_count, review_author_id, sent_at, opened_at, read_at`, senza testo) e una
  seconda lettura con `review_text` solo per le revisioni `sent`, `opened`, `read` il cui testo non è già in memoria
  (il testo non cambia dopo l'invio). Mai il testo di `unlocked` o `draft`. Memoria di sessione e copia locale su
  file nella sandbox dell'app (`balanced.revisioni.<clientId>.json` nella cartella cache, `src/servizi/archivioFile.ts`;
  non nel portachiavi, riservato a sessione e piccoli dati); aperture e letture non ancora confermate in
  `balanced.revisioni-attesa.<clientId>.json` nella cartella documenti, che il sistema non svuota. Tutto cancellato all'uscita.
- All'avvio dell'app dell'abbonato (pagina Oggi), a ogni ritorno in primo piano e dopo la condivisione di un diario:
  solo la lettura leggera dello stato, per il pallino rosso sulla voce Revisioni (almeno una `sent`).
- Rotta diretta a freddo: lettura leggera dello stato più il testo della sola revisione richiesta.
- Autrice: `nutritionist_profiles` per `review_author_id` dalla stessa memoria dei profili dei commenti (30 giorni nel
  portachiavi); numero di diari mostrato = `submissions_count` della revisione.

## Menu (step 11, lotto 1)

### Schermate

| Nome | Figma | Cosa mostra |
|---|---|---|
| `menu` | Menu · 1 (`508:2614`) | menu a tutta pagina dall'icona Menu della barra superiore: righe "La tua nutrizionista", "Appuntamenti" (poi "Peso e misure" e "Contenuti" dal lotto 2; "Le tue ricette" solo quando esisterà), in fondo "Esci" e "Versione x.y.z" (dalla configurazione dell'app). Rotta `/menu` |
| `menu · la tua nutrizionista` | Menu · 3 prenotato (`514:2530`), abbonato (`515:2957`), 3.1 in ferie (`596:5846`) | foto, nome con titolo, specializzazione (`expertise`), numero di albo con la nota; "Contatto diretto" con il numero WhatsApp e "Scrivi alla nutrizionista" solo con il percorso attivo (stato J), altrimenti numero oscurato e "Disponibile con il percorso attivo"; "Chi sono", "Competenze" (pillole), "Certificazioni", "Orari di lavoro" (giorni presenti in `working_hours`) con la nota; le sezioni vuote si nascondono. In ferie: profilo attenuato, frase "La Dott.ssa X è assente dal gg.mm al gg.mm.", card "Sostituzione" con la sostituta (o l'avviso che sarà assegnata). Rotta `/nutrizionista`, anche dalla card degli stati H e K |
| `menu · peso e misure` | Menu · 6 grafici (`525:2846`), 6.1 tabelle (`525:2930`) | card BMI (solo con `clients.height` e almeno un peso: valore, nota, scala 19 · 25 · 29 · 39 con la barra), card Peso con grafico a linea (primo e ultimo valore e date) o tabella dalla più recente, card Circonferenze con il radar prima/ultima misurazione (solo con due o più misurazioni) o tabella (ultima in grassetto, prima al 60 %); senza dati un solo avviso. Nessun inserimento. Rotta `/peso-misure` |
| `menu · contenuti` | Menu · 5 (`520:2883`) | griglia della libreria a gruppi di quattro (larga, alta, due impilate) con titolo, categoria e icona della categoria. Rotta `/contenuti` |
| `menu · contenuto` | Menu · 5.1 (`520:3086`) | lettura: titolo, "Tempo di lettura: N minuti", paragrafi con i titoletti in grassetto. Rotta `/contenuti/<id>` |
| `menu · appuntamenti` | Menu · 4 (`517:2616`), 4.1 visita oggi (`517:2680`), 4.2 nessuna visita (`517:2741`) | "Prossimo appuntamento": giorno ("Oggi" se è oggi in ora italiana), fascia oraria, tipo (prima visita da `appointments` o `control_visits.is_initial`, altrimenti visita di controllo), "Videochiamata, N minuti" dalla durata reale, nutrizionista, "Entra" (disabilitato "Link in arrivo" finché `meeting_url` manca), "Gestisci appuntamento"; senza visite "Nessuna visita in programma al momento." e "Prenota una consulenza" disabilitato (step 12). "Appuntamenti passati": `completed`, `no_show` e `scheduled` già finite, dalla più recente, al massimo 12; le cancellate non compaiono. Rotta `/appuntamenti` |

### Azioni

| Nome | Dove | Effetto sui dati |
|---|---|---|
| `menu · apri` / `menu · chiudi` | icona Menu della barra superiore / X del menu | nessuna scrittura |
| `menu · voce` | riga del menu | apre la schermata della voce |
| `nutrizionista · scrivi` | "Scrivi alla nutrizionista" | apre WhatsApp (`wa.me/<numero>?text=Salve Dott.ssa`), come la web app; nessuna scrittura |
| `nutrizionista · scrivi alla sostituta` | "Scrivi alla Dott.ssa X" nella card Sostituzione | come sopra, con il numero della sostituta |
| `appuntamenti · entra` | "Entra" | apre `meeting_url` (Meet) con il tocco; nessuna finestra oraria |
| `appuntamenti · gestisci` | "Gestisci appuntamento" | copia il numero WhatsApp del supporto negli appunti con la Notifica breve (nessun reindirizzamento, come negli stati) |
| `peso e misure · vista grafico` / `vista tabella` | Selettore vista delle card Peso e Circonferenze | nessuna scrittura |
| `contenuti · apri` | card della griglia | apre la lettura del contenuto; nessuna richiesta |

### Letture (nessuna scrittura)

- La tua nutrizionista: all'apertura due richieste in parallelo, `clients` per `user_id` con il profilo incorporato
  (`nutritionist_profiles!clients_nutritionist_id_fkey`: `id, title, full_name, expertise, registration_number,
  app_photo_url, app_square_photo_url, who_are_you, competences, certifications, working_hours, phone`; mai
  `profile_image_url` né `email`) e `holiday_replacements` per `client_id` con le ferie incorporate (`!inner`, filtrate
  su oggi in ora italiana come `is_active_replacement_for_client`) e la sostituta (`id, title, full_name,
  app_square_photo_url, phone`). Copia su file nella cache per un giorno (e per la data italiana delle ferie): nello
  stesso giorno la schermata si riapre senza rete; al ritorno in primo piano si rilegge solo se la copia è scaduta.
- Appuntamenti: all'apertura e a ogni ritorno in primo piano una richiesta su `clients` per `user_id` con
  `appointments` (`id, appointment_date, start_time, end_time, status, meeting_url`) e `control_visits` (`id,
  scheduled_date, start_time, end_time, status, is_initial, meeting_url`, dalla più recente, al massimo 24)
  incorporate; prossimo e passati si calcolano nell'app in ora italiana. Copia su file nella cache per ripartire
  senza rete.
- Peso e misure (lotto 2): all'apertura e a ogni ritorno in primo piano una richiesta su `clients` per `user_id`
  con `height`, `weight_logs` (`log_date, weight`, dai più recenti, al massimo 60) e `measurements`
  (`measurement_date, waist, hips, abdomen, arm, wrist, thigh`, dalle più recenti, al massimo 24) incorporate
  (indici `idx_weight_logs_client_date`, `idx_measurements_client_date`); BMI calcolato nell'app. Copia su file
  nella cache per ripartire senza rete.
- Contenuti (lotto 2): una lettura di `library_contents` (`id, order_index, step_name, category, reading_time,
  content_body`, 16 righe, 41 kB) tenuta in memoria e su file per un giorno; la lettura di un contenuto non fa
  richieste.

## Account e Notifiche (step 11, lotto 3)

### Schermate

| Nome | Figma | Cosa mostra |
|---|---|---|
| `account` | Account · 1 (`499:2145`) | iniziali, nome ed email (`clients.full_name`, `clients.email`); "Giornate condivise" (`clients.total_submissions`, contatore del trigger: può differire di poco dai diari visibili) e "Revisioni ricevute" (revisioni `sent`, `opened`, `read` già in memoria); Card nutrizionista; Notifiche (interruttori "Promemoria del diario" e "Anche nel weekend", il secondo disabilitato con il primo spento); Abbonamento (Piano · Stato · Prossimo rinnovo dalla edge function `get-client-subscription`, altrimenti solo "Stato · Attivo" e "Per informazioni sul tuo abbonamento contatta il supporto."); Supporto (email e numero, copia); Privacy e dati (Informativa privacy, Termini del servizio, Elimina account); "Esci" e la versione. Scheda della barra per l'abbonato (rotta `/account`); dagli stati H e K la stessa schermata senza barra, con la X |
| `account · elimina · avviso` | Account · 3 (`499:2568`) | Pannello dal basso "Vuoi eliminare il tuo account?" con il Messaggio info ("non interrompe l'abbonamento"), "Indietro" e "Continua" |
| `account · elimina · conferma` | Account · 4 (`499:2709`) | "Conferma con la tua password", Campo password, "Indietro" ed "Elimina definitivamente". Nessun sistema esegue l'eliminazione: l'azione finale chiude il pannello e mostra la Notifica breve "L'eliminazione dell'account sarà disponibile a breve. Nel frattempo puoi chiederla al supporto." |
| `notifiche` | Menu · 2 (`508:2699`) | dalla campanella: "Ultimi 7 giorni" e le righe Notifica (titolo, testo, ora "Oggi, 09:12" / "Ieri, 18:40" / "Lun, 11:02" in ora italiana), dalla più recente. Testi composti dall'app per tipo: `nutritionist_comment` "Nuovo commento sul tuo diario · <Nome> ha commentato la tua giornata di <giorno>."; `review_sent` "La tua revisione è pronta · Revisione N: scopri cosa è andato bene questa settimana."; `review_unlocked` "Revisione sbloccata · Hai condiviso N diari: <Nome> sta preparando la revisione."; `holiday_replacement` "Sostituzione per ferie · Fino al <g mese> ti segue la <sostituta>."; `food_suggestion_approved` "Suggerimento approvato" + corpo; `goal_comment` "Nuovo commento sul tuo obiettivo" + corpo; altri tipi `title`/`body` salvati. I promemoria (`diary_reminder`, `weight_update`, `measurement_update`) non compaiono. Rotta `/notifiche`. Pallino sulla campanella quando c'è almeno una riga dell'elenco non vista |

### Azioni

| Nome | Dove | Effetto sui dati |
|---|---|---|
| `account · promemoria del diario` / `account · promemoria nel weekend` | interruttori della card Notifiche | una modifica su `clients` per `id` con le sole colonne `diary_reminder_enabled` e/o `diary_reminder_weekend_enabled` (spegnere il diario spegne anche il weekend); in memoria subito, ripristino e Notifica breve se la scrittura fallisce |
| `account · informativa privacy` / `account · termini del servizio` | righe di Privacy e dati | aprono `https://www.joinbalanced.it/privacy-policy` e `/termini-e-condizioni` nel browser interno all'app (`expo-web-browser`, foglio con "Chiudi"); nessuna scrittura |
| `account · elimina account` | riga "Elimina account" | solo il percorso di interfaccia (avviso → conferma → Notifica breve); nessuna scrittura |
| `notifiche · apri` | campanella | apre l'elenco; all'apertura una modifica `viewed_at = now()` su `client_notifications` dove `user_id = auth.uid()` e `viewed_at is null` (come la web app) |
| `notifiche · tocca` | riga con destinazione | `clicked_at = now()` su quella riga (per `id`); apre il pannello della giornata (`/abbonato?giornata=`, con una lettura di `daily_submissions` per `id` se la data non è in memoria), la lettura della revisione (`/revisione/<id>`), Revisioni o La tua nutrizionista |

### Letture

- Account: nessuna lettura in più oltre allo stato (le cinque colonne dell'Account sono nella stessa riga `clients`
  letta all'avvio) e una chiamata alla edge function `get-client-subscription` (sessione dell'utente, Stripe lato
  server) al massimo una volta l'ora, solo se `stripe_customer_id` è valorizzato; "Revisioni ricevute" dalle righe
  delle revisioni già in memoria (lettura leggera dello stato se mancano).
- Notifiche: `client_notifications` (`id, notification_type, reference_id, reference_table, title, body, viewed_at,
  clicked_at, created_at`) dove `user_id = auth.uid()`, `created_at >= now − 7 giorni`,
  `notification_type not in (diary_reminder, weight_update, measurement_update)`, dalla più recente, al massimo 50
  (indice `idx_client_notifications_user_viewed`); all'avvio dell'app dell'abbonato, al rientro in primo piano e
  all'apertura dell'elenco. Copia su file nella cache per ripartire senza rete; tutto si cancella all'uscita.

## Stati prima dell'abbonamento (step 12)

Decisione del 21/10/2026 (censimento `~/Desktop/censimenti-app/step12-censimento-stati.md`). In codice:
`apps/app/src/core/prenotazione/nomi.ts` (`SCHERMATE_PRENOTAZIONE`, `AZIONI_PRENOTAZIONE`).

### Schermate

| Nome | Figma | Cosa mostra |
|---|---|---|
| `consulenza · da confermare` | Stati · 1 (`550:3636`) | stato C: "Ciao Giulia, ci siamo quasi!", card "I tuoi dati" (`clients.full_name`, `email`, `phone_number`), "La tua Nutrizionista" (foto quadrata, nome con titolo, `expertise`, "N. Ordine" = `registration_number`), "La tua consulenza" (giorno per esteso, fascia inizio – inizio + 40 minuti, Prima visita, Videochiamata 40 minuti, link in App, gratuita); "Conferma la consulenza" e "Modifica". Rotta `/stato/prenotazione` |
| `consulenza · orario passato` | Stati · 3 (`550:3754`) | stato D: stessa pagina con giorno e ora barrati al 40 % e "Questo orario è passato: scegline uno nuovo."; "Scegli un nuovo orario". Lead senza orario: card senza "Quando" e frase "Non hai ancora un orario…" |
| `consulenza · scelta orario` | Stati · 4 (`556:3756`), 4.1 (`556:3897`), 4.2 (`556:4038`); componente `555:422` | Pannello dal basso "Scegli un nuovo orario" (avviso "orario passato" o "non più disponibile") oppure "Cambia orario" (senza avviso): due schede da 5 giorni feriali, colonne con le ore a pillola e "N/A", nota dei 14 giorni, "Conferma orario" e "Annulla". I giorni vengono dalle date restituite dalla funzione degli orari |
| `consulenza · nessun orario` | Stati · 4.3 (`738:7520`), variante `738:7440` | pannello "Nessun orario disponibile" con l'avviso, email e numero del supporto da copiare, "Chiudi". Elenco degli orari vuoto (ferie lunghe, fasce assenti, nutrizionista non assegnata) |
| `consulenza · confermata` | Stati · 5 (`550:3890`) | stato G, solo dopo una conferma fatta nell'app: icona Conferma, "Prenotazione della consulenza confermata!", card "I prossimi passi:", "Torna alla home" (→ F con rilettura dello stato). Rotta `/stato/prenotato` |
| `consulenza · prima della consulenza` | Stati · 2 (`550:3694`) | stato F: "Ciao Giulia, manca poco alla consulenza!", card dell'appuntamento riusata da Appuntamenti ("Entra" o "Link in arrivo", "Gestisci appuntamento" che copia il supporto) e Card nutrizionista → `/nutrizionista`. Senza visita futura: "Nessuna visita in programma al momento." e "Gestisci appuntamento". Rotta `/stato/prenotato` |

### Azioni

| Nome | Dove | Effetto sui dati |
|---|---|---|
| `consulenza · conferma` | "Conferma la consulenza" (C, e D dopo la scelta di un nuovo orario) | una chiamata a `confirm_initial_appointment` con `p_client_id` e, se c'è un orario scelto nel pannello, `p_date` e `p_start_time` (`HH:MM:00`); la funzione scrive una riga in `appointments` e `clients.status = booked`. Esiti: `confirmed` → `consulenza · confermata` e in sottofondo `send-appointment-confirmation-v2` + `send-booking-notification-v2` (body `{ appointmentId }`, una sola volta); `already_confirmed`, `invalid_status` → rilettura dello stato; `slot_taken`, `day_full` → pannello "non più disponibile" con scelta azzerata e orari riletti; `slot_in_past`, `no_desired_slot` → pannello "orario passato" con orari riletti; altro → Notifica breve di errore con "Riprova" |
| `consulenza · modifica orario` | "Modifica" (C) | apre il pannello "Cambia orario"; nessuna scrittura |
| `consulenza · scegli un nuovo orario` | "Scegli un nuovo orario" (D) | apre il pannello con l'avviso dell'orario passato; nessuna scrittura |
| `consulenza · scheda giorni` | "Prossimi giorni" / "Settimana successiva" | nessuna richiesta (gli orari sono già tutti in memoria) |
| `consulenza · scegli orario` | pillola di un'ora | selezione singola in memoria; secondo tocco deseleziona |
| `consulenza · conferma orario` | "Conferma orario" nel pannello | in ogni variante (cambia orario, orario passato, non più disponibile): chiude il pannello e mette l'orario scelto nella card, solo in memoria, nessuna scrittura (il lead non si tocca mai); la schermata diventa "da confermare" e prenota solo `consulenza · conferma` (decisione del 22/10/2026: sempre due passaggi) |
| `consulenza · annulla scelta` | "Annulla", "Chiudi", velo, tasto indietro | chiude il pannello e azzera la scelta in corso |
| `consulenza · riprova orari` | "Riprova" nel pannello | rilegge gli orari |
| `consulenza · torna alla home` | "Torna alla home" e icona Indietro (G) | rilegge lo stato all'avvio e mostra F |
| `consulenza · entra` / `consulenza · gestisci appuntamento` | card dell'appuntamento (F) | come `appuntamenti · entra` / `appuntamenti · gestisci` |

### Letture

- Stato: la lettura unica all'avvio (`SELEZIONE_STATO`) include dallo step 12 `clients.phone_number`,
  `appointments.end_time` e `nutritionist_profiles.expertise, registration_number`. Nessuna lettura in più per C, D, G.
- Orari: `get_nutritionist_available_slots_v2` con il solo `p_nutritionist_id` (= `clients.nutritionist_id`, default
  14 giorni e 8 ore di anticipo) all'apertura del pannello, dopo `slot_taken`/`day_full`/`slot_in_past` e su "Riprova";
  mai al cambio di scheda; una ripetizione silenziosa dopo 300 ms su errore. Elenco vuoto → `consulenza · nessun orario`.
- F: nessuna lettura in più oltre allo stato; se il link della videochiamata manca, lo stato si rilegge al ritorno in
  primo piano ("Torna alla home" da G rilegge comunque).
- Durate (decisione del 22/10/2026, tutta l'app): prima visita 40 minuti, visita di controllo 20; la fascia mostrata è
  inizio – inizio + durata, non `end_time`; la fine reale del blocco serve solo a decidere se la visita è in corso.

## Racconta (diario vocale, step 10 · lotto 1)

Decisione del 23/10/2026. In codice: `apps/app/src/core/racconta/nomi.ts` (`SCHERMATE_RACCONTA`, `AZIONI_RACCONTA`).
Contratto del server: `balanced-client-agents/docs/server-diario-vocale.md`; prodotto:
`docs/contratti/contratto-diario-vocale-v0_4.md`.

### Schermate

| Nome | Figma | Cosa mostra |
|---|---|---|
| `racconta · permesso microfono` | Racconta · 2 (`459:643`) | consenso all'uso del servizio esterno di trascrizione e dell'intelligenza artificiale, prima della richiesta di sistema; compare finché il permesso non è concesso e il consenso non è ricordato sul telefono |
| `racconta · microfono disattivato` | Racconta · 3 (`459:681`) | permesso negato nelle impostazioni: "Apri le impostazioni" e "Scrivi il diario"; al rientro dalle impostazioni il permesso si ricontrolla |
| `racconta · pronto` | Racconta · 4 (`459:719`) | "Parla liberamente e racconta", i sei argomenti, "Tocca per iniziare", timer 0:00 / 3:00 |
| `racconta · registra` | Racconta · 5 (`459:779`) | stessi argomenti, livello voce che segue il microfono (onda continua sul thread dell'interfaccia, ferma con "Riduci movimento"), timer che avanza, stop senza alone; "In pausa" al posto del livello quando l'app è in secondo piano, lo schermo è bloccato o una chiamata interrompe |
| `racconta · registrazione terminata` | Racconta · 5.2 (`756:7628`) | "Hai finito? Genera trascrizione del racconto.", timer fermo, pulsante "Da inviare" (penna) e "Ricomincia"; l'audio è sul telefono e non parte nulla finché non si tocca la penna. Riaprendo "Racconta" con un audio di oggi non inviato si riparte da qui |
| `racconta · trascrizione` | Racconta · 7.1 (`756:7718`) | audio in invio al server (`POST /v1/diario-vocale/trascrivi`), pallini a saltello come nel funnel |
| `racconta · il tuo racconto` | Racconta · 6 (`459:856`) | card "Il tuo racconto · m:ss" con il testo trascritto modificabile a mano; "Crea il mio diario" (lotto 2) e "Ricomincia". Il testo (anche corretto) è salvato nella cartella documenti fino a fine giornata o alla creazione del diario: riaprendo "Racconta" lo stesso giorno si riparte da qui |
| `racconta · senza connessione` | Racconta · 10 (`459:1629`) | l'audio è salvato nella cartella documenti; si riprova da soli ogni 15 s e al ritorno in primo piano, senza cambiare schermata, finché il server risponde |
| `racconta · non ho capito` | Racconta · 11 (`459:1669`) | variante di Pronto con l'avviso: trascrizione vuota o quasi (silenzio, meno di dieci caratteri utili) e, dal lotto 2, esito `non_ho_capito` della compilazione |
| `racconta · crea diario` | Racconta · 7 (`459:922`) | "Preparando il tuo diario", senza freccia indietro (uscita bloccata finché il server risponde, al più 75 s): `POST /v1/diario-vocale/compila` con il racconto e la bozza di oggi |
| `racconta · riepilogo` | Racconta · 8 (`747:7517`) | "Modifica e invia": il diario compilato, già salvato come bozza, in un'unica pagina con tutti i blocchi aperti (pasti, valori, sport con riposo, commento); copia locale a ogni modifica, bozza salvata su "Chiudi", freccia, gesto, tasto indietro e secondo piano |
| `racconta · elaborazione non riuscita` | Racconta · 12 (`459:1712`) e varianti senza disegno | compilazione fallita: il racconto resta salvato; "Riprova" con `compilazione_fallita`, `compilazione_timeout`, errori del server, tempo scaduto o senza rete; "Scrivi il diario" con la sessione scaduta, il percorso non attivo, la giornata già condivisa nel frattempo o una richiesta rifiutata |
| `racconta · tutorial · invio del diario` | Tutorial · 6 (`758:7773`) | al primo arrivo sul riepilogo, scorso in fondo, evidenzia "Invia alla nutrizionista"; una volta per account (stessa chiave dei tutorial di Racconta) |
| `racconta · tutorial · racconta` / `· trascrizione` / `· crea il diario` | Tutorial · 3 (`586:5739`), · 4 (`758:7670`), · 5 (`758:7728`) | suggerimento con velo al 40 % ed elemento evidenziato (pulsante di registrazione, penna "Da inviare", "Crea il mio diario") al primo arrivo su Pronto, Registrazione terminata e Il tuo racconto; una sola volta per account (`balanced.racconta.tutorial.<client_id>` nel portachiavi) |
| `racconta · errore` | Racconta · 12 (`459:1712`) e varianti senza disegno | errore del server: con "Riprova" (`trascrizione_fallita`, `trascrizione_timeout`, `identita_non_verificabile`, `errore_interno`, tempo scaduto nell'app), oppure definitivo senza "Riprova" (`abbonamento_non_attivo`, `cliente_non_trovato`, `token_*` non rinnovabile, `audio_troppo_lungo`, `audio_troppo_grande`, richieste rifiutate), con il riferimento `x-request-id` per l'assistenza |

### Azioni

| Nome | Dove | Effetto sui dati |
|---|---|---|
| `racconta · consenti microfono` | "Consenti" (2) | registra il consenso per l'account nel portachiavi (`balanced.racconta.consenso.<client_id>`, resta anche dopo l'uscita; un altro account lo rifà) e chiede il permesso di sistema |
| `racconta · preferisco scrivere` / `racconta · apri impostazioni` | 2 e 3 | torna a Oggi / apre le impostazioni dell'app; nessuna scrittura |
| `racconta · avvia registrazione` | Pulsante registrazione (4) | registra in mono AAC 24 kHz 48 kbit/s nella cartella documenti (`ExpoAudio/racconto-<data>.m4a` su iOS, `Audio/` su Android) |
| `racconta · ferma registrazione` / `racconta · arresto a 3 minuti` | stop (5) / automatico | chiude il file e scrive la nota dell'audio in attesa (`balanced.racconta.<client_id>` nella cartella documenti); si passa a Registrazione terminata senza inviare nulla |
| `racconta · invia la registrazione` | penna "Da inviare" (5.2) | avvia `racconta · trascrivi` |
| `racconta · interrompi e scarta` | "Interrompi" nell'avviso di sistema all'uscita (freccia, gesto, tasto indietro) con una registrazione in corso o terminata e non inviata | ferma il registratore, cancella l'audio e la nota, lascia la schermata; "Annulla" resta |
| `racconta · tutorial · ho capito` | "Ho capito" del suggerimento | segna il punto come visto per l'account |
| `racconta · pausa` / `racconta · riprendi` | app in secondo piano, schermo bloccato, chiamata | il registratore si ferma e riparte; il tempo in pausa non conta |
| `racconta · trascrivi` | fine registrazione, ritorno della rete, "Riprova" | una `POST /v1/diario-vocale/trascrivi` con `Authorization: Bearer <access_token>`, `Content-Type: audio/mp4`, `X-Diary-Date`, `X-Audio-Duration-Ms` (mai oltre 180 000), `X-Request-Id`; con 401 si rinnova la sessione e si ripete una volta. Dopo il testo l'audio e la nota si cancellano subito |
| `racconta · modifica il racconto` | campo della card (6) | aggiorna il testo salvato nella cartella documenti (`balanced.racconta.testo.<client_id>`) |
| `racconta · ricomincia` | "Ricomincia" (5.2, 6, 12) | torna a Pronto e cancella l'audio o il testo rimasti; nessun dialogo |
| `racconta · riprova trascrizione` | "Riprova" (12) | ripete `racconta · trascrivi` con lo stesso file |
| `racconta · crea il mio diario` | "Crea il mio diario" (6) | `POST /v1/diario-vocale/compila` con `Authorization: Bearer <access_token>`, corpo `{ data, racconto, bozza }` (bozza di oggi dalla memoria dell'app nel formato del server, con "oggi riposo"; `corpo-libero` ↔ `corpo_libero`); con 401 si rinnova la sessione e si ripete una volta. Esito `diario`: i campi (già fusi) diventano la bozza di oggi e si salvano subito senza status (mai una bozza vuota), il racconto salvato si cancella, si apre il riepilogo. Esito `non_ho_capito`: Racconta · 11, il racconto si cancella |
| `racconta · riprova compilazione` | "Riprova" (12) | ripete `racconta · crea il mio diario` con lo stesso racconto |
| `racconta · modifica riepilogo` | campi del riepilogo (8) | aggiornano la copia locale del diario di oggi (memoria e file), come nella Card diario |
| `racconta · invia` | "Invia alla nutrizionista" (8) | la condivisione esistente del diario (una sola modifica filtrata su `status = draft`, o inserimento già condiviso); torna a Oggi con la Notifica breve "Giornata condivisa con la tua nutrizionista." |
| `racconta · chiudi riepilogo` | "Chiudi" e freccia (8) | salva la bozza e torna a Oggi con "Continua"; alle 23:50 la bozza è condivisa in automatico come ogni bozza |

### Regole

- L'audio non è mai in cache: sta nella cartella documenti finché non è trascritto; a fine giornata (data del diario in
  ora italiana diversa da oggi) si cancella all'apertura successiva di "Racconta", insieme a ogni altro file di
  registrazione rimasto. Un audio di oggi in attesa riparte dalla trascrizione, senza registrare di nuovo.
- Uscire dalla schermata con una registrazione in corso o terminata e non inviata chiede conferma con l'avviso di sistema
  ("Vuoi interrompere la registrazione?" / "La registrazione andrà persa." · "Annulla" / "Interrompi"): solo "Interrompi"
  scarta il file ed esce. Negli altri stati si esce senza avvisi.
- Il testo trascritto resta nella cartella documenti fino a fine giornata o alla creazione del diario.
- Nessuna scrittura sul database in questo lotto; il server registra solo consumi ed esiti (`voice_diary_events`).
