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
| E | Orario non più disponibile | `+testdmarc` | transitorio: esito `slot_taken`/`day_full` della conferma (riga fittizia in `appointments` alla stessa ora, censimento step 12 §8) o elenco degli orari vuoto |
| F | Prenotato, prima della consulenza | `+testdmarc` dopo la conferma nell'app | la conferma crea l'appuntamento vero: la nutrizionista dell'alias deve essere "Alessandra Marchina" o "Guest Test" (censimento step 12 §8, SQL dalla chat di progetto) |
| G | Appena prenotata | `+testdmarc` | stato di interfaccia subito dopo la conferma fatta nell'app (step 12) |
| H | Percorso non ancora attivo | `+test` (consulenza `completed`) e `+test2` (`scheduled` passata, euristica dei 45 minuti) | già così |
| I | Consulenza non svolta | `+test7` | unico appuntamento messo a `no_show` |
| J | Abbonato | `+test4` (per il diario) | già `subscribed`, senza diari né revisioni; vedi sotto |
| K | Percorso concluso | `+test3` | `clients.status = churned` (da `booked`: Klaviyo ignora la transizione) |
| L | Account non collegato | `+orfano` | utente auth creato da Alessmarc in dashboard (conferma automatica), senza riga `clients` |

Nutrizioniste assegnate agli alias: profili reali e attivi (Nanni, Gritti, Chiadò, Veneziano,
Damiani, Zobbi, Boselli, Pinzani); nessuna delle operazioni sopra invia loro email o inviti.
Per entrare nell'app con un alias serve la sua password (impostabile dalla dashboard Auth
senza email).

## Diario (stato J, step 5)

Decisione del 19/10/2026 (censimento `~/Desktop/censimenti-app/step5-censimento-diario.md`, §9).

- Per scrivere e condividere diari di prova si usa **`+test4`**: riga `clients` con l'alias
  `aless.marchetto6+test4@gmail.com`, già `subscribed` (nessuna transizione di stato, quindi niente
  Klaviyo né nuova visita di controllo), senza diari né revisioni (il primo diario condiviso crea la
  revisione n. 1 pulita). L'utente auth collegato ha un'email diversa dall'alias: si accede con
  **`alessandro@test16.com`** (password impostata dalla dashboard Auth).
- La nutrizionista assegnata è **"Alessandra Marchina"**, cioè il profilo CRM di Alessandro stesso:
  diari, commenti e revisioni sbloccate restano nella sua coda.
- L'**account personale abbonato** di Alessmarc (email base `aless.marchetto6@gmail.com`) **non si usa**
  per scrivere diari: è assegnato a una nutrizionista reale (Marta Veneziano) e ogni diario condiviso
  le entrerebbe in coda e farebbe avanzare la sua revisione.
