## Problem

Brukere opplever at avkryssede rutiner "kommer tilbake" etter få minutter. To sammenhengende feil i `EmployeeDashboard.tsx`:

### Bug 1 — Uncheck matcher bare din egen rad fra i dag
`toggleTaskCompletion` sletter med filter `user_id = current` OG `shift_date = today`:

```ts
.delete()
.eq("routine_id", routineId)
.eq("user_id", user.id)
.eq("shift_date", today);
```

Fordi avkryssinger er delte mellom alle brukere, kan raden være opprettet av en kollega eller på en annen dato. Da matcher slettingen 0 rader. UI oppdaterer lokal state og "ser" tom, men raden ligger fortsatt i databasen. Neste refetch/reload henter den inn igjen → haken kommer tilbake. Dette forklarer nøyaktig symptomet.

### Bug 2 — Ingen realtime
Ingen abonnement på `task_completions`. Bruker A ser ikke bruker Bs endringer før manuell reload, og omvendt. Kombinert med Bug 1 gir det inntrykk av at appen "husker feil vakt".

## Løsning

### 1. Slette delt tilstand riktig
I `toggleTaskCompletion`, endre uncheck til å slette alle rader for `routine_id` innenfor butikken (siden avkryssing er delt):

```ts
.delete()
.eq("routine_id", routineId)
.eq("store_id", activeStore.id);
```

Ingen `user_id`/`shift_date`-filter. Samme prinsipp som `clearAllCompletions` allerede bruker.

### 2. Unngå duplikater ved check
Bruk `upsert` istedenfor `insert` slik at samme rutine ikke får to rader hvis to brukere krysser samtidig:

```ts
.upsert(
  { routine_id, user_id, store_id, shift_date: today },
  { onConflict: "routine_id" }
)
```

Krever en unik indeks — se Teknisk-seksjon.

### 3. Realtime-abonnement
Legg til `useEffect` i `EmployeeDashboard` som abonnerer på `postgres_changes` for `task_completions` filtrert på `store_id=eq.<activeStore.id>`. Ved INSERT/DELETE oppdater både `completions` (hvis raden gjelder valgt vakt) og `shiftProgress`. Rydd opp med `supabase.removeChannel` i return.

### 4. Refetch ved focus/visibility (defense)
Legg til lytter for `visibilitychange` og `focus` som kaller `fetchCompletions()` + `fetchAllShiftProgress()` når appen blir synlig igjen. Fanger opp tilfeller hvor realtime mistet en melding.

## Teknisk

**Migrasjon** (unik indeks for upsert + realtime-publisering):

```sql
-- Rydd eventuelle duplikater først
DELETE FROM public.task_completions a
USING public.task_completions b
WHERE a.ctid < b.ctid AND a.routine_id = b.routine_id;

CREATE UNIQUE INDEX IF NOT EXISTS task_completions_routine_unique
  ON public.task_completions(routine_id);

ALTER TABLE public.task_completions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_completions;
```

## Filer som endres

- `src/pages/EmployeeDashboard.tsx` — fix uncheck-filter, bytt insert→upsert, nytt realtime-`useEffect`, visibility/focus-refetch
- Ny migrasjon — unik indeks + realtime-publisering

## Ikke endret

- `clearAllCompletions` er allerede korrekt
- Ingen UI-endringer
- Ingen endring i admin-dashboard (avkryssing skjer kun i EmployeeDashboard)
