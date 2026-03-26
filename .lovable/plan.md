

# To endringer: Rename "Viktig info" + Notifikasjoner som overlay

## Endring 1: Rename "Viktig info" → "Info"

Enkelt tekst-bytte i begge dashboards.

**EmployeeDashboard.tsx** (linje 626): `"Viktig info"` → `"Info"`
**AdminDashboard.tsx** (linje 357): `"Viktig info"` → `"Info"`

Overskriften inne på info-siden (`"Viktig informasjon"`, linje 666) beholdes som den er – den gir kontekst når man er på siden.

## Endring 2: Notifikasjoner som overlay (skjul tab-menyen)

Når `mainTab === "notifications"`, skal tab-menyen (Vakter, Info, Loggbok, Handleliste) ikke vises. Notifikasjonssiden fungerer som et overlay med en tilbake-knapp.

**EmployeeDashboard.tsx**:
- Wrap tab-menyen (linje 602-658) i en betingelse: `{mainTab !== "notifications" && (...)}`
- Når `mainTab === "notifications"`, vis i stedet en enkel header med tilbake-knapp (← Tilbake) som setter `mainTab` tilbake til `"shifts"`
- Flytt `NotificationsTab`-rendringen utenfor tab-menyen sin betingelse

### Teknisk detalj

```text
mainTab !== "notifications":
  ┌─────────────────────────────┐
  │ Vakter | Info | Loggbok | …│  ← tab-meny
  │ [innhold for valgt tab]    │
  └─────────────────────────────┘

mainTab === "notifications":
  ┌─────────────────────────────┐
  │ ← Tilbake     Notifikasjoner│  ← enkel header
  │ [NotificationsTab]          │
  └─────────────────────────────┘
```

### Filer som endres

| Fil | Endring |
|-----|---------|
| `src/pages/EmployeeDashboard.tsx` | Rename tab-tekst, skjul tabs ved notifications, legg til tilbake-header |
| `src/pages/AdminDashboard.tsx` | Rename tab-tekst |

### Ingen database-endringer

