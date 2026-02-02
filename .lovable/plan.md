
# Global Søgefunktion til Dashboard

## Oversigt
Tilføjer en søgefunktion tilgængelig fra forsiden af dashboardet, hvor brugere kan søge på tværs af:
- **Rutiner** (alle vagter)
- **Notifikationer** (announcements og routine notifications)
- **Opslagstavle** (bulletin posts)

Når man klikker på et søgeresultat, bliver man transporteret direkte til det sted, hvor resultatet blev fundet.

---

## Hvad der ændres for dig

### Ny funktionalitet
- En søgeknap i headeren (forstørrelsesglas-ikon)
- Når du klikker, åbnes en søgedialog med et tekstfelt
- Resultater vises live mens du skriver
- Resultater er grupperet efter type (Rutiner, Notifikationer, Opslagstavle)
- Klik på et resultat fører dig direkte til det:
  - Rutine → Åbner den pågældende vagt og viser rutinen
  - Notifikation → Skifter til notifikations-fanen
  - Opslagstavle → Skifter til opslagstavle-fanen

### Brugeroplevelse
- Tryk på søgeknappen i headeren
- Skriv dit søgeord (f.eks. "klud")
- Se grupperede resultater med matchende tekst fremhævet
- Klik på resultatet for at blive ført til det

---

## Tekniske detaljer

### 1. Ny komponent: SearchDialog.tsx

Opretter `src/components/SearchDialog.tsx` der håndterer:

**Props:**
- `open: boolean` - om dialogen er åben
- `onOpenChange: (open: boolean) => void` - callback ved åbning/lukning
- `onNavigateToShift: (shiftId: string, routineId?: string) => void` - navigation til vagt
- `onNavigateToNotifications: () => void` - navigation til notifikationer
- `onNavigateToBulletin: () => void` - navigation til opslagstavle

**Funktionalitet:**
- Inputfelt til søgetekst med debounce (300ms)
- Søgning på tværs af alle datakilder
- Gruppering af resultater efter type
- Fremhævning af matchende tekst
- Keyboard navigation (pil op/ned, Enter)

**Datakilder der søges i:**
1. `routines` - title og description
2. `announcements` - title og message  
3. `routine_notifications` - message
4. `bulletin_posts` - message

**Resultat-struktur:**
```typescript
interface SearchResult {
  id: string;
  type: 'routine' | 'notification' | 'bulletin';
  title: string;
  description?: string;
  context?: string; // f.eks. vagtens navn
  shiftId?: string;
  routineId?: string;
}
```

### 2. UI-struktur for SearchDialog

```text
+------------------------------------------+
|  [X]                                     |
|  +--------------------------------------+|
|  | [Søgeikon] Søg efter rutiner...      ||
|  +--------------------------------------+|
|                                          |
|  RUTINER                                 |
|  +--------------------------------------+|
|  | Rengør med klud                       |
|  | Åbne vagt                             |
|  +--------------------------------------+|
|  +--------------------------------------+|
|  | Tør støv af med klud                  |
|  | Lukke vagt                            |
|  +--------------------------------------+|
|                                          |
|  NOTIFIKATIONER                          |
|  +--------------------------------------+|
|  | Husk at bruge ren klud hver dag       |
|  | 15. januar 2026                       |
|  +--------------------------------------+|
|                                          |
|  OPSLAGSTAVLE                            |
|  +--------------------------------------+|
|  | Vi har fået nye klude på lager        |
|  | Anna · 10. januar 2026                |
|  +--------------------------------------+|
+------------------------------------------+
```

Empty state (ingen resultater):
```text
+------------------------------------------+
|           [Søgeikon]                     |
|     Ingen resultater fundet              |
|   Prøv et andet søgeord                  |
+------------------------------------------+
```

### 3. Opdateringer til EmployeeDashboard.tsx

**Nye imports:**
- `Search` fra lucide-react
- `SearchDialog` komponent

