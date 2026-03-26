

# Viktig Info - Informasjonsside per vakt

## Problem

Under "Vakter" finnes det innhold som er generell informasjon ("viktig info") som ikke er oppgaver man skal krysse av. Denne informasjonstypen blandes i dag med rutinekortene som har checkbokser, noe som skaper forvirring om hva som er en oppgave og hva som bare er informasjon.

## Forslag: "Viktig Info" som en egen seksjon over rutinene

### Struktur for ansatte (EmployeeDashboard)

Når en bruker har valgt en vakt, vises siden slik:

```text
┌─────────────────────────────────────┐
│  ← Tilbake                          │
│  Morgenvakt          3/8 oppgaver   │
│  ████████░░░░░░░░░░                 │
│  [Skjerm våken] | [Nullstill]       │
│                                     │
│  ┌─ VIKTIG INFO ──────────────────┐ │
│  │ ℹ  Husk å sjekke temperaturen  │ │
│  │    i kjøleskapet hver morgen    │ │
│  │                                │ │
│  │ ℹ  Nøkkelen til lageret henger │ │
│  │    på tavlen i gangen          │ │
│  └────────────────────────────────┘ │
│                                     │
│  KAFÉ                               │
│  ┌──────────────────────────────┐   │
│  │ ☐ Tørk av bordene           │   │
│  │ ☐ Fyll opp servietter       │   │
│  └──────────────────────────────┘   │
│  ...                                │
└─────────────────────────────────────┘
```

- "Viktig Info" vises i et eget visuelt felt med en info-ikon og en subtil bakgrunn (`bg-blue-50/50` / `border-blue-200`) som tydelig skiller det fra oppgavekortene
- Ingen checkbox - det er ren informasjon
- Plassert mellom verktøysraden og rutinene
- Kan ha flere info-punkter, hver med tittel og beskrivelse
- Støtter billeder (multi-image) som eksisterende rutiner

### Struktur for admin (AdminDashboard)

Under rutinevisningen for en vakt, kan admin:
- Legge til/redigere/slette "viktig info"-elementer via en egen seksjon øverst
- Samme redigeringsflyt som rutiner (tittel, beskrivelse, bilder), men uten prioritet/checkbox-logikk

### Datamodell

Ny tabell `shift_info`:

| Kolonne | Type | Beskrivelse |
|---------|------|-------------|
| id | uuid | PK |
| shift_id | uuid | FK til shifts |
| title | text | Kort tittel |
| description | text | Detaljert info |
| image_urls | text[] | Bilder |
| order_index | int | Sortering |
| created_at | timestamptz | Opprettet |

RLS: Alle autentiserte kan lese, kun admin kan CRUD.

### Teknisk plan

1. **Database**: Opprett `shift_info`-tabell med RLS
2. **SectionManager.tsx**: Legg til en "Viktig Info"-seksjon øverst med opprett/rediger/slett-funksjonalitet (samme DropdownMenu-mønster som seksjoner)
3. **EmployeeDashboard.tsx**: Hent `shift_info` for valgt vakt og vis dem i en distinkt info-boks mellom verktøysraden og rutinene. Bruk `Info`-ikon, blå/nøytral farge, ingen checkbox
4. **SearchDialog.tsx**: Inkluder viktig info i søkeresultater

### Filer som endres

| Fil | Endring |
|-----|---------|
| Ny migration | `shift_info`-tabell + RLS |
| `src/components/SectionManager.tsx` | Viktig info CRUD for admin |
| `src/pages/EmployeeDashboard.tsx` | Vis viktig info over rutiner |
| `src/components/SearchDialog.tsx` | Søk i viktig info |

