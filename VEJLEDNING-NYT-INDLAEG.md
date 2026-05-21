# Sådan bruger du hjemmesidens admin-panel

Alt hvad du behøver for at tilføje og redigere indlæg på kaareoester.dk foregår via admin-panelet.
Du behøver ikke forstå kode.

---

## Åbn admin-panelet

Gå til **kaareoester.dk/admin/** i din browser og log ind med dit GitHub-token.

> Første gang skal du oprette et token — se vejledningen under "Første gangs opsætning" på siden.

---

## Opret et nyt indlæg

1. Klik på fanen **"✏️ Nyt indlæg"** (er valgt som standard)
2. Udfyld felterne:
   - **Overskrift** — titlen på dit indlæg
   - **Dato** — sættes automatisk til i dag, men kan ændres
   - **Kategori** — sæt hak ved én eller flere kategorier
   - **Forsidebillede** — klik på billedfeltet for at vælge et billede fra din computer (valgfrit)
   - **Tekst** — skriv dit indlæg her
3. Klik på **"Publicer indlæg →"**

Indlægget er synligt på hjemmesiden inden for **1-2 minutter**.

---

## Rediger et eksisterende indlæg

Du kan rette i et indlæg eller tilføje et forsidebillede til et indlæg der ikke har et.

1. Klik på fanen **"📂 Rediger indlæg"**
2. Du ser en liste over alle indlæg — klik på det du vil redigere
3. Formularen udfyldes automatisk med det eksisterende indhold
4. Foretag dine ændringer — du kan fx:
   - Tilføje eller skifte forsidebillede
   - Rette teksten
   - Tilføje eller fjerne kategorier
5. Klik på **"Gem ændringer →"**

Ændringerne er synlige på hjemmesiden inden for **1-2 minutter**.

---

## Kategorier

| Kategori | Bruges til |
|----------|-----------|
| Rejser | Rejsebeskrivelser og oplevelser |
| Projekter | Faglige projekter og samarbejder |
| Udgivelser | Nye bøger og materialer |
| Bøger | Specifikke bøger (brug sammen med Udgivelser) |
| Danmark | Steder og rejser i Danmark |
| Verden | Rejser udenfor Danmark |
| Arktis | Alt om Arktis, Grønland, Svalbard |

Du kan vælge **flere kategorier** til samme indlæg — sæt blot hak ved dem alle.

---

## Formatering af tekst

I tekstfeltet kan du bruge simple koder til at formatere:

| Hvad du skriver | Hvad det giver |
|-----------------|---------------|
| `## Min overskrift` | En underoverskrift |
| `**fed tekst**` | **Fed tekst** |
| `*kursiv tekst*` | *Kursiv tekst* |
| `- punkt` | Punkt i liste |
| `[klikbar tekst](https://...)` | Et link |
| `![billedbeskrivelse](https://...)` | Et billede fra internettet |

---

## Forsidebillede

Forsidebilledet vises på kortet på forsiden og øverst i selve indlægget.

- **Nyt indlæg:** Klik på billedfeltet og vælg et billede fra din computer
- **Eksisterende indlæg:** Gå til "Rediger indlæg", åbn indlægget, og vælg et nyt billede
- Understøttede formater: JPG, PNG, WEBP — max 5 MB

---

## Noget virker ikke?

- Tjek at du er logget ind med et gyldigt token (klik "Skift token" øverst til højre)
- Tjek fanen "Actions" på GitHub for at se om byggeprocessen fejler
- Kontakt Eske for hjælp

---

## Avanceret: Rediger direkte på GitHub

Hvis du foretrækker det, kan du også redigere filer direkte på GitHub:

1. Gå til github.com og log ind
2. Åbn repository'et
3. Gå til mappen `_posts/`
4. Klik på en fil → klik på blyantsikonet (✏️) → rediger → "Commit changes"

Filnavne følger mønsteret: `ÅÅÅÅ-MM-DD-titel.md`
