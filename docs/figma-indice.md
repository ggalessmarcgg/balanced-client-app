# Indice del file Figma `gEx2IMz69sIuUnOYkLBjcf` (Clients App)

Censimento del 18/10/2026, aggiornato dopo la pulizia dello stesso giorno (`docs/figma-pulizia.md`). Le schermate hanno gli stessi node-id; le copie a mano sostituite da istanze hanno ID nuovi (elencati nel documento di pulizia). L'elenco pagine del connettore Figma (`get_metadata` senza nodeId) restituisce solo la prima pagina del file: si parte sempre dagli ID qui sotto.

Link diretto a un nodo: `https://www.figma.com/design/gEx2IMz69sIuUnOYkLBjcf/Clients-App?node-id=<id con il trattino>` (es. `414-39`).

## Pagine

| Pagina | node-id | Contenuto |
|---|---|---|
| 🧱 Foundations · App nativa | `413:2` | frame `413:3` (foundations base, swatch collegati alle variabili), frame `414:2` (adattamenti nativi, con le sezioni aggiunte il 18/10/2026: Titoli di pagina `646:38`, Scala delle opacità `646:41`, Barra di navigazione e barra superiore `646:44`, Pulizia `646:47`), componenti Schermo iOS `414:29`, Schermo Android `414:34`, Barra di stato iOS `437:2`, Indicatore home iOS `437:18`, Barra di stato Android `437:20`, Indicatore gesti Android `437:28` |
| 🧩 Componenti · App nativa | `418:2` | 102 componenti dopo la pulizia del 18/10/2026 (59 icone con schema `Icona / <misura> / <nome>`, 43 di interfaccia). Nuovi: Logo `625:254`, Barra superiore `625:382`, Separatore `625:383`, Card nutrizionista `638:435`; Intestazione ora set `638:416` (variante App `419:105`), Avviso connessione set `638:410`; eliminati Riga pasto, Riga pasto/Compilato, Giorno prenotazione. Dettagli in `docs/figma-pulizia.md` |
| 📱 App iOS Android | `414:39` | 13 sezioni, 105 schermate (frame 393 di larghezza) |
| 🧱 Foundations (funnel web, vecchia) | `5:8` | non usata dall'app |

## Sezioni e schermate di 📱 App iOS Android (`414:39`)

Le sezioni sono nell'ordine dei livelli della pagina (dall'alto verso il basso sul canvas; le ultime due sono nella colonna a destra). Dentro ogni sezione le schermate sono nell'ordine in cui compaiono da sinistra a destra (poi dall'alto in basso); il numero nel nome è quello scelto dal design.

### 1 · Accesso · `414:41` · 9 schermate

| Schermata | node-id | Altezza |
|---|---|---|
| Accesso · Login | `425:224` | 852 |
| Accesso · Login con errore | `425:252` | 852 |
| Accesso · Recupero password · Email | `425:286` | 852 |
| Accesso · Recupero password · Codice | `425:306` | 852 |
| Accesso · Nuova password | `425:332` | 852 |
| Accesso · Accesso automatico in corso | `425:364` | 852 |
| Accesso · Link non più valido | `425:378` | 852 |
| Accesso · Email non confermata | `562:4254` | 852 |
| Accesso · Email non confermata · link inviato | `562:4319` | 852 |

### 3 · Oggi e diario · `444:1102` · 8 schermate

| Schermata | node-id | Altezza |
|---|---|---|
| Oggi · 1 · Diario da iniziare | `444:1103` | 634 |
| Oggi · 2 · Diario aperto · Pasti | `444:1539` | 950 |
| Oggi · 3 · Diario aperto · Valori | `444:2624` | 1105 |
| Oggi · 4 · Diario aperto · Sport | `444:2962` | 1130 |
| Oggi · 5 · Diario aperto · Commento | `444:3247` | 910 |
| Oggi · 6 · Diario in bozza | `446:3703` | 634 |
| Oggi · 7 · Diario condiviso | `446:3777` | 510 |
| Oggi · Schermata con componenti (diario da iniziare) (prima versione) | `449:980` | 634 |

### 3.1 · Diario vocale · `459:642` · 13 schermate

