

# Omdøb Opslagstavle til Logbog + tilføj overskrift

## Oversigt

Denne ændring omdøber "Opslagstavle" til "Logbog" i hele appen og tilføjer et overskriftsfelt til alle logbog-indlæg.

---

## Ændringer

### 1. UI-tekst ændringer

**Filen `EmployeeDashboard.tsx`:**
- Ændre tab-teksten fra "Opslagstavle" til "Logbog"

**Filen `SearchDialog.tsx`:**
- Ændre søgeresultat-overskriften fra "Opslagstavle" til "Logbog"

**Filen `BulletinBoard.tsx`:**
- Opdatere formular-labels og placeholders til at reflektere "Logbog"
- Ændre "Skriv et indlæg" til "Skriv i logbogen"
- Ændre empty state tekster

### 2. Database-ændring

Tilføj en `title` kolonne til `bulletin_posts` tabellen:

```sql
ALTER TABLE bulletin_posts 
ADD COLUMN title TEXT NOT NULL DEFAULT '';
```

### 3. Formular-opdatering (BulletinBoard.tsx)

Tilføj et input-felt til overskrift:
- Nyt `Input` felt til overskrift (påkrævet)
- Opdater state til at håndtere `newTitle` og `editTitle`
- Opdater insert og update queries til at inkludere title

### 4. Visning af indlæg

Vis overskriften som en fed titel over hvert indlæg:
- Overskrift vises med `font-semibold` styling
- Besked vises under overskriften som før

---

## Filer der ændres

| Fil | Ændring |
|-----|---------|
| `src/pages/EmployeeDashboard.tsx` | Omdøb tab fra "Opslagstavle" til "Logbog" |
| `src/components/SearchDialog.tsx` | Omdøb søgekategori til "Logbog" |
| `src/components/BulletinBoard.tsx` | Tilføj overskriftsfelt + opdater tekster |
| Database migration | Tilføj `title` kolonne til `bulletin_posts` |

---

## Tekniske detaljer

### Ny formular-struktur

```text
┌─────────────────────────────────────┐
│  Skriv i logbogen                   │
├─────────────────────────────────────┤
│  Overskrift: [________________]     │
│                                     │
│  Besked:                            │
│  ┌─────────────────────────────┐    │
│  │                             │    │
│  │                             │    │
│  └─────────────────────────────┘    │
│                                     │
│  [Tilføj til logbog]                │
└─────────────────────────────────────┘
```

### Visning af indlæg

```text
┌─────────────────────────────────────┐
│  Bruger navn                    ✏️  │
│                                     │
│  **Overskrift her**                 │
│  Besked tekst her...                │
│                                     │
│  2. februar 2026 kl. 15:30          │
└─────────────────────────────────────┘
```

### Database migration SQL

```sql
-- Tilføj title kolonne med default værdi for eksisterende data
ALTER TABLE bulletin_posts 
ADD COLUMN title TEXT NOT NULL DEFAULT '';

-- Opdater eksisterende posts med en standard-overskrift baseret på beskedens første linje
UPDATE bulletin_posts 
SET title = CASE 
  WHEN position(chr(10) in message) > 0 
  THEN left(message, position(chr(10) in message) - 1)
  ELSE left(message, 50)
END
WHERE title = '';
```

---

## Søgefunktion

Søgefunktionen opdateres til også at søge i overskrifter, så brugere kan finde logbog-indlæg baseret på både titel og besked.

