

# Delt Opgave-Fremskridt

## Oversigt
Ændrer opgavesystemet så alle brugere kan se den samlede fremgang på en vagt, og afkrydsninger ikke længere nulstilles automatisk. En ny knap tilføjes for manuelt at rydde alle afkrydsninger.

## Hvad der ændres for dig

### Ny funktionalitet
- Alle afkrydsninger på en vagt er nu synlige for alle brugere
- Opgaver nulstilles IKKE automatisk ved midnat
- Ny knap i toppen af vagten: **Fjern alle afkrydsninger**
- Når du klikker på knappen, fjernes alle afkrydsninger på vagten (fra alle brugere)

### Brugeroplevelse
- Du kan se hvad dine kolleger allerede har krydset af
- Fremgangen på forsiden viser den samlede status for vagten
- Knappen til at fjerne afkrydsninger viser en bekræftelsesdialog før den rydder

---

## Tekniske detaljer

### 1. Database: Opdaterede sikkerhedsregler (RLS)

**Nuværende policies på `task_completions`:**
- SELECT: Brugere kan kun se egne afkrydsninger
- INSERT: Brugere kan kun oprette egne afkrydsninger  
- DELETE: Brugere kan kun slette egne afkrydsninger
- Admins kan se alle

**Nye policies:**
- SELECT: Alle autentificerede brugere kan se ALLE afkrydsninger
- INSERT: Brugere kan kun oprette i eget navn (uændret)
- DELETE: Alle autentificerede brugere kan slette alle afkrydsninger for en given vagt

SQL-migration:
```sql
-- Drop eksisterende SELECT policies
DROP POLICY IF EXISTS "Users can view own completions" ON task_completions;
DROP POLICY IF EXISTS "Admins can view all completions" ON task_completions;

-- Ny SELECT policy - alle kan se alle afkrydsninger
CREATE POLICY "Authenticated users can view all completions"
  ON task_completions FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Opdater DELETE policy så alle kan fjerne afkrydsninger
DROP POLICY IF EXISTS "Users can delete own completions" ON task_completions;
CREATE POLICY "Authenticated users can delete completions"
  ON task_completions FOR DELETE
  USING (auth.uid() IS NOT NULL);
```

### 2. Frontend: Ændringer i EmployeeDashboard.tsx

**Fjernede funktioner:**
- Midnight-reset timer (linje 163-180) fjernes helt

**Nye funktioner:**
- `clearAllCompletions()`: Sletter alle afkrydsninger for den valgte vagt
- Bekræftelsesdialog før sletning

**Opdaterede funktioner:**
- `fetchTodayCompletions()`: Henter ALLE brugeres afkrydsninger (ikke kun egne)
- `fetchAllShiftProgress()`: Beregner fremgang baseret på alle afkrydsninger

**UI-ændringer:**

```text
┌─────────────────────────────────────┐
│ ← Tilbake                           │
│                                     │
│ Åpne                                │
│ 2 av 10 oppgaver fullført           │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 🗑️ Fjern alle afkrydsninger     │ │  <-- Ny knap
│ └─────────────────────────────────┘ │
│                                     │
│ 📱 Hold skjerm våken  [Toggle]      │
│                                     │
│ (Opgaveliste)                       │
└─────────────────────────────────────┘
```

### 3. Vigtig overvejelse: shift_date kolonnen

Da afkrydsninger ikke længere nulstilles automatisk, skal vi beslutte hvordan `shift_date` skal håndteres:

**Anbefaling**: Behold `shift_date` men fjern den fra filtrering. Dette bevarer historik og giver mulighed for fremtidig analyse.

De opdaterede queries vil hente afkrydsninger for den valgte vagt UANSET dato:
```typescript
// Før (kun dagens afkrydsninger)
.eq("shift_date", today)

// Efter (alle afkrydsninger for vagten)
// (ingen shift_date filter)
```

### 4. Implementeringsrækkefølge

1. Opdater RLS-policies i databasen
2. Fjern midnight-reset timer fra EmployeeDashboard
3. Opdater `fetchTodayCompletions()` til at hente alle afkrydsninger (uden dato-filter)
4. Opdater `fetchAllShiftProgress()` til at beregne samlet fremgang
5. Tilføj "Fjern alle afkrydsninger" knap med bekræftelsesdialog
6. Implementer `clearAllCompletions()` funktion

### 5. Realtime overvejelser (fremtidigt)

For at andre brugere kan se ændringer i realtid, kunne man tilføje Supabase Realtime på `task_completions` tabellen. Dette er ikke inkluderet i denne implementering, men kan tilføjes senere ved at:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_completions;
```

