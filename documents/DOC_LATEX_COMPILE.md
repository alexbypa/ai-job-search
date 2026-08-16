# Guida alla Compilazione LaTeX con MiKTeX (Windows)

Questa guida spiega come installare ed utilizzare **MiKTeX** per compilare i file dei CV (LaTeX `moderncv`) e delle Lettere di Presentazione (`cover.cls`) generati in questo progetto.

---

## 1. Installazione di MiKTeX

1. Scarica il programma di installazione dal sito ufficiale: [MiKTeX Downloads](https://miktex.org/download) (scegli l'installer per Windows, es. `basic-miktex-*.exe`).
2. Avvia l'installazione e segui la procedura standard. Puoi installarlo sia per il solo utente corrente che per tutti gli utenti (richiede diritti di amministratore).

---

## 2. Configurazione dell'Auto-Installazione Silenziosa (Cruciale)

Di default, MiKTeX installa i pacchetti mancanti "on demand" ma mostra una finestra popup di conferma per ciascuno di essi. Questo blocca qualsiasi esecuzione automatica o script in background (compresi i comandi eseguiti dall'AI).

Per forzare l'installazione automatica silenziosa dei pacchetti mancanti, apri **PowerShell** ed esegui i seguenti comandi:

```powershell
# Se hai installato MiKTeX per tutti gli utenti (esegui come Amministratore):
initexmf --admin --set-config-value=[MPM]AutoInstall=1

# Se hai installato MiKTeX solo per il tuo utente:
initexmf --set-config-value=[MPM]AutoInstall=1
```
*(Nota: eseguire entrambi i comandi è del tutto sicuro ed evita problemi).*

### Pre-installazione manuale dei pacchetti (Opzione consigliata)
Se preferisci evitare l'installazione on-the-fly e configurare tutto subito, puoi installare i pacchetti necessari per i nostri template in un colpo solo con questo comando:

```powershell
mpm --install=moderncv --install=fontawesome5 --install=fontawesome6 --install=academicons --install=import --install=luatexbase --install=pgf --install=titlesec --install=textpos --install=xltxtra --install=xunicode --install=cite --install=realscripts --install=needspace
```
*(Aggiungi `--admin` all'inizio del comando se hai eseguito l'installazione globale di MiKTeX).*

---

## 3. Comandi di Compilazione dei Documenti

Una volta configurato MiKTeX, puoi compilare i sorgenti `.tex` in file PDF pronti all'uso tramite PowerShell.

### A. Compilare il CV
Il CV utilizza lo stile `moderncv` e deve essere compilato con **lualatex** (poiché pdflatex genera spesso errori con i font fontawesome su MiKTeX).

```powershell
# 1. Spostati nella cartella cv
Set-Location cv

# 2. Compila con lualatex
lualatex -interaction=nonstopmode -halt-on-error main_generali_csharp.tex

# 3. Torna alla radice del progetto
Set-Location ..
```
Il PDF risultante verrà generato in `cv/main_generali_csharp.pdf`.

### B. Compilare la Lettera di Presentazione
La lettera utilizza la classe `cover.cls` che richiede pacchetti di gestione dei font moderni (`fontspec`). Deve essere compilata con **xelatex**.

```powershell
# 1. Spostati nella cartella cover_letters
Set-Location cover_letters

# 2. Compila con xelatex
xelatex -interaction=nonstopmode -halt-on-error cover_generali_csharp.tex

# 3. Torna alla radice del progetto
Set-Location ..
```
Il PDF risultante verrà generato in `cover_letters/cover_generali_csharp.pdf`.

---

## 4. Verifica dei PDF (Checklist di Qualità)
Dopo la compilazione, verifica sempre che:
1. Il **CV sia esattamente di 2 pagine** (nella classe moderncv, una terza pagina vuota o con poche righe rimaste è considerata non professionale).
2. La **Lettera di Presentazione sia esattamente di 1 pagina**.
3. I caratteri accentati ed i link (URL, Email) funzionino correttamente ed estraggono testo leggibile.
