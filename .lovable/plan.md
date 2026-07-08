## Problem
1. Når "Administrer vakter"-panelet åpnes, får `Navn`-inputet automatisk fokus, og iOS-tastaturet spretter opp uten at brukeren har bedt om det. Dette skjer fordi Radix `Sheet`/`Dialog` autofokuserer første fokuserbare element ved åpning.
2. Når tastaturet først er oppe, finnes ingen god måte å lukke det på for å se innhold under (f.eks. listen "Eksisterende vakter").

## Løsning

### 1. Slå av autofokus i alle Sheet/Dialog som inneholder inputs
Legg til `onOpenAutoFocus={(e) => e.preventDefault()}` på:
- `SheetContent` som wrapper `ShiftManager` i `src/pages/AdminDashboard.tsx`
- Øvrige `DialogContent`/`SheetContent` i admin- og employee-dashboards som inneholder tekstfelter (ShiftManager-sheet, section/task-dialoger, info-dialoger, announcement-dialoger, store-manager-dialog, bulletin/logbook-dialog). Bruk parallelt søk for å finne dem, og legg til propen konsekvent.

Dette gjør at panelet åpnes uten at noe input får fokus — tastaturet forblir lukket til brukeren aktivt trykker på et felt.

### 2. Lukk tastaturet ved scroll (globalt)
Ny hook `src/hooks/use-blur-on-scroll.ts` som monteres én gang i `src/App.tsx`:
- Lytter på `touchmove` (passiv) på `window`.
- Hvis `document.activeElement` er et `INPUT`/`TEXTAREA`/`[contenteditable]`, og scroll-bevegelsen er utenfor selve feltet, kall `(activeElement as HTMLElement).blur()`.
- Dette matcher iOS-mønsteret der tastaturet lukkes når man drar i innholdet bak.

Ingen andre endringer — kun UI/interaksjon.

## Filer som endres
- `src/pages/AdminDashboard.tsx` — `onOpenAutoFocus` på ShiftManager-Sheet + øvrige Dialog/Sheet med inputs
- `src/pages/EmployeeDashboard.tsx` — samme, der relevant
- `src/components/BulletinBoard.tsx`, `StoreManager.tsx`, `SectionManager.tsx`, `ShiftManager.tsx`-relaterte dialoger, `InfoCategoryManager.tsx`, `InfoSectionManager.tsx`, `AnnouncementManager.tsx` — `onOpenAutoFocus` på DialogContent som inneholder inputs
- `src/hooks/use-blur-on-scroll.ts` — ny
- `src/App.tsx` — mount hook

## Ikke endret
- SearchDialog beholder eksplisitt `input.focus()` — der er tastaturet ønsket.
- Ingen forretningslogikk, ingen datamodell.
