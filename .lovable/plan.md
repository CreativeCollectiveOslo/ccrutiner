

# Auto-scroll til søgeresultat + Søgedialog mobiloptimering

## Oversigt
Denne plan løser tre ting:
1. **Auto-scroll**: Når du klikker på et søgeresultat, scroller siden automatisk ned til det sted, hvor søgeteksten fremgår
2. **Mobil padding**: Søgeboksen får lidt luft i siderne på mobil
3. **Luk-knap oprydning**: Lukknappen i søgedialogens header positioneres pænere

---

## Hvad der ændres for dig

### Forbedret brugeroplevelse
- Når du klikker på et søgeresultat og bliver ført til destinationen, scroller siden automatisk ned til det første element, der matcher
- Søgeboksen fylder ikke længere hele skærmbredden på mobil - der er nu luft i siderne
- Lukknappen i søgedialogen er placeret mere naturligt ved siden af søgefeltet

---

## Tekniske ændringer

### 1. SearchDialog - Mobil padding og luk-knap

**Nuværende problemer:**
- `DialogContent` har `p-0` som fjerner al padding
- Luk-knappen fra shadcn/ui Dialog er absolut positioneret `right-4 top-4` men kolliderer med vores custom header

**Løsning:**
- Tilføj `mx-4 sm:mx-0` til DialogContent for at give margin på mobil
- Skjul den indbyggede luk-knap og tilføj en custom luk-knap i headeren ved siden af søgefeltet
- Brug `DialogClose` komponent for semantisk korrekt lukkeknap

```typescript
// Opdateret DialogContent styling
<DialogContent className="sm:max-w-md mx-4 sm:mx-0 p-0 gap-0 [&>button:last-child]:hidden">
  <DialogHeader className="p-4 pb-2">
    <DialogTitle className="sr-only">Søg</DialogTitle>
    <div className="flex items-center gap-2 border rounded-md px-3 py-2 bg-background">
      <Search className="h-4 w-4 text-muted-foreground shrink-0" />
      <Input ... />
      {isSearching && <Loader2 ... />}
      <DialogClose asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0">
          <X className="h-4 w-4" />
          <span className="sr-only">Luk</span>
        </Button>
      </DialogClose>
    </div>
  </DialogHeader>
  ...
</DialogContent>
```

### 2. Auto-scroll til første match - NotificationsTab

Tilføj scroll-logik når `searchHighlightTerm` er sat:

```typescript
import { useEffect, useRef } from "react";

// I NotificationsTab komponenten:
const firstMatchRef = useRef<HTMLDivElement>(null);
const hasScrolledRef = useRef(false);

useEffect(() => {
  if (searchHighlightTerm && firstMatchRef.current && !hasScrolledRef.current) {
    setTimeout(() => {
      firstMatchRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      hasScrolledRef.current = true;
    }, 100);
  }
  if (!searchHighlightTerm) {
    hasScrolledRef.current = false;
  }
}, [searchHighlightTerm, notifications]);

// Ved rendering - find første match og tilføj ref:
const firstMatchId = searchHighlightTerm 
  ? notifications.find(n => {
      const text = n.type === "announcement" 
        ? `${n.title} ${n.message}`
        : n.message;
      return text.toLowerCase().includes(searchHighlightTerm.toLowerCase());
    })?.id
  : null;

// I JSX:
<div 
  ref={notification.id === firstMatchId ? firstMatchRef : undefined}
  ...
>
```

### 3. Auto-scroll til første match - BulletinBoard

Samme logik som NotificationsTab:

```typescript
const firstMatchRef = useRef<HTMLDivElement>(null);
const hasScrolledRef = useRef(false);

useEffect(() => {
  if (searchHighlightTerm && firstMatchRef.current && !hasScrolledRef.current) {
    setTimeout(() => {
      firstMatchRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      hasScrolledRef.current = true;
    }, 100);
  }
  if (!searchHighlightTerm) {
    hasScrolledRef.current = false;
  }
}, [searchHighlightTerm, posts]);

// Find første matchende post
const firstMatchId = searchHighlightTerm 
  ? posts.find(p => p.message.toLowerCase().includes(searchHighlightTerm.toLowerCase()))?.id
  : null;

// I JSX ved post-kort:
<Card 
  key={post.id} 
  ref={post.id === firstMatchId ? firstMatchRef : undefined}
>
```

### 4. EmployeeDashboard - Rutine scroll allerede implementeret

Rutine-scroll er allerede implementeret i `handleSearchNavigateToShift`:
```typescript
setTimeout(() => {
  const element = document.getElementById(`routine-${routineId}`);
  if (element) {
    element.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}, 100);
```

Men vi skal også håndtere scroll baseret på `searchHighlightTerm` for de tilfælde hvor flere rutiner matcher. Vi tilføjer en `useEffect` der finder og scroller til første match.

---

## Filer der ændres

| Fil | Ændringer |
|-----|-----------|
| `src/components/SearchDialog.tsx` | Tilføj mobil margin, skjul indbygget luk-knap, tilføj custom luk-knap i header |
| `src/components/NotificationsTab.tsx` | Tilføj auto-scroll til første match |
| `src/components/BulletinBoard.tsx` | Tilføj auto-scroll til første match |
| `src/pages/EmployeeDashboard.tsx` | Tilføj auto-scroll til første matchende rutine baseret på søgeterm |

---

## Visuelt før/efter

### Søgedialog på mobil

**Før:**
```text
|--------------------------------------|
|  [X]                                 |
|  +----------------------------------+|
|  | [🔍] Søg efter rutiner...       ||
|  +----------------------------------+|
```

**Efter:**
```text
|    --------------------------------  |
|    | [🔍] Søg...           [X]    |  |
|    --------------------------------  |
|                                      |
```

- Luft i siderne (margin)
- Luk-knap integreret i søgefeltet
- Renere og mere mobilvennigt design

---

## Scroll-flow

```text
Bruger klikker på søgeresultat
         │
         ▼
    Navigation sker
    (tab skifter/vagt åbnes)
         │
         ▼
    searchHighlightTerm sættes
         │
         ▼
    useEffect i destination-komponent
    finder første match
         │
         ▼
    scrollIntoView({ behavior: "smooth", block: "center" })
         │
         ▼
    Elementet er centreret på skærmen
    med highlighting synligt
```

