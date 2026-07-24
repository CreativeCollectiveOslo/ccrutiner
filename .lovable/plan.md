## Problem

To feil i Info-fanen, begge med samme rot: `selectedInfoCategory` (i AdminDashboard) og `selectedInfoCategory` (i EmployeeDashboard) blir ikke nullstilt når man bytter butikk. Den holder på en kategori-ID som tilhører den forrige butikken.

**Konsekvenser:**
1. **Blank Info-fane etter butikkbytte** — `InfoSectionManager` (admin) og info-visningen (ansatt) filtrerer på den gamle kategori-ID-en, som ikke finnes i den nye butikken → tomt resultat.
2. **Innhold lagt til i Trondheim vises i Oslo** — når admin tror de er i Trondheim, men `selectedInfoCategory` fortsatt peker på en Oslo-kategori, blir nytt innhold opprettet med `category_id` fra Oslo, og dukker derfor opp i Oslo. (Kategorier er butikk-scoped, men den valgte ID-en er ikke det.)

I `AdminDashboard.fetchInfoCategories` er linja `if (data.length > 0 && !selectedInfoCategory)` skyldig — den beholder gammel ID hvis den er satt fra før.

## Fix

**`src/pages/AdminDashboard.tsx`**
- Nullstill `selectedInfoCategory` når `activeStore.id` endres (før nye kategorier er hentet), slik at valget alltid faller på første kategori i den nye butikken.
- Endre `fetchInfoCategories`: hvis nåværende `selectedInfoCategory` ikke finnes i nye `data`, sett den til `data[0]?.id ?? ""`.

**`src/pages/EmployeeDashboard.tsx`**
- Samme mønster: nullstill `selectedInfoCategory` når `activeStore.id` endres, og etter `fetchShiftInfo` valider at valgt kategori faktisk finnes i den nye lista.

**Sanity-sjekk andre butikk-scopede valg**
- Sjekke `selectedShift`, `selectedSection` og lignende for samme problem, og nullstille dem ved butikkbytte hvis de ikke finnes i nytt datasett. (Kun frontend-endringer.)

Ingen backend-/RLS-endringer trengs — data er allerede butikk-isolert; det er kun UI-state som lekker mellom butikker.

## Verifikasjon

1. Logg inn som Kira (super_admin med tilgang til begge). Åpne Info-fanen i Oslo, bytt til Trondheim → skal vise Trondheims første kategori, ikke blankt.
2. Bytt fram og tilbake flere ganger → aldri blankt.
3. Legg til info i Trondheim → verifiser via DB at `category_id` og `store_id` tilhører Trondheim, og at innholdet IKKE vises i Oslo.
