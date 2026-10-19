# Account di prova per gli stati del cliente

Decisione del 19/10/2026 (step 3). Tutti gli alias sono `aless.marchetto6+<tag>@gmail.com`;
le password non sono annotate qui. Le scritture sul database le applica la chat di progetto
(proposta e SQL in `~/Desktop/censimenti-app/step3-account-prova.md`). Nessun account di
prova deve ricevere email di prenotazione, eventi Google o profili Klaviyo: per questo lo
stato F (consulenza futura) è rimandato allo step 12, per non occupare il calendario di una
nutrizionista reale.

| Stato | Schermata | Alias | Come si ottiene |
|---|---|---|---|
| A | Login | nessuno | app senza sessione |
| B | Email non confermata | `+capi1` | utente auth non confermato, `clients.status = not_confirmed` (già così) |
| C | Consulenza da confermare | `+testdmarc` | dopo la prova di D: slot desiderato del lead spostato nel futuro |
| D | Orario passato senza conferma | `+testdmarc` | `not_confirmed` con slot del lead passato (già così) |
| E | Orario non più disponibile | — | transitorio (esito della RPC), non si prepara con i dati |
| F | Prenotato, prima della consulenza | — | rimandato allo step 12 |
| G | Appena prenotata | — | stato di interfaccia, dallo step 12 |
| H | Percorso non ancora attivo | `+test` (consulenza `completed`) e `+test2` (`scheduled` passata, euristica dei 45 minuti) | già così |
| I | Consulenza non svolta | `+test7` | unico appuntamento messo a `no_show` |
| J | Abbonato | account personale di Alessmarc | non si tocca |
| K | Percorso concluso | `+test3` | `clients.status = churned` (da `booked`: Klaviyo ignora la transizione) |
| L | Account non collegato | `+orfano` | utente auth creato da Alessmarc in dashboard (conferma automatica), senza riga `clients` |

Nutrizioniste assegnate agli alias: profili reali e attivi (Nanni, Gritti, Chiadò, Veneziano,
Damiani, Zobbi, Boselli, Pinzani); nessuna delle operazioni sopra invia loro email o inviti.
Per entrare nell'app con un alias serve la sua password (impostabile dalla dashboard Auth
senza email).
