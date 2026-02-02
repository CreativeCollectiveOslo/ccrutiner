
# Opslagstavle til Medarbejder Dashboard

## Oversigt
Tilføjer en ny "Opslagstavle" fane på forsiden af medarbejder-dashboardet, hvor alle brugere kan skrive indlæg og se andres indlæg. Brugere kan redigere deres egne indlæg. Indlæg kan ikke slettes og vises med nyeste først, med paginering hvis der er mange.

## Hvad der ændres for dig

### Ny funktionalitet
- En ny fane "Opslagstavle" på forsiden (ved siden af "Vakter" og "Læste notifikationer")
- Du kan skrive og dele indlæg med alle kolleger
- Du kan redigere dine egne indlæg
- Du kan se alle indlæg fra andre brugere
- Nyeste indlæg vises i toppen
- Der vises hvem der har skrevet hvert indlæg og hvornår
- Hvis der er mange indlæg, kan du bladre igennem med "side frem/tilbage"

### Brugeroplevelse
- Skriv dit indlæg i et tekstfelt og klik "Del indlæg"
- Indlæg vises med forfatterens navn og dato
- Ved dine egne indlæg vises en "Rediger" knap
- Ingen kan slette indlæg - de er permanente
- 10 indlæg per side med paginering

---

## Tekniske detaljer

### 1. Database: Ny tabel til indlæg

Opretter en `bulletin_posts` tabel:
- `id` (uuid) - unik identifikator
- `user_id` (uuid) - hvem skrev indlægget
- `message` (text) - selve indlægget
- `created_at` (timestamp) - hvornår det blev oprettet
- `updated_at` (timestamp) - hvornår det sidst blev redigeret

Sikkerhedsregler (RLS):
- SELECT: Alle autentificerede brugere kan læse alle indlæg
- INSERT: Brugere kan kun oprette indlæg i eget navn
- UPDATE: Brugere kan kun redigere egne indlæg
- DELETE: Ingen kan slette (ingen policy)

SQL-migration:
```sql
CREATE TABLE public.bulletin_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  message text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.bulletin_posts ENABLE ROW LEVEL SECURITY;

-- Alle autentificerede brugere kan se alle indlæg
CREATE POLICY "Authenticated users can view all bulletin posts"
  ON public.bulletin_posts FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Brugere kan kun oprette indlæg i eget navn
CREATE POLICY "Users can insert own bulletin posts"
  ON public.bulletin_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Brugere kan kun redigere egne indlæg
CREATE POLICY "Users can update own bulletin posts"
  ON public.bulletin_posts FOR UPDATE
  USING (auth.uid() = user_id);

-- Trigger til at opdatere updated_at ved ændringer
CREATE TRIGGER update_bulletin_posts_updated_at
  BEFORE UPDATE ON public.bulletin_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### 2. Ny komponent: BulletinBoard.tsx

Opretter en ny komponent `src/components/BulletinBoard.tsx` der håndterer:
- Hentning af indlæg med paginering (10 per side)
- Visning af indlæg med forfatter og dato
- Formular til at skrive nye indlæg
- Redigering af egne indlæg (inline editing)
- Empty state når der ingen indlæg er
- Paginering med eksisterende Pagination-komponenter

Struktur:
```text
+-------------------------------------+
| Skriv et indlaeg                    |
| +----------------------------------+|
| | [Tekstfelt...]                   ||
| +----------------------------------+|
| [Del indlaeg]                       |
+-------------------------------------+
|                                     |
| +----------------------------------+|
| | Indlaeg fra bruger         [Red] || <-- Kun synlig hvis eget indlaeg
| | "Husk at tjekke koeleskabet..."  ||
| | 2. februar 2026 - Af Anna        ||
| +----------------------------------+|
|                                     |
| +----------------------------------+|
| | Indlaeg fra bruger               ||
| | "God vagt alle sammen!"          ||
| | 1. februar 2026 - Af Peter       ||
| +----------------------------------+|
|                                     |
|      <- Forrige | 1 | 2 | Naeste ->|
+-------------------------------------+
```

Redigeringstilstand:
```text
+-------------------------------------+
| +----------------------------------+|
| | [Tekstfelt med eksisterende...] ||
| | [Gem] [Annuller]                 ||
| +----------------------------------+|
+-------------------------------------+
```

Empty state:
```text
+-------------------------------------+
|          (clipboard icon)           |
|   Ingen indlaeg endnu               |
|   Vaer den foerste til at skrive!   |
+-------------------------------------+
```

### 3. Frontend: Opdateret EmployeeDashboard.tsx

**AEndringer:**
- Tilfoej ny tab "Opslagstavle" i tab-baren (ved siden af "Vakter" og "Laeste notifikationer")
- Importere og rendere BulletinBoard-komponenten naar tabben er aktiv
- Tilfoej `ClipboardList` icon fra lucide-react

Tab-struktur:
```text
+------------+---------------------+--------------+
|  Vakter    | Laeste notifikationer| Opslagstavle |
+------------+---------------------+--------------+
```

### 4. Implementeringsraekkefoelge

1. Oprette `bulletin_posts` tabel med RLS-policies
2. Oprette ny `BulletinBoard.tsx` komponent med:
   - Fetch indlaeg med paginering
   - Formular til nyt indlaeg
   - Visning af indlaeg
   - Redigering af egne indlaeg
   - Empty state
   - Paginering
3. Tilfoeje ny tab i EmployeeDashboard.tsx
4. Importere og rendere BulletinBoard komponenten

### 5. Paginering detaljer

- 10 indlaeg per side
- Bruger Supabase `.range()` til server-side paginering
- Henter total count med `.count()` for at beregne antal sider
- Viser kun paginering hvis der er mere end 1 side

### 6. Redigering detaljer

- "Rediger" knap vises kun paa egne indlaeg
- Ved klik skiftes til redigeringstilstand med tekstfelt
- "Gem" opdaterer indlaegget og lukker redigeringstilstand
- "Annuller" lukker redigeringstilstand uden at gemme
- `updated_at` opdateres automatisk via database trigger
- Viser "(redigeret)" tekst hvis `updated_at` er forskellig fra `created_at`