**Nye state variabler:**
- `searchOpen: boolean` - om søgedialog er åben
- `highlightedRoutineId: string | null` - for at highlighte specifik rutine efter navigation

**Header ændringer:**
- Tilføj søgeknap ved siden af log-ud knappen
- Søgeknappen åbner SearchDialog

**Navigation callbacks:**
- `handleSearchNavigateToShift(shiftId, routineId)`:
  - Sætter `selectedShift` til den valgte vagt
  - Sætter `highlightedRoutineId` for at scrolle til og highlighte rutinen
  - Lukker søgedialog
- `handleSearchNavigateToNotifications()`:
  - Sætter `mainTab` til "notifications"
  - Lukker søgedialog
- `handleSearchNavigateToBulletin()`:
  - Sætter `mainTab` til "bulletin"
  - Lukker søgedialog

**Rutine highlighting:**
- Når en rutine matches via søgning, scroll til den og giv den en kort highlight-animation
- Fjern highlight efter 2 sekunder

### 4. Søgelogik i SearchDialog

**Søgning:**
```typescript
const search = async (query: string) => {
  if (query.length < 2) {
    setResults([]);
    return;
  }
  
  const lowerQuery = query.toLowerCase();
  
  // Søg i rutiner (med vagt-info)
  const { data: routinesData } = await supabase
    .from('routines')
    .select('id, title, description, shift_id, shifts(name)')
    .or(`title.ilike.%${query}%,description.ilike.%${query}%`);
  
  // Søg i announcements
  const { data: announcementsData } = await supabase
    .from('announcements')
    .select('id, title, message, created_at')
    .or(`title.ilike.%${query}%,message.ilike.%${query}%`);
  
  // Søg i routine notifications
  const { data: routineNotifsData } = await supabase
    .from('routine_notifications')
    .select('id, message, created_at')
    .ilike('message', `%${query}%`);
  
  // Søg i bulletin posts
  const { data: bulletinData } = await supabase
    .from('bulletin_posts')
    .select('id, message, created_at, user_id')
    .ilike('message', `%${query}%`);
  
  // Kombiner og formater resultater
  // ...
};
```

### 5. Debounce implementation

```typescript
const [searchQuery, setSearchQuery] = useState('');
const [debouncedQuery, setDebouncedQuery] = useState('');

useEffect(() => {
  const timer = setTimeout(() => {
    setDebouncedQuery(searchQuery);
  }, 300);
  return () => clearTimeout(timer);
}, [searchQuery]);

useEffect(() => {
  if (debouncedQuery) {
    search(debouncedQuery);
  }
}, [debouncedQuery]);
```

### 6. Tekst-highlighting

For at fremhæve matchende tekst:
```typescript
const highlightMatch = (text: string, query: string) => {
  if (!query) return text;
  const regex = new RegExp(`(${query})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, i) => 
    part.toLowerCase() === query.toLowerCase() 
      ? <mark key={i} className="bg-yellow-200 dark:bg-yellow-800">{part}</mark>
      : part
  );
};
```

---

## Implementeringsrækkefølge

1. Opret `SearchDialog.tsx` komponent med:
   - Dialog-struktur (bruger eksisterende Dialog-komponent)
   - Søgeinput med debounce
   - Søgelogik for alle datakilder
   - Grupperede resultater med highlighting
   - Navigation callbacks

2. Opdater `EmployeeDashboard.tsx`:
   - Tilføj søgeknap i header
   - Tilføj state for søgedialog og highlighted rutine
   - Implementer navigation handlers
   - Tilføj highlight-effekt på rutiner
   - Scroll-to-element funktionalitet

---

## Edge cases

- **Søgeord under 2 tegn**: Viser ingen resultater (for at undgå for mange matches)
- **Ingen resultater**: Viser venlig besked
- **Lange tekster**: Trunkeres med "..." og viser kontekst omkring match
- **Vagt ikke valgt**: Hvis man søger og klikker på en rutine, navigeres til vagten først
- **Keyboard navigation**: Escape lukker dialogen
