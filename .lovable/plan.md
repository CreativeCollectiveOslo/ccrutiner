## Problem

De to loggbøkene skriver til separate tabeller (`bulletin_posts` og `workshop_logbook_posts`), men i UI-et ser innholdet likt ut. Årsaken er at når man bytter fane mellom "Loggbok" og "Verksted", monteres `BulletinBoard`-komponenten ikke på nytt — React gjenbruker samme instans og bare bytter `variant`-propen. `useEffect` som henter innlegg har kun `[currentPage, activeStore]` som dependencies, så den kaller ikke `fetchPosts()` når `variant` endres. Resultatet: verksted-fanen viser gamle innlegg fra kafé-loggboken helt til man refresher.

(Verifisert: `bulletin_posts` har 180 innlegg, `workshop_logbook_posts` har 0 — tabellene er allerede korrekt adskilte i databasen.)

## Endringer

### 1. `src/components/BulletinBoard.tsx` — reager på variant-bytte
- Legg til `variant` (eller `config.table`) i `useEffect`-dependency-arrayet som kaller `fetchPosts`.
- Nullstill lokal state ved variant-bytte: `posts`, `currentPage`, `totalCount`, `editingPostId`, `newTitle/newMessage/newImageUrls`, `searchHighlightTerm`-scroll-flagget.
- Alternativt (enklere og sikrere): gi komponenten en `key={variant}` der den brukes i `EmployeeDashboard`, slik at React monterer den på nytt ved fanebytte. Foretrukket løsning fordi det garantert isolerer all state.

### 2. `src/pages/EmployeeDashboard.tsx` — kortere fane-navn for mobil
Erstatt de nåværende etikettene:
- "Loggbok" → **"Kafé"**
- "Verksted" → **"Verksted"** (uendret — allerede kort)

Begrunnelse: fanene representerer henholdsvis kafé-loggboken og verksted-loggboken. "Kafé" og "Verksted" er like korte, symmetriske, og passer i mobil-visning.

### 3. Ingen databaseendringer
Tabellene er allerede separate og RLS er på plass. Ingen migrasjon nødvendig.

## Teknisk detalj

```tsx
// EmployeeDashboard.tsx render-blokk
) : mainTab === "bulletin" ? (
  <BulletinBoard key="cafe" searchHighlightTerm={searchHighlightTerm} />
) : mainTab === "workshop" ? (
  <BulletinBoard key="workshop" variant="workshop" searchHighlightTerm={searchHighlightTerm} />
) : ...
```

Tab-knapp-tekster oppdateres på linjene rundt 779 og 793.