| Schermata | node-id | Altezza |
|---|---|---|
| Racconta · 1 · Scegli come compilare | `459:1076` | 634 |
| Racconta · 2 · Permesso microfono | `459:643` | 852 |
| Racconta · 3 · Microfono disattivato | `459:681` | 852 |
| Racconta · 4 · Pronto | `459:719` | 852 |
| Racconta · 5 · In registrazione | `459:779` | 852 |
| Racconta · 6 · Registrazione completata | `459:856` | 852 |
| Racconta · 7 · Elaborazione | `459:922` | 852 |
| Racconta · 8 · Diario precompilato · Pasti | `459:1149` | 878 |
| Racconta · 9 · Diario precompilato · Valori | `459:1393` | 1105 |
| Racconta · 10 · Errore · Senza connessione | `459:1629` | 852 |
| Racconta · 11 · Errore · Non ho capito | `459:1669` | 852 |
| Racconta · 12 · Errore · Elaborazione non riuscita | `459:1712` | 852 |
| Racconta · 5.1 · In registrazione info aperte | `462:1640` | 852 |

### 3.2 · Giornate e storico · `474:1327` · 6 schermate

| Schermata | node-id | Altezza |
|---|---|---|
| Giornate · 1 · Settimana con commento da leggere | `474:1328` | 634 |
| Giornate · 2 · Pannello · commento da leggere | `474:1430` | 852 |
| Giornate · 3 · Pannello a schermo pieno · commento letto | `475:1337` | 852 |
| Giornate · 4 · Pannello · senza commento | `475:1409` | 852 |
| Giornate · 5 · Pannello · modifica della giornata | `475:1459` | 852 |
| Giornate · 6 · Storico delle giornate | `475:1917` | 852 |

### 3.3 · Andamento · `479:1907` · 2 schermate

| Schermata | node-id | Altezza |
|---|---|---|
| Andamento · 1 · Oggi con gli ultimi 7 giorni | `479:1908` | 1455 |
| Andamento · 2 · Oggi con pochi dati | `479:2100` | 1134 |

### 5 · Revisioni · `494:1943` · 5 schermate

| Schermata | node-id | Altezza |
|---|---|---|
| Revisioni · 1 · Revisione in corso | `494:1944` | 852 |
| Revisioni · 2 · Nuova revisione arrivata | `494:2060` | 852 |
| Revisioni · 3 · Revisione in preparazione | `494:2165` | 852 |
| Revisioni · 4 · Lettura della revisione | `494:2487` | 791 |
| Revisioni · 5 · Prima revisione in arrivo | `494:2528` | 852 |

### 4 · Account · `499:2144` · 4 schermate

| Schermata | node-id | Altezza |
|---|---|---|
| Account · 1 · Profilo | `499:2145` | 1818 |
| Account · 2 · Notifiche disattivate | `492:3408` | 1908 |
| Account · 3 · Elimina account · avviso | `499:2568` | 852 |
| Account · 4 · Elimina account · conferma | `499:2709` | 852 |

### 6 · Menu · `508:2613` · 12 schermate

| Schermata | node-id | Altezza |
|---|---|---|
| Menu · 1 · Menu a tutta pagina | `508:2614` | 852 |
| Menu · 2 · Notifiche | `508:2699` | 852 |
| Menu · 3 · La tua nutrizionista · prenotato, contatto oscurato | `514:2530` | 1742 |
| Menu · 3 · La tua nutrizionista · abbonato | `515:2957` | 1740 |
| Menu · 4.1 · Appuntamenti · visita tra pochi minuti | `517:2680` | 852 |
| Menu · 4 · Appuntamenti | `517:2616` | 852 |
| Menu · 4.2 · Appuntamenti · nessuna visita in programma | `517:2741` | 852 |
| Menu · 5 · Contenuti | `520:2883` | 2168 |
| Menu · 5.1 · Contenuto | `520:3086` | 1115 |
| Menu · 6 · Peso e misure · grafici | `525:2846` | 1093 |
| Menu · 6.1 · Peso e misure · tabelle | `525:2930` | 1265 |
| Menu · 3.1 · La tua nutrizionista · in ferie | `596:5846` | 1868 |

### 7 · Piano · `527:2946` · 14 schermate

