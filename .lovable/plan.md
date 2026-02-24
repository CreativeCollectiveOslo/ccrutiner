
# Bedre overblik over rutiner i Admin Dashboard

## Problem

Rutinevisningen viser alle sektioner og rutiner i en lang flad liste. Når der er mange vakter med mange sektioner, bliver det svært at overskue. Vagt-sidebaren og rutineområdet har heller ikke tydelig visuel adskillelse.

## Foreslåede forbedringer

### 1. Collapsible sektioner (accordion)

Sektioner kan foldes sammen/ud, så admin kun ser det relevante. Standard: alle åbne. Klik på sektionens header folder den sammen.

- Sparer vertikal plads
- Admin kan fokusere på en sektion ad gangen
- Rutineantal vises altid i header, selv når foldet sammen

### 2. Tydeligere informationshierarki

Nuvarande hierarki er for fladt. Foreslået ændring:

| Element | Nu | Forslag |
|---------|-----|---------|
| Vagt-titel | `text-xl` | `text-lg font-semibold` + vagt-farve som accent |
| Sektions-header | `font-medium` med ikon | `text-sm font-semibold uppercase tracking-wide text-muted-foreground` (label-stil) |
| Rutine-titel | `text-sm font-medium` | Uændret (allerede korrekt niveau) |
| Statistik under vagt-titel | `text-sm text-muted-foreground` | Tilføj ikon og tydeliggør med antal pr. sektion |

### 3. Bedre vagt-sidebar

- Aktiv vagt markeres tydeligere med en farvet venstre-kant
- Vis antal rutiner pr. vagt som en lille badge
- Tilføj vagtens farvekode som visuel indikator

### 4. Visuelt adskilt sektions-header

Sektions-headers får en subtil baggrund og tydeligere adskillelse fra rutinekortene, så de fungerer som tydelige "skillevægge".

---

## Teknisk plan

### Filer der ændres

**`src/components/SectionManager.tsx`**

1. Importer `Collapsible`, `CollapsibleContent`, `CollapsibleTrigger` fra Radix
2. Wrap hver sektion i en `Collapsible` med en header-trigger
3. Opdater sektions-header styling:
   - Baggrund: `bg-muted/50` med `rounded-t-lg`
   - Tekst: `text-xs font-semibold uppercase tracking-wider text-muted-foreground`
   - ChevronDown/Up ikon der roterer ved fold
4. Opdater vagt-header: tilføj opsummering med antal pr. sektion
5. Giv "Usorterede rutiner" samme collapsible-behandling

**`src/pages/AdminDashboard.tsx`**

1. Forbedre vagt-knapper i sidebar:
   - Vis rutineantal som badge
   - Tilføj vagtens `color_code` som en farvet venstre-kant på den aktive knap
2. Tilføj lidt mere spacing og en divider mellem sidebar-header og knapper

### Ingen database-ændringer

Alle ændringer er rent visuelle/UI.
