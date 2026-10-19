# Pulizia del file Figma per il design system

File `gEx2IMz69sIuUnOYkLBjcf` (Clients App) · eseguita il 18/10/2026 con il connettore Figma, su approvazione di Alessmarc blocco per blocco. Versione salvata prima dell'intervento: "Prima della pulizia per il codice". Piano di riferimento: `~/Desktop/censimenti-app/step2-piano-pulizia-figma.md` (categorie A–E). Fuori perimetro e non toccati: sezione "10 · Tema scuro" (`588:5413`) e pagina Foundations del funnel (`5:8`).

Principio: nessun cambiamento visivo, salvo le eccezioni decise e riportate in fondo. Ogni blocco è stato verificato con screenshot prima/dopo delle 12 sezioni della pagina schermate e della pagina componenti, confrontati pixel per pixel (strumento locale, tolleranza 2 livelli su 255).

## Decisioni di Alessmarc

- Misure fuori scala → variabili nuove con il valore attuale (spazi 2, 3, 5, 6, 10, 14, 28, 30, 36, 40; raggi 10 e 20; icone 18, 32, 36, più 16, 20, 24 per completare la scala). Correzioni: raggio 23 → 24, testi 11,478 → 11, testo 9,429 → 9,5 (misura fissa del componente, senza stile). Non tokenizzati: padding-bottom 120, gap 15/9 del grafico, dimensioni fisse, titoli "Piano" con altezza 44.
- Opacità dei testi secondari → variabili colore con alfa. Tema scuro: valori di servizio (stessa alfa sul testo primario scuro), il tema scuro non è nella v1.
- Logo → componente con `marchio/foglia-chiara` e `marchio/foglia-scura`; le schermate di accesso usano solo l'istanza del Logo.
- Barra superiore → componente con proprietà Notifiche (Campanella | Con nuove | Nascosta) e Azione (Menu | Chiudi | Nascosta).
- Separatore → componente. Icone staccate → istanze; icone mancanti → componenti identici al tracciato. Schema unico dei nomi: `Icona / <misura> / <nome italiano>` (`Icona AI / 20 / Sostituisci`), nome Lucide nella descrizione.
- Riga elenco: varianti "Due righe", "Con avatar", "Notifica". Pulsante: "Terziario compatto" (Regular, "Chiudi") e "Terziario compatto evidenziato" (SemiBold, "Avanti", "Salta").
- Pannello scelta orario: restano i chip disegnati; `Giorno prenotazione` eliminato.
- Override E15: ripristinati Card settimana di Racconta 1 (titolo al 70 %) e barra di navigazione del Tutorial 1 (fondo 80 %); varianti nuove `Intestazione · Accesso`, `Opzione · Compatta`, `Opzione · Su più righe`, `Avviso connessione · Nel contenuto`; Segnaposto con altezza libera e Card contenuto Alta a riempimento senza varianti.
- Card della nutrizionista: vale la versione di Stati 6 (padding 24 / 20 / 16, etichetta sopra e nome sotto) → componente `Card nutrizionista`; Account 1 e 3 allineate.
- Mese storico settembre: istanza del componente come ottobre (le differenze erano sviste).
- Titoli: "Account" di Account 3 e 4 interamente in `App/Accento serif`; "Prenotazione della consulenza confermata!" (Stati 5 e 10) in `App/H1` con "confermata" in serif; i quattro titoli delle schermate di recupero password restano come sono (da rivedere allo step 3, il recupero con codice è fuori dalla v1).
- Librerie community: le rimuove Alessmarc a mano (vedi in fondo).

## Blocco 1 · Variabili e stili nuovi

Collezione `App · Misure` (18 variabili): `spazio/2`, `/3`, `/5`, `/6`, `/10`, `/14`, `/28`, `/30`, `/36`, `/40`; `raggio/badge` 10, `raggio/contenuto` 20; `icona/16`, `/18`, `/20`, `/24`, `/32`, `/36`.

