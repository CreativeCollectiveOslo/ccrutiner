

# Info-kategorier: Gruppering av viktig informasjon

## Konsept

Info-siden faar et mellomlag med **kategorier** (f.eks. "Betaling", "Sikkerhet", "Utstyr"). Naar man aapner Info-fanen ser man kategori-kort. Klikk paa et kort viser info-elementene i den kategorien.

## Database-endring

Ny tabell `info_categories`:

| Kolonne | Type | Default |
|---------|------|---------|
| id | uuid | gen_random_uuid() |
| name | text | required |
| icon | text | 'Info' |
| order_index | integer | 0 |
| created_at | timestamptz | now() |

RLS: Authenticated kan lese, admin kan CRUD.

Legg til kolonne paa `shift_info`:
- `category_id uuid REFERENCES info_categories(id) ON DELETE SET NULL` (nullable for bakoverkompatibilitet)

## Brukerflyt

```text
Info-fanen:
┌─────────────┐ ┌─────────────┐
│  Betaling   │ │  Sikkerhet  │
│      💰     │ │      🛡     │
└─────────────┘ └─────────────┘
┌─────────────┐
│   Utstyr    │
│      🔧     │
└─────────────┘

Klikk "Betaling":
← Tilbake
Betaling
┌─ Info-kort 1 ──────────────┐
│ Loennsdag er den 25. ...   │
└────────────────────────────┘
┌─ Info-kort 2 ──────────────┐
│ Overtid registreres i ...  │
└────────────────────────────┘
```

## Filer som endres

| Fil | Endring |
|-----|---------|
| Ny migration | `info_categories`-tabell + `category_id` paa `shift_info` + RLS |
| `src/pages/EmployeeDashboard.tsx` | Info-fanen viser kategorier, klikk aapner kategori-detalj med tilbake-knapp |
| `src/components/ViktigInfoManager.tsx` | Admin: CRUD for kategorier + tildel info til kategori |
| `src/pages/AdminDashboard.tsx` | Eventuelt oppdater admin info-tab |

### Ingen breaking changes
Eksisterende info uten kategori vises i en "Generelt"-gruppe.

