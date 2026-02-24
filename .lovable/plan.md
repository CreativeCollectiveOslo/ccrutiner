

# Feature 1: Handleliste + Feature 2: Flere billeder (op til 10)

## Oversigt

To nye features tilføjes:
1. **Handleliste** - En delt indkøbsliste på forsiden som alle brugere kan se og redigere
2. **Multi-billede upload** - Alle steder med billedvedhæftning understøtter nu op til 10 billeder

---

## Feature 1: Handleliste

### Database

Ny tabel `shopping_items`:

| Kolonne | Type | Beskrivelse |
|---------|------|-------------|
| id | UUID | Primary key |
| title | TEXT | Varens navn (påkrævet) |
| completed | BOOLEAN | Om varen er købt |
| completed_by | UUID | Hvem der afkrydsede |
| created_by | UUID | Hvem der tilføjede varen |
| created_at | TIMESTAMPTZ | Oprettelsestidspunkt |

RLS-policies:
- Alle autentificerede brugere kan se, oprette, opdatere og slette items

### UI

- Ny tab "Handleliste" i tab-baren på forsiden (ved siden af Vakter, Notifikationer, Logbog)
- Simpel liste med:
  - Inputfelt til at tilføje nye varer
  - Checkboxes til at markere varer som købt
  - Afkrydsede varer vises med gennemstreget tekst og gråtonet
  - Knap til at fjerne afkrydsede varer
  - Visning af hvem der tilføjede/afkrydsede en vare

### Filer

| Fil | Ændring |
|-----|---------|
| Database migration | Ny `shopping_items` tabel |
| `src/components/ShoppingList.tsx` | Ny komponent |
| `src/pages/EmployeeDashboard.tsx` | Tilføj ny tab + ShoppingList |

---

## Feature 2: Flere billeder (op til 10)

### Database

Ændre kolonnerne fra enkelt-URL til JSON-array:

- `routines.multimedia_url` (TEXT) -> beholdes som TEXT men bruges som kommasepareret liste, ELLER vi tilføjer en ny `image_urls` TEXT[] kolonne
- `announcements.image_url` -> `image_urls TEXT[]`
- `bulletin_posts.image_url` -> `image_urls TEXT[]`

**Valgt tilgang**: Tilføj nye `image_urls TEXT[]` kolonner og behold de gamle for bagudkompatibilitet. Koden læser begge og skriver kun til den nye.

### Komponent-ændringer

**ImageUpload** opdateres til multi-billede:
- Ny prop `maxImages` (default 10)
- Ændret interface: `currentUrls: string[]` og `onImagesChanged: (urls: string[]) => void`
- Viser et grid af thumbnails med mulighed for at fjerne individuelle billeder
- "Tilføj billede"-knap forsvinder når max er nået

**ImageDisplay** opdateres til at vise galleri:
- Modtager `urls: string[]`
- Viser thumbnails i et grid
- Klik for at åbne lightbox med navigation mellem billeder

### Filer der ændres

| Fil | Ændring |
|-----|---------|
| Database migration | Tilføj `image_urls` kolonner |
| `src/components/ImageUpload.tsx` | Multi-billede support |
| `src/components/BulletinBoard.tsx` | Brug nye multi-billede props |
| `src/components/AnnouncementManager.tsx` | Brug nye multi-billede props |
| `src/components/SectionManager.tsx` | Brug nye multi-billede props |
| `src/pages/EmployeeDashboard.tsx` | Vis billede-gallerier |
| `src/components/NotificationsTab.tsx` | Vis billede-gallerier |

---

## Tekniske detaljer

### Shopping Items tabel SQL

```sql
CREATE TABLE shopping_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_by UUID REFERENCES auth.users(id),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE shopping_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view shopping items"
  ON shopping_items FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert shopping items"
  ON shopping_items FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update shopping items"
  ON shopping_items FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete shopping items"
  ON shopping_items FOR DELETE
  USING (auth.uid() IS NOT NULL);
```

### Multi-billede migration SQL

```sql
ALTER TABLE announcements ADD COLUMN image_urls TEXT[] DEFAULT '{}';
ALTER TABLE bulletin_posts ADD COLUMN image_urls TEXT[] DEFAULT '{}';
ALTER TABLE routines ADD COLUMN image_urls TEXT[] DEFAULT '{}';

-- Migrer eksisterende data
UPDATE announcements SET image_urls = ARRAY[image_url] WHERE image_url IS NOT NULL;
UPDATE bulletin_posts SET image_urls = ARRAY[image_url] WHERE image_url IS NOT NULL;
UPDATE routines SET image_urls = ARRAY[multimedia_url] WHERE multimedia_url IS NOT NULL;
```

### ImageUpload ny interface

```typescript
// Multi-billede version
interface MultiImageUploadProps {
  folder: "routines" | "announcements" | "bulletin";
  currentUrls: string[];
  onImagesChanged: (urls: string[]) => void;
  maxImages?: number; // default 10
}
```

### Handleliste UI-struktur

```text
┌─────────────────────────────────────┐
│  Handleliste                        │
├─────────────────────────────────────┤
│  [Tilføj vare...        ] [+]       │
│                                     │
│  ☐ Mælk          (tilføjet af Ana)  │
│  ☐ Brød          (tilføjet af Bo)   │
│  ☑ Smør          (købt af Ana)      │
│                                     │
│  [Fjern afkrydsede]                 │
└─────────────────────────────────────┘
```

