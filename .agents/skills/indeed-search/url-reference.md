# Indeed Jobs URL Reference

Riferimento tecnico degli endpoint pubblici e non autenticati utilizzati da questo skill per Indeed Italia.

## Search

```
GET https://it.indeed.com/jobs
```

Query params principali:

| Parametro | Significato | Esempio |
|-----------|-------------|---------|
| `q` | Parola chiave di ricerca (ruolo, tecnologia) | `.net` |
| `l` | Località ("Da Remoto", città o regione) | `Da Remoto` · `Milano` |
| `fromage` | Finestra temporale di pubblicazione (giorni) | `7` (ultimi 7 giorni) · `14` (ultime due settimane) |
| `start` | Offset di paginazione (multipli di 10) | `0`, `10`, `20`, … |

La pagina restituita contiene l'HTML dei risultati di ricerca. La CLI estrae gli annunci analizzando il blocco JSON globale caricato nel markup sotto la variabile `window.mosaic.providerData["mosaic-provider-jobcards"]` o i blocchi `<script type="application/ld+json">`.

---

## Detail

```
GET https://it.indeed.com/viewjob
```

Query params:

| Parametro | Significato | Esempio |
|-----------|-------------|---------|
| `jk` | Codice univoco alfanumerico dell'annuncio (Job Key) | `b6c534ea757d54c7` |

La pagina di dettaglio di un singolo annuncio (`https://it.indeed.com/viewjob?jk=<id>`) contiene un tag `<script type="application/ld+json">` con lo schema strutturato standard `JobPosting`. La CLI lo analizza per estrarre:
* Titolo (`title`)
* Nome azienda (`hiringOrganization.name`)
* Località (`jobLocation.address.addressLocality`)
* Data di pubblicazione (`datePosted`)
* Descrizione testuale (`description`)
* Link diretto alla candidatura (`url` / `applyUrl`)
