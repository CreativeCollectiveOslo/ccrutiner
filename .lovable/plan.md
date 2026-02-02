
# Design Oprydning

## Oversigt
En gennemgående gennemgang af hele appen for at sikre konsistent spacing, klar hierarkisk struktur og minimale tekststile. Dette vil give en mere professionel og samlet brugeroplevelse.

---

## Identificerede problemer

### 1. Inkonsistent spacing
- **Headers**: Varierende padding (`py-4`, `py-8`) på forskellige sider
- **Cards**: Blandet brug af `p-3`, `p-4`, `p-6`, `pt-6`
- **Sektioner**: Nogle bruger `space-y-4`, andre `space-y-6`
- **Main container**: Varierer mellem `py-8` og andre værdier

### 2. Inkonsistent teksthierarki
- **Overskrifter**: Blanding af `text-xl`, `text-2xl` for samme niveau
- **Labels/descriptions**: Inkonsistent brug af `text-sm`, `text-xs`
- **Font-weight**: Blanding af `font-medium`, `font-semibold` for samme type elementer

### 3. Inkonsistente komponentstile
- **Tab-styling**: Admin-tabs og Employee-tabs har forskellig styling
- **Kort-indhold**: Forskellige CardContent padding-værdier
- **Knapper**: Inkonsistent størrelse og placering

---

## Løsningsplan

### 1. Standardiseret spacing-system

**Header (alle sider):**
- Container: `px-4 py-4`
- Logo + titel gap: `gap-3`

**Main content:**
- Container: `px-4 py-6` (mobil) / `py-8` (desktop) 
- Section spacing: `space-y-6` (konsistent)
- Card spacing i lister: `space-y-4`

**Cards:**
- CardHeader: standard (beholder shadcn default)
- CardContent: `p-4` som standard
- Kompakte kort (rutiner/posts): `p-4`

### 2. Standardiseret teksthierarki

**Niveau 1 - Sidetitler:**
- `text-xl` (h1 i header)

**Niveau 2 - Sektionsoverskrifter:**
- `text-lg` eller `text-xl` for CardTitle
- Ingen font-weight override (bruger font-display fra design system)

**Niveau 3 - Korttitler/labels:**
- `text-sm font-medium`

**Niveau 4 - Body tekst:**
- `text-sm` for normal tekst
- `text-sm text-muted-foreground` for beskrivelser

**Niveau 5 - Metadata:**
- `text-xs text-muted-foreground`

### 3. Konsistente tabs

Ensartet tab-styling på tværs af Admin og Employee dashboards:
- Desktop: `px-4 py-2 text-sm font-medium`
- Mobil: `flex-1 px-2 py-3 text-xs` med ikoner

---

## Filer der skal opdateres

### EmployeeDashboard.tsx
- Standardiser main padding til `py-6`
- Ensret sektionsoverskrifter til `text-lg`
- Fjern inkonsistente `space-y-2` til fordel for `space-y-4`
- Standardiser "Tilbake" knap styling

### AdminDashboard.tsx
- Matcher header styling med EmployeeDashboard
- Ensret tab-styling med employee version
- Standardiser CardContent padding

### BulletinBoard.tsx
- Ensret CardContent til `p-4` (allerede gjort)
- Standardiser empty state padding til `py-12` og centered tekst

### NotificationsTab.tsx
- Standardiser CardContent til `p-4`
- Ensret badge styling
- Konsistent metadata format

### UnreadNotificationsBanner.tsx
- Matcher NotificationsTab styling
- Ensret spacing

### Auth.tsx
- Allerede velstruktureret, mindre justeringer

### SectionManager.tsx
- Standardiser CardContent padding
- Ensret overskrift hierarki

### AnnouncementManager.tsx
- Standardiser CardContent padding (ændre `pt-6` til `p-4`)
- Ensret overskrift hierarki

---

## Specifikke ændringer

### EmployeeDashboard.tsx

1. **Main container** (linje 480):
   - Ændre `py-8` til `py-6` for bedre mobil spacing

2. **Vagt-valg sektion** (linje 547-552):
   - Ændre `text-2xl` til `text-xl` for konsistens
   - Behold `text-sm text-muted-foreground` for undertekst

3. **Vagt-detaljer header** (linje 599-602):
   - Ændre `text-2xl` til `text-xl`
   - Grupper wake-lock og clear-button tættere sammen

4. **Sektions-overskrifter** (linje 737):
   - Ændre `text-base font-medium` til `text-sm font-semibold uppercase tracking-wide text-muted-foreground` for klarere hierarki

5. **Rutine-kort**:
   - Behold `p-4` (allerede korrekt)
   - Sørg for konsistent `space-y-1` i indholdet

### AdminDashboard.tsx

1. **Tab-styling** (linje 308-348):
   - Tilføj responsive klasser som i EmployeeDashboard
   - `flex-1` på hver tab for bedre mobil

2. **Bruger-kort** (linje 426-472):
   - Ændre `p-4` til konsistent padding
   - Allerede godt struktureret

3. **CardContent** (linje 378):
   - Tilføj eksplicit `p-4` for konsistens

### BulletinBoard.tsx

1. **Post-kort** (linje 217-218):
   - Allerede `p-4` - korrekt

2. **Empty state** (linje 205-213):
   - Ændre `p-12` til `py-12 px-4` for responsivitet

### NotificationsTab.tsx

1. **Notification kort** (linje 239):
   - Allerede `p-4` - korrekt

2. **Empty state** (linje 221-226):
   - Ændre `p-6` til `py-12` for at matche BulletinBoard

### AnnouncementManager.tsx

1. **Announcement kort** (linje 379):
   - Ændre `pt-6` til `p-4` for konsistens

2. **Routine notification kort** (linje 457):
   - Ændre `pt-6` til `p-4` for konsistens

---

## Implementeringsrækkefølge

1. Start med EmployeeDashboard.tsx - hovedsiden
2. Opdater AdminDashboard.tsx til at matche
3. Gennemgå og opdater BulletinBoard.tsx
4. Gennemgå og opdater NotificationsTab.tsx  
5. Opdater UnreadNotificationsBanner.tsx
6. Opdater AnnouncementManager.tsx
7. Opdater SectionManager.tsx
8. Verificer Auth.tsx

---

## Design tokens (reference)

For fremtidig konsistens, her er de standardiserede værdier:

```text
SPACING:
- Container padding: px-4
- Section spacing: space-y-6
- Card list spacing: space-y-4
- Inner card spacing: space-y-3
- Content padding: p-4

TYPOGRAPHY:
- Page title: text-xl (font-display via h1)
- Section header: text-lg (font-display via h2/h3)
- Card title: text-sm font-medium
- Body: text-sm
- Description: text-sm text-muted-foreground  
- Metadata: text-xs text-muted-foreground

COMPONENTS:
- Tabs: flex-1 px-2 py-3 text-xs (mobil), px-4 py-2 text-sm (desktop)
- Cards: rounded-lg border, CardContent p-4
- Empty states: py-12 text-center
```
