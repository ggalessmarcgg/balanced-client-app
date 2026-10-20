# Nomi stabili del diario (schermate e azioni)

Decisione del 19/10/2026 (step 5, lotto 1), estesa il 20/10/2026 con il lotto 2 (settimana, pannello della
giornata e commenti) e il 21/10/2026 con il lotto 3 (storico delle giornate). Nomi da usare in futuro per gli eventi di misurazione: non cambiano al cambiare dei testi
a schermo. In codice: `apps/app/src/core/diario/nomi.ts` (`SCHERMATE_DIARIO`, `AZIONI_DIARIO`).

## Schermate

| Nome | Figma | Cosa mostra |
|---|---|---|
| `oggi` | Oggi · 1, 6, 7 (`444:1103`, `446:3703`, `446:3777`) | pagina Oggi con la Card diario chiusa (da iniziare o in bozza) o condivisa e la Card settimana |
| `diario · pasti` | Oggi · 2 (`444:1539`) | passaggio 1: colazione, pranzo, cena, spuntini |
| `diario · valori` | Oggi · 3 (`444:2624`) | passaggio 2: energia, sazietà, idratazione |
| `diario · sport` | Oggi · 4 (`444:2962`) | passaggio 3: sport e durata (o riposo) |
| `diario · commento` | Oggi · 5 (`444:3247`) | passaggio 4: nota e "Invia alla nutrizionista" |
| `racconta · segnaposto` | — (sezione 3.1 allo step 10) | segnaposto aperto da "Racconta" |
| `giornata · pannello` | Giornate · 2, 3, 4 (`474:1430`, `475:1337`, `475:1409`) | pannello dal basso di una giornata condivisa: data, Card commento (se c'è), "La tua giornata" con "Modifica"; si porta a schermo pieno con la maniglia. Rotta diretta: `/abbonato?giornata=YYYY-MM-DD` (per la push del commento, step 6) |
| `giornata · modifica` | Giornate · 5 (`475:1459`) | i quattro passaggi del diario dentro il pannello, a schermo pieno, per una giornata già condivisa (senza "Invia alla nutrizionista") |
| `storico` | Giornate · 6 (`475:1917`) | "Le tue condivisioni": i mesi dal primo diario al mese corrente, card con effetto vetro, una riga per settimana con i giorni allineati a sinistra, nessun indicatore di commento. Rotta `/storico` |

## Azioni

| Nome | Dove | Effetto sui dati |
|---|---|---|
| `diario · scrivi` | pulsante tondo "Scrivi" | apre il passaggio Pasti; nessuna scrittura |
| `diario · racconta` | pulsante tondo "Racconta" | apre il segnaposto; nessuna scrittura |
| `diario · avanti` | link "Avanti" o scorrimento verso sinistra | passa al blocco successivo e salva la bozza se ci sono modifiche |
| `diario · indietro` | scorrimento verso destra | torna al blocco precedente e salva la bozza se ci sono modifiche |
| `diario · vai al blocco` | tocco su una tacchetta dell'indicatore | va a quel blocco (avanti o indietro) e salva la bozza se ci sono modifiche |
| `diario · chiudi` | link "Chiudi" | chiude la card e salva la bozza se ci sono modifiche |
| `diario · salva bozza` | automatico: chiusura/cambio di blocco, uscita dalla pagina, app in secondo piano, ritorno della rete | inserimento (prima volta, solo con contenuto) o modifica dei soli campi, senza `status` |
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

## Letture della settimana (lotto 2)

- All'apertura della pagina Oggi e a ogni ritorno in primo piano: una lettura di `daily_submissions` per `client_id`
  sulla sola settimana corrente, lunedì–domenica in ora italiana (colonne: `id, submission_date, status, updated_at,
  energy_level, satiety_level, hydration_level, sport_type, sport_duration, nutritionist_comment, comment_author_id,
  comment_acknowledged`). Nessuna rilettura dopo un salvataggio.
- Storico (lotto 3): all'apertura una lettura minima del primo diario del cliente (`submission_date`, ordinata, un
  solo risultato, per `client_id`), poi in memoria e nel portachiavi con la cache del diario; una lettura per mese
  (`submission_date, status` per `client_id` e intervallo del mese) solo quando il mese entra, o sta per entrare, nello
  schermo, tenuta in memoria per la sessione; il mese corrente riusa la settimana già in memoria e legge solo la parte
  del mese che la precede (nulla se la settimana corrente comincia nel mese). Nessuna scrittura oltre a "letto" e
  modifica del pannello.
- Autore del commento: una lettura di `nutritionist_profiles` (`id, full_name, title, app_square_photo_url`) per
  `comment_author_id`, tenuta in memoria per la sessione e nel portachiavi per 30 giorni; se il profilo non è leggibile
  (inattivo) si mostra la nutrizionista del cliente; senza foto, le iniziali.