Collezione `App · Colori` (14 variabili, modalità Chiaro e Scuro): `marchio/foglia-chiara` → `colore/militar`, `marchio/foglia-scura` → `colore/dark-green`; `testo/secondario` 60 %, `testo/terziario` 50 %, `testo/attenuato` 70 %, `testo/corpo-attenuato` 80 %, `testo/segnaposto` 45 %, `testo/disabilitato` 40 %, `testo/futuro` 30 %; `icona/secondaria` (nata come nero al 60 %, poi resa colore pieno: vedi "Aggiornamento icona/secondaria" in fondo); `linea/separatore` 6 %, `linea/guida` 8 %, `linea/avanzamento` 10 % (aggiunta nel blocco 4), `maniglia` 15 %. In Chiaro: nero con alfa; in Scuro: #F4F0E8 con la stessa alfa.

Stili di testo (4): `App/Caption SemiBold` (11 SemiBold 140 %), `App/Etichetta AI` (14 SemiBold, interlinea automatica), `App/Body details 130` (14 Regular 130 %), `App/Etichetta piccola 130` (14 SemiBold 130 %).

## Blocco 2 · Collegamenti (A)

Script sulle due pagine (prima i componenti, poi le schermate senza toccare l'interno delle istanze, che ereditano).

| Intervento | Componenti | Schermate |
|---|---|---|
| nodi toccati | 780 | 2.172 |
| padding → variabile (incluso `margine/pagina` ×274) | 376 | 1.758 |
| gap → variabile | 282 | 1.016 |
| angoli → `raggio/*` (`raggio/pieno` anche per 888, 856, 2, 2,5, 3, 1, 1,5, 0,889: forme già a pillola) | 836 | 1.148 |
| icone → `icona/*`, aree 44 → `tocco/minimo-ios` | 97 + 1 | 182 + 103 |
| colori a mano → variabile (testi, sfondi, logo) | 202 | 282 |
| opacità testi → `testo/*` (fill con alfa, opacità livello a 100 %) | 105 | 211 |
| separatori, linee guida, maniglie → `linea/*`, `maniglia` | 29 | 233 |
| icone al 60 % → `icona/secondaria` | 14 | 0 |
| testi senza stile → stile identico (solo stili `App/`) | 119 | 29 |

Override d'istanza ripristinati (identici): campi password e codice #F4F0E8 → `sfondo/campo` (13), cerchi #347F75 → `azione/primaria` (7), colonne → `grafico/energia` (4); opacità doppia sul "Passo" del Suggerimento rimossa. Esito dei confronti: identiche salvo antialiasing sub-pixel e lo spostamento accettato del serif.

Lasciati scollegati e documentati: veli dei pannelli al 25 % (`474:1533`, `475:1367`, `475:1439`, `475:1489`, `499:2697`, `499:2838`, `531:3208`, `531:3354`, `531:3496`, `556:3820`, `586:5586`), Stop 26 r 6, barra BMI r 5, tratto legenda 14×3 al 45 %, trattino "oggi" al 30 %, mockup ridotti all'84 % in Primo accesso 2 e 4 (testi a 9,24/13,44/15,96/26,88).

## Blocco 3 · Componenti nuovi e sostituzioni (B, E6)

- `Logo` (`625:254`): 18,93 × 33,74, foglie collegate a `marchio/*`. Sostituiti 65 gruppi (59 "Logo" + 6 "Group 1091"), 3 ridotti al 71,1 % nelle notifiche di esempio.
- `Barra superiore` (set `625:382`, 9 varianti). Sostituite 56 barre a mano: Campanella/Menu 40, Con nuove/Menu 5, Nascosta/Menu 6, Nascosta/Chiudi 1, Nascosta/Nascosta 4; le due nei mockup di Primo accesso 2 e 4 ridotte alla scala 0,84.
- `Separatore` (`625:383`): 178 separatori a mano sostituiti (8 residui con nome o altezza diversi restano frame).
- Icone nuove (19, componenti `626:313` … `626:388`): `Icona / 36 / Offline`, `/ 36 / Conferma`, `/ 32 / Matita`, `/ 24 / Piano`, `/ 24 / Revisioni`, `/ 24 / Profilo`, `/ 20 / Spunta`, `/ 20 / Più`, `/ 20 / Calendario`, `/ 20 / Giù`, `/ 20 / Su`, `/ 20 / Matita`, `/ 20 / Info`, `/ 20 / Videochiamata`, `/ 20 / Email`, `/ 20 / Campanella attiva`, `/ 20 / WhatsApp` (asset esterno, non Lucide), `/ 16 / Grafico`, `/ 16 / Tabella`. Icone staccate sostituite: 38 nei componenti, 57 nelle schermate (con override di colore dove erano al 60 %). Non sostituite in questo blocco: `icon/link` e `icon/credit-card` negli Stati (12 frame rinominati "Icona … (vuota)"); sistemate la sera stessa, vedi "Icone link e carta negli Stati" in fondo.
- Esito: 12 sezioni identiche; pagina componenti cambiata solo dove sono stati aggiunti i componenti.

### Tabella di corrispondenza delle icone

| Componente | Lucide | Prima |
|---|---|---|
| Icona / 24 / Occhio | eye | Icona / Occhio |
| Icona / 24 / Occhio barrato | eye-off | Icona / Occhio barrato |
| Icona / 24 / Indietro | chevron-left | Icona / Indietro |
| Icona / 24 / Avviso | circle-alert | Icona / Avviso |
| Icona / 24 / Info | info | Icona / Info |
| Icona / 24 / Menu | menu | Icona / Menu |
| Icona / 24 / Campanella | bell | Icona / Campanella |
| Icona / 24 / Microfono | mic | Icona / Microfono |
| Icona / 24 / Spunta | check | Icona / Spunta |
| Icona / 24 / Più | plus | Icona / Più |
| Icona / 24 / Avanti | chevron-right | Icona / Avanti |
| Icona / 24 / Goccia | droplet | Icona / Goccia |
| Icona / 24 / Energia | zap | Icona / Energia |
| Icona / 24 / Invia | send | Icona / Invia |
| Icona / 24 / Matita | pencil | Icona / Matita |
| Icona / 24 / Calendario | calendar-days | Icona / Calendario |
| Icona / 24 / Account | user | Icona / Account |
| Icona / 24 / Copia | copy | Icona / Copia |
| Icona / 24 / Chiudi | x | Icona / Chiudi |
| Icona / 24 / Contenuti | graduation-cap | Icona / Contenuti |
| Icona / 24 / Lucchetto | lock | Icona / Lucchetto |
| Icona / 24 / Video | video | Icona / Video |
| Icona / 24 / Calendario semplice | calendar | Icona / Calendario semplice |
| Icona / 24 / Nutrizionista | user-round-check | Icona / Nutrizionista |
| Icona / 24 / Grafico | chart-line | Icona / Grafico |
| Icona / 24 / Meno | minus | Icona / Meno |
| Icona / 24 / Ricette | chef-hat | Icona / Ricette |
| Icona / 24 / Offline | wifi-off | Icona / Offline |
| Icona / 24 / Piano | file | nuova (barra di navigazione) |
| Icona / 24 / Revisioni | book-open | nuova (barra di navigazione) |
| Icona / 24 / Profilo | user-round | nuova (barra di navigazione) |
| Icona / 20 / Argomento · Pasti | soup | Icona / Argomento · Pasti |
| Icona / 20 / Argomento · Energia | zap | Icona / Argomento · Energia |
| Icona / 20 / Argomento · Sazietà | gauge | Icona / Argomento · Sazietà |
| Icona / 20 / Argomento · Acqua | glass-water | Icona / Argomento · Acqua |
| Icona / 20 / Argomento · Movimento | dumbbell | Icona / Argomento · Movimento |
| Icona / 20 / Argomento · Altro | messages-circle (prima message-circle-reply, da confermare) | Icona / Argomento · Altro |
| Icona / 20 / Certificazione | graduation-cap | Icona 20 / Certificazione |
| Icona / 20 / Spunta · Più · Calendario · Giù · Su · Matita · Info · Videochiamata · Email · Campanella attiva | check · plus · calendar · chevron-down · chevron-up · pencil · info · picture-in-picture-2 · mail · bell-ring | nuove |
| Icona / 20 / WhatsApp | — (svgrepo) | nuova |
| Icona / 20 / Link · Carta | link · credit-card | Icona link (vuota) · Icona carta (vuota) negli Stati (aggiunte la sera, vedi in fondo) |
| Icona AI / 20 / Sostituisci | sparkle, tratto App/Gradiente AI | Icona AI / Sostituisci |
| Icona / 16 / Colazione | sun | Icona / Colazione |
| Icona / 16 / Imparando la nutrizione · Integrando nuove abitudini · Scelte più consapevoli | library-big · blocks · compass | Icona 16 / … |
| Icona / 16 / Grafico · Tabella | chart-line · list | nuove |
| Icona / 32 / Matita | pencil | nuova |
| Icona / 36 / Offline · Conferma | wifi-off · circle-check | nuove |

## Blocco 4 · Copie → istanze (C)

Sostituite 30 copie (testi, varianti annidate e visibilità trasferiti): Card diario ×9 (Oggi 1, 3, 4, 5, 6, 7; Racconta 1, 8, 9), Card settimana ×7 (Oggi), Card revisione ×6 (Revisioni 1, 2, 3, 5), Card spiegazione AI ×2 (Piano 4.2, 5.3), Card commento ×2 (Giornate 2, 3), Card trascrizione ×2 (Racconta 5, 6), Etichetta AI ×1, Mese storico ×1 (ottobre). Righe elenco: 9 "Due righe" (Revisioni 1 e 2, Ricette), 6 "Notifica"; 3 card nutrizionista; 5 "Salta" (il segnaposto `586:5178` è un'istanza invisibile a opacità 0 che conserva lo spazio); 7 link "Chiudi"/"Avanti" nei componenti Card diario; 6 Opzione di Racconta 4 → Forma "Su più righe"; Avviso connessione di Trasversali 1 → "Nel contenuto"; Intestazione del recupero password → "Accesso".

Varianti e componenti creati: Pulsante `Terziario compatto` (`638:395`) e `Terziario compatto evidenziato` (`638:397`); Opzione proprietà `Forma` = Standard | Compatta | Su più righe; `Avviso connessione` set (`638:410`, Posizione); `Intestazione` set (`638:416`, Contesto); Riga elenco `Due righe` (`638:422`), `Con avatar` (`638:429`), `Notifica` (`638:434`); `Card nutrizionista` (`638:435`); variabile `linea/avanzamento`.

Non sostituiti (differiscono dal componente, da decidere): "Card informativa" di Piano 4.3 (`531:3658`, fill pieno e gap 4), pillola argomenti di Racconta 5 (`461:1610`) e 5.1 (`462:1645`), righe "Certificazione" di Menu 3 (`515:2986`, `515:2989`, `515:2992`), contenitori "Selettore" (nessun componente contenitore per i Segmenti).

Esito: 8 sezioni su 12 identiche. Due regressioni intercettate dal confronto e corrette: le etichette delle Opzione in Racconta 4 (le varianti nuove non erano collegate alla proprietà testo; ora lo sono) e lo spazio del segnaposto "Salta" in Primo accesso 5. Un limite del connettore: assegnando via API un fill con variabile collegata, Figma azzera l'opacità del fill; la barra delle revisioni (10 %) è stata quindi espressa con la variabile `linea/avanzamento`.

## Blocco 5 · Correzioni con cambiamento visivo voluto

| Dove | Cosa | Effetto |
|---|---|---|
| Card settimana nelle 7 schermate Oggi | istanza del componente completo | compare "Apri storico" (icona 20 in alto a destra) |
| Saluti "Ciao Giulia, …" (schermate e componente Card diario) | `App/Accento serif` applicato al segmento in serif | spaziatura da −1 % a 0: circa 2 px sulla parola |
| Giorno della settimana (`439:101`, `474:171`, `474:175`) | 11,478 → 11 | −0,48 px sulle lettere dei giorni in tutte le Card settimana |
| Card diario · Valori, cursore sazietà (`449:852`) | 9,429 → 9,5 | trascurabile |
| Riga pasto diario · Aperta (`449:65`) | campo su `sfondo/card` | il campo aperto passa da bianco a crema in Oggi 2 e Giornate 5 |
| Oggi 2 (`444:1551` → `644:7352`) | istanza Card diario · Pasti al posto delle righe vecchie | identica salvo il campo; `Riga pasto` e `Riga pasto/Compilato` eliminati |
| Account 1 e 3 | `Card nutrizionista` (versione Stati 6) | padding e ordine delle righe cambiano; Account 1 si accorcia di 32 px |
| Account 3 (`499:2580`) e Account 4 (`499:2721`) | "Account" in `App/Accento serif` | titolo in serif |
| Stati 5 e 10 (`552:4376`, `558:4507`) | `App/H1` + "confermata" in serif | titolo sans con una parola in serif |
| Giornate 1–5, Card settimana | 4º giorno "L" → "G" | testo |
| Menu 4, Menu 4.1, Stati 2 | "Entra " → "Entra" | testo |
| Giornate 6, Settembre 2026 (`475:2031` → `644:7439`) | istanza Mese storico | gap 24, raggio 24, intestazione centrata, colonne per giorno della settimana, 31º giorno nascosto |
| Racconta 1 (`459:1089`), Tutorial 1 (`586:5531`) | override ripristinati | titolo settimana al 70 %, fondo barra all'80 % |
| Piano 4.2 (`530:3538` → istanza Etichetta AI) | interlinea automatica | ±1 px |

Eliminati (0 istanze): `Riga pasto` (`439:156`), `Riga pasto/Compilato` (`439:138`), `Giorno prenotazione` (`549:230`).

## Blocco 6 · Ordine e documentazione

- Nomi in italiano: "Button / primary" → "Pulsante primario (a mano)" (2), "card/contatto" → "Card contatto" (3), "whatsapp-row" → "Riga WhatsApp" (3), "segment / active|upcoming" → "Segmento attivo"/"Segmento" (28), "detail-row"/"step-row" → "Riga dettaglio"/"Riga passaggio" (32), "icon/link"/"icon/credit-card" → "Icona … (vuota)" (12, poi sostituiti da istanze: vedi in fondo), `531:3658` → "Card informativa", `508:2724` → "Spazio"; dentro Pannello scelta orario "day-head"/"Chip / slot"/"Tab / …" → "Giorno"/"Chip orario"/"Scheda…" (72).
- Foundations · App nativa: i 6 swatch collegati ai primitivi; "Light green" rinominato "Light green · funnel" (#79D4A6); aggiunti "Light green · app" #79D4BD, "Crema scuro" #F4F0E8, "Rosso iOS" #FF3B30. Testi aggiornati: `414:25` (collezioni e variabili complete), `416:33` (Body details 120 %), `413:100` (regola del funnel, per l'app vale "Icone"), `413:112` (#79D4BD nell'app), `413:95` (card 32/32), `449:1077` (gradiente usato da più card), `413:93`, `413:109`, `413:110`, `413:113` (superate per l'app). Sezioni nuove: "Titoli di pagina", "Scala delle opacità", "Barra di navigazione e barra superiore", "Pulizia del 18/10/2026".
- Descrizioni aggiornate: Barra di navigazione (voce attiva, fondo 80 %, fissa al viewport), Giorno della settimana (L M M G V S D), Segnaposto (altezza libera), Card contenuto (Alta a riempimento), più tutte quelle dei componenti nuovi.

### Librerie community da rimuovere a mano

Material 3 Design Kit, Simple Design System, iOS and iPadOS 26, iOS and iPadOS 27, watchOS 26, visionOS 26, macOS 26, macOS 27: nessun componente del file le usa. Il connettore non può rimuoverle. In Figma: pannello Assets → icona del libro "Libraries" (o Maiusc+I) → scheda del file corrente → per ogni libreria "Remove" (o il pulsante attivo per disattivarla).

## Titoli fuori regola trovati

Corretti: Account 4 (`499:2721`), Stati 5 e 10 (`552:4376`, `558:4507`). Lasciati per lo step 3: "Ti mandiamo un codice" (`425:290`), "Inserisci il codice" (`425:310`), "Scegli una nuova password" (`425:336`), "Questo link non è più valido" (`425:384`): più parole senza accento serif, in `App/H1 Accesso`. Verifica fatta su 100 schermate: 62 titoli a norma, 33 schermate senza titolo di pagina (usano l'Intestazione o non hanno titolo).

## Cosa resta aperto

1. I quattro titoli delle schermate di recupero password (step 3).
2. Card informativa di Piano 4.3, pillola argomenti di Racconta 5/5.1, righe Certificazione di Menu 3, contenitori Selettore: senza componente corrispondente, da decidere.
3. ~~`icon/link` e `icon/credit-card` negli Stati sono frame vuoti~~ Risolto la sera del 18/10/2026: non erano vuoti, vedi "Icone link e carta negli Stati".
4. ~~`Icona / 20 / Argomento · Altro`: nome Lucide da confermare.~~ Risolto: `messages-circle` (vedi in fondo).
5. Dentro Pannello scelta orario restano 4 nodi con nomi inglesi non riconosciuti dallo script.
6. Veli dei pannelli al 25 % sul livello: se servirà una variabile, `velo` = nero 25 %.
7. Librerie community da rimuovere a mano.
8. Oggi 2 usava ancora la vecchia struttura "Frame 10/segments" solo per il campo aperto; ora è istanza. Le schermate Oggi non hanno la barra di navigazione (bozza): invariato.

## Correzioni dopo la verifica di Alessmarc (18/10/2026, sera)

### Barra di navigazione (`493:368` e 26 istanze)

- Causa: 22 istanze su 26 avevano un override del fondo a opacità 100 % (già presente prima della pulizia: nei miei screenshot pre-intervento Piano fisso rende il fondo opaco, 250/248/245 su bianco); il componente e le 4 istanze delle schermate Trasversali erano all'80 %. Il connettore azzera l'opacità di un fill con variabile quando lo si assegna via API, quindi l'80 % non poteva essere ripristinato come opacità del fill.
- Correzione: variabile colore `sfondo/barra` = #FAF8F5 all'80 % (Scuro: #201E1C all'80 %, stesso criterio di `sfondo/card`), collegata al fondo delle 4 varianti e di tutte le 26 istanze, con l'effetto `App/Vetro` verificato su ognuna. Voci inattive: su decisione di Alessmarc restano al 60 % (`icona/secondaria`, `testo/secondario`), come nell'originale: il confronto a pixel tra pre-pulizia e stato attuale del componente e dell'istanza di Piano fisso è identico. Voce selezionata invariata.
- Effetto visivo: le 22 istanze che erano opache passano all'80 % (differenza massima 29 livelli nei confronti, ad es. Revisioni).

### Inventario della trasparenza (verificato nodo per nodo via API)

| Elemento | Stato |
|---|---|
| Veli dei pannelli (21 nodi "Velo") | opacità nel fill: 25 % (17), 40 % nei tutorial (3), 30 % sul livello in Piano 5.2 (1): come nell'originale |
| Effetto vetro Card settimana | `App/Vetro` sul componente e effetto GLASS su tutte le 21 istanze |
| Effetto vetro Barra di navigazione | `App/Vetro` sulle 4 varianti e su 25 istanze; 1 effetto in linea nel mockup di Primo accesso 4 |
| Maniglie | 16 nodi collegati a `maniglia` (15 %) |
| Linee guida dei grafici | 93 nodi a `linea/guida` (8 %) |
| Separatori | 186 istanze di Separatore a `linea/separatore` (6 %) |
| Barre di avanzamento delle revisioni | 5 a `linea/avanzamento` (10 %) |
| Testi secondari | `testo/secondario` 384, `testo/terziario` 142, `testo/attenuato` 59, `testo/corpo-attenuato` 24, `testo/segnaposto` 6, `testo/futuro` 46, `testo/disabilitato` 4 |
| Icone inattive | 172 vettori a `icona/secondaria` (colore pieno dal 18/10/2026 sera, vedi sotto) |
| Opacità di livello rimaste (originali) | pulsante primario disabilitato 40 % (7), frecce e icone copia nelle righe 40 % (51), trattino "oggi" 30 % (21), giorni non condivisi 30 % e "oggi da condividere" 50 % nei grafici (24), pallini 60/30 % (4), hero 40 %, "Quando" 40 % (2), "Scelta" 30 % (2), segnaposto "Salta" 0 % (1) |
| Nodi con doppia attenuazione (variabile con alfa + opacità di livello) | nessuno |

### Giorni non allineati

- Causa: nel componente `Giorno della settimana` le varianti avevano gap diversi tra cerchio e lettera (6 px in Oggi/Futuro/Non condiviso, 6,26 px nelle tre "Condiviso"), mentre le sette istanze annidate nella Card settimana avevano override a 4 solo per alcune: le lettere risultavano a 36 o 38 px dal cerchio a seconda dello stato. Le copie a mano delle schermate Oggi avevano gap 4 ovunque, quindi il disegno originale era a 4.
- Correzione nel componente: gap 4 (`spazio/4`) in tutte e sei le varianti; ogni giorno è alto 51 (32 + 4 + 15) e le lettere stanno alla stessa altezza in tutte le 24 Card settimana. Mese storico: le righe erano già allineate (celle 32 × 32, allineamento in alto; il segnaposto "Vuoto" 40 × 40 della quinta riga è invisibile e c'era anche nell'originale): nessuna modifica. Confronto prima/dopo in `~/Desktop/censimenti-app/step2-giorni-allineati.png`.
- Nota: le colonne della prima settimana di Mese storico partono da sinistra (1–4 di ottobre sotto L–G) sia nel componente sia nell'originale; non è un'altezza ma un allineamento ai giorni della settimana, da decidere a parte.

### Confronti

Sezioni toccate confrontate con lo stato precedente: differenze solo dove previsto (lettere dei giorni nelle Card settimana; fondo della barra all'80 % in Revisioni, Account, Piano; titolo di Account 4). Le schermate "Menu · 7 · Le tue ricette" e "7.1" sono state spostate volutamente da Alessmarc nell'area della sezione Piano: non vanno toccate.

### Aggiornamento `icona/secondaria` (18/10/2026, sera · modifica fatta da Alessmarc e Claude in chat)

- La variabile `icona/secondaria` (`VariableID:617:29`) non è più nero con trasparenza ma un colore pieno: Chiaro #646362 (equivale a nero 60 % su `sfondo/card` #FAF8F5), Scuro #9F9C96 (#F4F0E8 al 60 % su #201E1C). Motivo: con la trasparenza i tratti sovrapposti delle icone Lucide (giunzioni, incroci) risultavano più scuri del resto del tratto. Descrizione aggiornata sulla variabile.
- Verifica in sola lettura: 172 nodi collegati nelle schermate e 44 nei componenti; nessuno ha opacità di fill o di livello, e nessun antenato attenuato. Le icone secondarie sono quindi rese solo dal colore pieno.
- Conseguenza per il codice: `icona/secondaria` va usata come colore opaco; su sfondi diversi da `sfondo/card` il risultato differisce leggermente dal 60 % reale.

### Icone link e carta negli Stati (18/10/2026, sera)

- Causa dell'equivoco: i 12 frame `icon/link` e `icon/credit-card` (poi "Icona … (vuota)") non erano vuoti. Nelle schermate sono coperti dalla barra dei pulsanti fissa in fondo, che simula lo sticky delle call to action: nelle Riga dettaglio (link della videochiamata, pagamento) di Stati 1, 3, 4, 4.1, 4.2 e nelle Riga passaggio di Stati 5 e 10. Nell'app devono esserci, sotto la barra, come nel disegno.
- Tracciati: 20 × 20, due vettori ciascuno, tratto 1,5 arrotondato legato a `icona/primaria`, geometria identica in tutti i 12 frame (lo stesso tratto 1,5 di `Icona / 20 / Email` e `Icona / 20 / Campanella attiva` nelle stesse schermate).
- Componenti nuovi, clonando i vettori di Stati 1: `Icona / 20 / Link` (`657:397`, Lucide link) e `Icona / 20 / Carta` (`657:400`, Lucide credit-card), a x 760 e 800 nella riga delle icone nuove (y 80), descrizione con il nome Lucide. La misura nel nome è 20 e non 24 perché lo schema `Icona / <misura> / <nome>` indica la dimensione reale del tracciato.
- Sostituzioni: 12 istanze allo stesso indice delle righe auto-layout (7 Link: `657:7372`, `657:7378`, `657:7384`, `657:7387`, `657:7393`, `657:7399`, `657:7405`; 5 Carta: `657:7375`, `657:7381`, `657:7390`, `657:7396`, `657:7402`). Nessun frame "(vuota)" residuo.
- Verifica: per ognuno dei 12, PNG esportato prima e dopo (icona a 4×, riga genitore a 2×) identico al byte; sezione Stati (`550:3635`, 4096 px) confrontata pixel per pixel prima e dopo: identica. Pagina componenti: 104 componenti di primo livello (61 icone, 43 di interfaccia).

### Icone Lucide attuali e tratto unico a 20 (18/10/2026, notte · approvato da Alessmarc)

- Il confronto a pixel con l'app (lucide-react-native 1.59.0) ha mostrato 12 componenti disegnati con una versione Lucide precedente. Ridisegnati via connettore con i tracciati Lucide 1.59 (importazione SVG, `viewBox` 24 scalato alla misura, tratto = misura/12, estremità e giunzioni arrotondate, vincoli in scala), conservando nome, misura, descrizione e variabile colore del tratto (icona/primaria; icona/secondaria per Piano): `Icona / 24 / Calendario` (calendar-days), `/ 24 / Calendario semplice` (calendar), `/ 24 / Piano` (file), `/ 24 / Energia` (zap), `/ 24 / Menu`, `/ 24 / Grafico` e `/ 16 / Grafico` (chart-line), `/ 16 / Integrando nuove abitudini` (blocks), `/ 20 / Carta` (credit-card), `/ 20 / Matita` e `/ 32 / Matita` (pencil). Le istanze si sono aggiornate da sole.
- `Icona / 20 / Argomento · Altro`: il disegno (due fumetti tondi sovrapposti) era etichettato `message-circle-reply (da confermare)`; l'icona Lucide attuale corrispondente è **`messages-circle`**, ridisegnata e descritta così.
- Tratto delle icone a 20: tutte a 1,67 (= 20/12). Portate da 1,5 a 1,67 `Icona / 20 / Email`, `/ 20 / Campanella attiva`, `/ 20 / Link` (Carta è stata ridisegnata già a 1,67); descrizioni aggiornate. In app il tratto è unico per misura (`trattoPerMisura`).
- Verifica: 61 icone su 61 entro l'antialiasing nel confronto a 3× (pixel diversi ≤ 3,4 % della cella, scarto massimo ≤ 100 solo sui bordi), vedi `~/Desktop/censimenti-app/step2b-confronti/lotto1/README.md`.
- Voce 4 di "Cosa resta aperto" (nome Lucide di Argomento · Altro): risolta.


## Aggiornamenti del 19/10/2026 (Alessmarc e Claude in chat, dopo il lotto 2 dei componenti)

- Pulsante `Terziario · Caricamento` (`418:56`): padding 12/4 e gap 8 come gli altri stati, altezza minima 46. Nessun salto di layout al cambio di stato. In codice il Pulsante tiene sempre l'etichetta nel layout (invisibile durante il caricamento) e sovrappone i puntini: un pulsante non cambia misura al cambiare di stato o testo.
- Campo di testo e Campo password `Disabilitato` (`418:105`, `418:237`): gap 4 come gli altri stati, altezza 73.
- Icone ridimensionate: le istanze più piccole o più grandi del componente hanno il tratto proporzionale alla misura (2 × misura / 24: 16 → 1,33, 18 → 1,5, 20 → 1,67, 32 → 2,67), 38 nei componenti e 109 nelle schermate. In codice `Icona` applica sempre il tratto della misura effettiva (prop `dimensione`), senza più la deroga del tratto 2.

## Aggiornamenti del 19/10/2026 (sera, dopo il lotto 3 dei componenti)

- Barra di navigazione, variante `Attiva=Piano` (`493:368`): l'icona attiva era rimasta `icona/secondaria`; ora è `icona/primaria` come nelle altre tre varianti. Il codice usa già l'icona primaria per la voce attiva.
- Errore di caricamento (`563:294`): rimossa la proprietà di testo "Titolo", che non aveva nodi; restano Descrizione e il pulsante "Riprova". In codice non è implementata.
- Effetto vetro della Barra di navigazione (decisione di Alessmarc): su iOS vetro nativo (`expo-glass-effect`, Liquid Glass su iOS 26+) con tinta `sfondo/barra`; su Android, dove il vetro nativo non esiste, fondo `sfondo/card` al 90 % senza sfocatura, token di codice `coloriCodice.sfondoBarraAndroid` (`figma-tokens.json` → `coloriCodice`, derivato dalla variabile Figma con alfa 0,9). Non è una variabile in Figma.

