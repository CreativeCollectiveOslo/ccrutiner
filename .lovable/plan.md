

# Kommentarer til vagt-visningen

## Oversigt
Tilføje mulighed for medarbejdere at skrive kommentarer og se andres kommentarer på en specifik vagt. Funktionaliteten adskilles fra opgavelisten med en segmented control.

## Hvad der ændres for dig

### Ny funktionalitet
- Under "Hold skjerm våken" vil der være to knapper: **Oppgaver** og **Kommentarer**
- Du kan skifte mellem at se opgavelisten og kommentarvisningen
- I kommentarvisningen kan du:
  - Se alle kommentarer fra alle brugere på den valgte vagt
  - Skrive og sende nye kommentarer
  - Se hvem der skrev kommentaren og hvornår

### Brugeroplevelse
- Kommentarerne vises med navn, dato og beskedtekst
- Nyeste kommentarer vises først
- Der vises en besked hvis der ingen kommentarer er endnu

---

## Tekniske detaljer

### 1. Database: Ny tabel til kommentarer
Opretter en `shift_comments` tabel med følgende kolonner:
- `id` - unik identifikator
- `shift_id` - reference til hvilken vagt kommentaren tilhører
- `user_id` - hvem skrev kommentaren
- `message` - selve kommentaren
- `created_at` - hvornår den blev oprettet

Sikkerhedsregler (RLS):
- Alle autentificerede brugere kan læse kommentarer
- Brugere kan kun oprette kommentarer i eget navn
- Brugere kan slette egne kommentarer

### 2. Frontend: Opdateret vagt-visning

**Nye state-variabler:**
- `shiftViewTab`: Styrer hvilken visning der er aktiv ("tasks" eller "comments")
- `comments`: Liste af kommentarer for den valgte vagt
- `newComment`: Teksten i kommentar-inputfeltet

**UI-ændringer i EmployeeDashboard.tsx:**

```text
┌─────────────────────────────────────┐
│ ← Tilbake                           │
│                                     │
│ Åpne                                │
│ 2 av 10 oppgaver fullført           │
│ 📱 Hold skjerm våken  [Toggle]      │
│                                     │
│ ┌─────────────┬─────────────┐       │
│ │  Oppgaver   │ Kommentarer │       │  <-- Segmented control
│ └─────────────┴─────────────┘       │
│                                     │
│ (Oppgaveliste eller kommentarer)    │
└─────────────────────────────────────┘
```

**Ny komponentstruktur:**
- Segmented control med ToggleGroup-komponenten
- Kommentarvisning viser alle kommentarer sorteret efter dato
- Inputfelt + send-knap til nye kommentarer

### 3. Implementeringsrækkefølge
1. Oprette database-tabellen med RLS-policies
2. Tilføje state og fetch-funktioner i EmployeeDashboard
3. Implementere segmented control under wake-lock toggle
4. Bygge kommentarvisningen med liste og inputfelt
5. Tilføje funktionalitet til at sende kommentarer

