# Nomi stabili del diario e delle revisioni (schermate e azioni)

Decisione del 19/10/2026 (step 5, lotto 1), estesa il 20/10/2026 con il lotto 2 (settimana, pannello della
giornata e commenti), il 21/10/2026 con il lotto 3 (storico delle giornate), il lotto 4 (andamento della
settimana e durate dello sport) e lo step 7 (revisioni). Nomi da usare in futuro per gli eventi di misurazione: non
cambiano al cambiare dei testi a schermo. In codice: `apps/app/src/core/diario/nomi.ts` (`SCHERMATE_DIARIO`,
`AZIONI_DIARIO`) e `apps/app/src/core/revisioni/nomi.ts` (`SCHERMATE_REVISIONI`, `AZIONI_REVISIONI`).

## Schermate

| Nome | Figma | Cosa mostra |
|---|---|---|
| `oggi` | Oggi · 1, 6, 7 (`444:1103`, `446:3703`, `446:3777`) | pagina Oggi con la Card diario chiusa (da iniziare o in bozza) o condivisa e la Card settimana |
| `diario · pasti` | Oggi · 2 (`444:1539`) | passaggio 1: colazione, pranzo, cena, spuntini |
| `diario · valori` | Oggi · 3 (`444:2624`) | passaggio 2: energia, sazietà, idratazione |
| `diario · sport` | Oggi · 4 (`444:2962`) | passaggio 3: sport e durata (o riposo). Durate salvate nel formato storico `<30m`, `30m-1h`, `1h-1.5h`, `>1.5h` (etichette "Meno di 30 min", "30 min – 1 ora", "1 – 1,5 ore", "Più di 1,5 ore"; decisione del 21/10/2026); `<20m` dei diari della web app si legge ("Meno di 20 min") ma non si propone più |
| `diario · commento` | Oggi · 5 (`444:3247`) | passaggio 4: nota e "Invia alla nutrizionista" |
| `racconta · segnaposto` | — (sezione 3.1 allo step 10) | segnaposto aperto da "Racconta" |
| `giornata · pannello` | Giornate · 2, 3, 4 (`474:1430`, `475:1337`, `475:1409`) | pannello dal basso di una giornata condivisa: data, Card commento (se c'è), "La tua giornata" con "Modifica"; si porta a schermo pieno con la maniglia. Rotta diretta: `/abbonato?giornata=YYYY-MM-DD` (per la push del commento, step 6) |
| `giornata · modifica` | Giornate · 5 (`475:1459`) | i quattro passaggi del diario dentro il pannello, a schermo pieno, per una giornata già condivisa (senza "Invia alla nutrizionista") |
| `storico` | Giornate · 6 (`475:1917`) | "Le tue condivisioni": i mesi dal primo diario al mese corrente, card con effetto vetro, una riga per settimana con i giorni allineati a sinistra, nessun indicatore di commento. Rotta `/storico` |
| `andamento` | Andamento · 1 (`479:1908`), Card andamento (`479:334`) | sulla pagina Oggi, sotto la Card settimana: tre card con il grafico a colonne della settimana in corso (lunedì–domenica, ora italiana), `andamento · energia`, `andamento · idratazione`, `andamento · sport`. Quattro gradini (30/60/90/120): energia e idratazione 1–4; sport `<20m` e `<30m` sul primo, poi `30m-1h`, `1h-1.5h`, `>1.5h`. Giorno passato non condiviso = trattino tratteggiato; riposo (sport) = trattino pieno; oggi non condiviso con un valore nella bozza = colonna tratteggiata alta quanto il valore; giorni futuri vuoti. Nessuna lettura in più, nessuna frase di sintesi, nessun selettore di periodo |
| `andamento · pochi dati` | Andamento · 2 (`479:2100`) | le tre card con "Registra un valore dal diario per vedere il tuo andamento": solo quando nella settimana non c'è alcun valore in nessuna categoria (basta un valore, anche solo nella bozza di oggi, perché compaiano i tre grafici; una categoria senza valori resta con le sole etichette e linee guida) |

## Azioni

| Nome | Dove | Effetto sui dati |
|---|---|---|
| `diario · scrivi` | pulsante tondo "Scrivi" | apre il passaggio Pasti; nessuna scrittura |
| `diario · racconta` | pulsante tondo "Racconta" | apre il segnaposto; nessuna scrittura |
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