| Schermata | node-id | Altezza |
|---|---|---|
| Piano · 1 · Piano fisso | `527:2947` | 1277 |
| Piano · 2 · Piano variabile | `527:3070` | 1087 |
| Piano · 3 · Piano in elaborazione | `527:3174` | 852 |
| Piano · 4 · Sostituzione · avvio | `531:3086` | 852 |
| Piano · 4.1 · Sostituzione · ricerca in corso | `531:3232` | 852 |
| Piano · 4.2 · Sostituzione · alternative | `531:3374` | 852 |
| Piano · 4.3 · Sostituzione · nessuna alternativa | `531:3528` | 852 |
| Piano · 5 · Genera ricetta · piano fisso | `536:3448` | 852 |
| _(nodo non schermata: slice "Slice 1")_ | `523:3044` | 100×100 |
| Piano · 5.1 · Genera ricetta · piano variabile | `536:3626` | 852 |
| Piano · 5.2 · Genera ricetta · ricerca delle idee | `537:4384` | 852 |
| Piano · 5.3 · Genera ricetta · tre idee | `536:3770` | 852 |
| Piano · 5.4 · Ricetta | `539:3500` | 993 |
| Menu · 7 (spostata qui da Alessmarc il 18/10/2026) · Le tue ricette | `539:3724` | 852 |
| Menu · 7.1 (spostata qui da Alessmarc il 18/10/2026) · Le tue ricette · nessuna ricetta | `539:3777` | 852 |

### 8 · Stati dell'account · `550:3635` · 14 schermate

| Schermata | node-id | Altezza |
|---|---|---|
| Stati · 1 · Consulenza da confermare | `550:3636` | 852 |
| Stati · 2 · Prima della consulenza | `550:3694` | 1100 |
| Stati · 3 · Orario passato senza conferma | `550:3754` | 852 |
| Stati · 4 · Orario passato · scegli un nuovo orario | `556:3756` | 852 |
| Stati · 4.1 · Orario non più disponibile | `556:3897` | 852 |
| Stati · 4.2 · Cambia orario prima della conferma | `556:4038` | 852 |
| Stati · 5 · Consulenza prenotata | `550:3890` | 852 |
| Stati · 6 · Percorso non ancora attivo | `558:4206` | 852 |
| Stati · 7 · Percorso concluso | `558:4260` | 852 |
| Stati · 12 · Consulenza non svolta (no-show) | `562:4195` | 852 |
| Stati · 8 · Riprendi il percorso · piano alimentare (in sospeso) | `558:4370` | 852 |
| Stati · 9 · Riprendi il percorso · scegli un orario (in sospeso) | `558:4413` | 852 |
| Stati · 10 · Riprendi il percorso · consulenza prenotata (in sospeso) | `558:4499` | 852 |
| Stati · 11 · Account non collegato | `558:4316` | 852 |

### 9 · Stati trasversali · `563:4516` · 5 schermate

| Schermata | node-id | Altezza |
|---|---|---|
| Trasversali · 1 · Senza connessione | `563:4517` | 852 |
| Trasversali · 2 · Caricamento | `563:4751` | 852 |
| Trasversali · 3 · Errore di caricamento | `563:4978` | 852 |
| Trasversali · 4 · Notifica breve · conferma | `563:5122` | 852 |
| Trasversali · 5 · Notifica breve · errore | `563:5191` | 852 |

### 1.1 · Primo accesso e tutorial · `586:4904` · 8 schermate

| Schermata | node-id | Altezza |
|---|---|---|
| Primo accesso · 1 · Benvenuto | `586:4905` | 852 |
| Primo accesso · 2 · Diario | `586:4941` | 852 |
| Primo accesso · 3 · Commenti e revisioni | `586:4995` | 852 |
| Primo accesso · 4 · Piano e AI | `586:5043` | 852 |
| Primo accesso · 5 · Notifiche | `586:5154` | 852 |
| Tutorial · 1 · Piano · sostituzione | `586:5457` | 852 |
| Tutorial · 2 · Piano · ricette | `586:5598` | 852 |
| Tutorial · 3 · Racconta la tua giornata | `586:5739` | 852 |

### 10 · Tema scuro · pronto per dopo la v1 · `588:5413` · 5 schermate

| Schermata | node-id | Altezza |
|---|---|---|
| Scuro · Oggi | `588:5414` | 852 |
| Scuro · Piano fisso | `588:5638` | 852 |
| Scuro · Revisioni | `588:5767` | 852 |
| Scuro · Account | `588:5862` | 852 |
| Scuro · Menu | `588:6000` | 852 |

Totale: 13 sezioni, 105 schermate.

## Note di lettura

- Ogni schermata è un frame 393×N (iPhone con Dynamic Island): barra di stato `437:2` in alto (59), indicatore home `437:18` in basso (34). Le schermate con altezza > 852 sono pagine scrollabili disegnate per intero.
- Il logo Balanced è il frame "Logo" (18,93×33,74) in alto a sinistra di ogni "Barra superiore"; non è un componente (vedi censimento §7).
- La pagina pesa ~450 KB in XML: con `get_metadata` sulla pagina il risultato viene salvato su file; conviene chiedere i singoli frame.
