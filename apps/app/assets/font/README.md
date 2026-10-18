# Font con dimensione ottica (DM Sans)

Istanze statiche ricavate il 18/10/2026 dal font variabile ufficiale di Google Fonts
(`google/fonts`, `ofl/dmsans/DMSans[opsz,wght].ttf` e `DMSans-Italic[opsz,wght].ttf`,
versione 4.004) con fontTools 4.67 (`varLib.instancer`), alle dimensioni ottiche che
Figma applica in automatico agli stili grandi (asse `opsz` = corpo del testo, massimo 40):

| File | opsz | wght | Stile Figma |
|---|---|---|---|
| `DMSans_40pt_600SemiBold.ttf` | 40 | 600 | App/Display (44) |
| `DMSans_36pt_600SemiBold.ttf` | 36 | 600 | App/H1 Accesso (36) |
| `DMSans_32pt_400Regular.ttf` | 32 | 400 | App/H1 (32) |

Gli altri stili (compresa App/Citazione, Light Italic 16) usano le istanze predefinite di
`@expo-google-fonts/dm-sans` (dimensione ottica 14), che coincidono con Figma entro lo 0,6 % di
larghezza.

Licenza: SIL Open Font License 1.1 (`OFL-DMSans.txt`). L'OFL di DM Sans non dichiara alcun
Reserved Font Name, quindi le versioni modificate (istanze) possono conservare "DM Sans" nel
nome; per distinguerle dalle istanze predefinite si chiamano "DM Sans 40pt", "DM Sans 36pt",
"DM Sans 32pt" (stesso schema delle istanze statiche distribuite da Google).
Peso aggiunto all'app: 170 KB (3 file, 57 KB ciascuno).

Rigenerazione: scaricare i due file variabili, poi per ogni riga
`fonttools varLib.instancer "DMSans[opsz,wght].ttf" opsz=40 wght=600 -o DMSans_40pt_600SemiBold.ttf`
e rinominare la tabella `name` (famiglia "DM Sans 40pt", stile, PostScript `DMSans-40ptSemiBold`).
