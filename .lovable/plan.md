
# Highlight søgetekst på destinationsstedet

## Oversigt
Når du klikker på et søgeresultat, skal søgeordet (f.eks. "klud") blive highlightet i den tekst, hvor det blev fundet - uanset om det er i en rutine, notifikation eller på opslagstavlen.

---

## Hvad der ændres for dig

### Brugeroplevelse
1. Søg efter f.eks. "klud" og klik på et resultat
2. Du bliver transporteret til destinationen
3. Søgeordet "klud" er nu fremhævet med en accent-farve i selve teksten
4. Highlightingen forsvinder automatisk efter 5 sekunder

---

## Tekniske ændringer

### 1. Udvid SearchDialog props

Ændr navigation-callbacks til også at videregive søgeordet:

```typescript
interface SearchDialogProps {
  // ... eksisterende props
  onNavigateToShift: (shiftId: string, routineId?: string, searchTerm?: string) => void;
  onNavigateToNotifications: (searchTerm?: string) => void;
  onNavigateToBulletin: (searchTerm?: string) => void;
}
```

### 2. Opdater handleResultClick i SearchDialog

```typescript
const handleResultClick = (result: SearchResult) => {
  onOpenChange(false);
  
  if (result.type === "routine" && result.shiftId) {
    onNavigateToShift(result.shiftId, result.routineId, debouncedQuery);
  } else if (result.type === "notification") {
    onNavigateToNotifications(debouncedQuery);
  } else if (result.type === "bulletin") {
    onNavigateToBulletin(debouncedQuery);
  }
};
```

### 3. Ny state i EmployeeDashboard

Tilføj `searchHighlightTerm` state til at gemme søgeordet:

```typescript
const [searchHighlightTerm, setSearchHighlightTerm] = useState<string | null>(null);
```

### 4. Opdater navigation handlers i EmployeeDashboard

```typescript
const handleSearchNavigateToShift = async (shiftId: string, routineId?: string, searchTerm?: string) => {
  const shift = shifts.find((s) => s.id === shiftId);
  if (shift) {
    setSelectedShift(shift);
    if (searchTerm) {
      setSearchHighlightTerm(searchTerm);
      setTimeout(() => setSearchHighlightTerm(null), 5000);
    }
    // ... resten af eksisterende logik
  }
};

const handleSearchNavigateToNotifications = (searchTerm?: string) => {
  setSelectedShift(null);
  setMainTab("notifications");
  if (searchTerm) {
    setSearchHighlightTerm(searchTerm);
    setTimeout(() => setSearchHighlightTerm(null), 5000);
  }
};

const handleSearchNavigateToBulletin = (searchTerm?: string) => {
  setSelectedShift(null);
  setMainTab("bulletin");
  if (searchTerm) {
    setSearchHighlightTerm(searchTerm);
    setTimeout(() => setSearchHighlightTerm(null), 5000);
  }
};
```

### 5. Opret delt highlightMatch utility

Opretter `src/lib/highlightText.tsx` med genbrugelig highlight-funktion:

```typescript
export function highlightSearchTerm(text: string, searchTerm: string | null): React.ReactNode {
  if (!searchTerm || !text) return text;
  
  try {
    const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escapedTerm})`, "gi");
    const parts = text.split(regex);
    
    return parts.map((part, i) =>
      part.toLowerCase() === searchTerm.toLowerCase() ? (
        <mark key={i} className="bg-accent text-accent-foreground rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    );
  } catch {
    return text;
  }
}
```

### 6. Opdater rutine-visning i EmployeeDashboard

Brug `highlightSearchTerm` på rutinens titel og beskrivelse:

```typescript
<label className={`text-sm font-medium cursor-pointer ${isCompleted ? "line-through" : ""}`}>
  {highlightSearchTerm(routine.title, searchHighlightTerm)}
</label>
// ...
<p className={`text-sm text-muted-foreground ${!isExpanded ? "line-clamp-3" : ""}`}>
  {highlightSearchTerm(routine.description, searchHighlightTerm)}
</p>
```

### 7. Tilføj searchHighlightTerm prop til NotificationsTab

Opdater NotificationsTab interface:

```typescript
interface NotificationsTabProps {
  onMarkAsRead?: () => void;
  searchHighlightTerm?: string | null;
}
```

Brug highlight-funktionen på notification-tekster:

```typescript
// For announcements
<h3 className="text-sm font-medium mb-1">
  {highlightSearchTerm(notification.title, searchHighlightTerm)}
</h3>
<p className="text-sm text-muted-foreground">
  {highlightSearchTerm(notification.message, searchHighlightTerm)}
</p>

// For routine notifications
<h3 className="text-sm font-medium mb-1">
  {highlightSearchTerm(notification.message, searchHighlightTerm)}
</h3>
```

### 8. Tilføj searchHighlightTerm prop til BulletinBoard

Opdater BulletinBoard interface:

```typescript
interface BulletinBoardProps {
  searchHighlightTerm?: string | null;
}
```

Brug highlight-funktionen på post-beskeder:

```typescript
<p className="text-sm whitespace-pre-wrap mb-3">
  {highlightSearchTerm(post.message, searchHighlightTerm)}
</p>
```

### 9. Videregiv prop i EmployeeDashboard

```typescript
{mainTab === "notifications" && (
  <NotificationsTab 
    onMarkAsRead={() => fetchUnreadCount()} 
    searchHighlightTerm={searchHighlightTerm}
  />
)}

{mainTab === "bulletin" && (
  <BulletinBoard searchHighlightTerm={searchHighlightTerm} />
)}
```

---

## Filer der ændres

| Fil | Ændringer |
|-----|-----------|
| `src/lib/highlightText.tsx` | **Ny fil** - Delt utility til tekst-highlighting |
| `src/components/SearchDialog.tsx` | Opdater navigation callbacks til at inkludere søgeordet |
| `src/pages/EmployeeDashboard.tsx` | Tilføj `searchHighlightTerm` state, opdater handlers, brug highlight på rutiner |
| `src/components/NotificationsTab.tsx` | Tilføj prop og highlight på notifikationstekst |
| `src/components/BulletinBoard.tsx` | Tilføj prop og highlight på postbeskeder |

---

## Flowdiagram

```text
Søgedialog
    │
    ├─ Klik på rutine-resultat
    │       │
    │       └─► handleSearchNavigateToShift(shiftId, routineId, "klud")
    │                   │
    │                   └─► setSearchHighlightTerm("klud")
    │                   └─► Rutine vises med "klud" highlightet
    │
    ├─ Klik på notifikation-resultat  
    │       │
    │       └─► handleSearchNavigateToNotifications("klud")
    │                   │
    │                   └─► NotificationsTab med prop searchHighlightTerm="klud"
    │                   └─► Notifikationstekst vises med "klud" highlightet
    │
    └─ Klik på opslagstavle-resultat
            │
            └─► handleSearchNavigateToBulletin("klud")
                        │
                        └─► BulletinBoard med prop searchHighlightTerm="klud"
                        └─► Post-besked vises med "klud" highlightet
```

---

## Highlight-styling

Bruger samme styling som i SearchDialog:
- Baggrund: `bg-accent` (følger tema)
- Tekstfarve: `text-accent-foreground`
- Afrunding: `rounded`
- Padding: `px-0.5`

Dette sikrer konsistens mellem highlightet i søgeresultaterne og på destinationen.

---

## Timeout-logik

Highlighten forsvinder automatisk efter 5 sekunder via `setTimeout`:
- Lang nok til at brugeren ser og finder det
- Kort nok til at siden ser normal ud igen
- Ryddes også hvis brugeren navigerer væk
