# Controllo impianto — demo per il cliente

Anteprima **statica e interattiva** dell'interfaccia Web HMI per la gestione di 32 utenze e fasce settimanali.

## Pubblicazione su GitHub Pages

1. Crea un repository GitHub (es. `demo-controllo-impianto`).
2. Carica **nella radice del repository** i tre file `index.html`, `style.css` e `demo.js` (puoi includere anche questo README).
3. Apri **Settings → Pages**.
4. In **Build and deployment** scegli **Deploy from a branch**, branch **main**, cartella **/(root)** e salva.
5. Attendi il completamento della pubblicazione. Il link avrà normalmente la forma `https://TUO-UTENTE.github.io/demo-controllo-impianto/`.

Non sono necessari Node.js, PHP, database, certificati o credenziali.

## Cosa può fare il cliente

- Navigare dashboard, programmazione, elenco utenze e spiegazione.
- Selezionare una delle 32 utenze.
- Cambiare descrizione, tipo, abilitazione e fasce orarie (7 giorni, fino a 10 fasce).
- Copiare una giornata sui giorni lavorativi, annullare la bozza, confermare.
- Vedere l'effetto dimostrativo sugli stati calcolati in base all'orario del browser.

## Limitazioni e sicurezza

**È una demo, non un controllo impianto.** Non contiene `plc.js`, proxy, password, token, IP PLC, certificati, dati di produzione o chiamate alle Web API Siemens.

Le modifiche sono salvate **solo nel localStorage del browser**; ogni browser/dispositivo vede i propri dati. Nessuna modifica viene inviata a un PLC. Gli stati sono simulati, non misure reali. La validazione degli orari è semplificata e non rappresenta tutte le regole SCL del sistema reale. Le modalità "Impulsiva" e "Durata" sono illustrate graficamente ma non ne simulano la logica temporale specifica.

Per ripristinare i dati iniziali: **Come funziona → Ripristina dati dimostrativi**.

## Distribuzione

Questa versione è pensata per essere pubblicata come repository **pubblico**. Prima di pubblicare, personalizza nomi di utenze e riferimenti aziendali secondo quanto autorizzato dal cliente. Nessun file del progetto PLC originale è richiesto.
