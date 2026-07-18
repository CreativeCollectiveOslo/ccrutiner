## Mål

Ansatte skal kunne loggføre temperaturer på kjøle-/fryseenheter som en del av arbeidsflyten i en vakt. Admin skal kunne definere hvilke enheter som finnes pr. butikk, og kunne se en filtrerbar logg for dokumentasjon til Mattilsynet.

## Konsept: "Temperatur-widget" som legges inn i valgt vakt

Widgeten oppfører seg som et rutine-element (samme kort-utseende som andre rutiner), men i stedet for en avkryssingsboks har den et lite skjema med tallfelt for hver enhet + valgfri kommentar. Admin bestemmer i hvilken vakt widgeten skal ligge og hvilke seksjon den plasseres under — akkurat som med vanlige rutiner. Det gjør at ansatte finner temperaturloggingen der det passer i flowet (morgenåpning, kveldsvakt, etc.).

## Datamodell (nytt)

**`temperature_units`** — enheter admin har opprettet pr. butikk (f.eks. «Kjøleskap kaffedisk», «Fryser bakrom»).
- `store_id`, `name`, `order_index`

**`temperature_widgets`** — plassering av et loggeskjema i en vakt.
- `store_id`, `shift_id`, `section_id` (valgfri), `title` (f.eks. «Morgentemperaturer»), `order_index`
- Kobles til enheter via en join-tabell så samme enhet kan brukes i flere widgets.

**`temperature_widget_units`** (join) — hvilke enheter som skal fylles ut i widgeten.

**`temperature_readings`** — selve loggen.
- `store_id`, `widget_id`, `unit_id`, `user_id`, `value_celsius` (numeric), `note` (valgfri), `created_at`

Alle tabeller får RLS med samme `has_store_access`-mønster som resten av appen (SELECT for butikkmedlemmer, INSERT/UPDATE/DELETE for admin med butikktilgang; ansatte kan bare INSERTe readings).

## Admin-UI

1. **Under «Innstillinger» / ny fane «Temperatur»**: liste over enheter pr. butikk (opprett/rediger/slett), samme mønster som seksjoner.
2. **Inne i en vakt** (`ShiftManager`): ny «+ Temperatur-widget»-knapp ved siden av «+ Seksjon». Åpner dialog: velg tittel, seksjon (valgfri), og hvilke enheter som skal inngå.
3. **Ny fane «Temperaturlogg»** i AdminDashboard:
   - Tabell med kolonner: Dato/tid, Enhet, Temperatur (°C), Loggført av, Kommentar
   - Filtre: datointervall (fra/til), enhet (dropdown), butikkvelger (styres av aktiv butikk som ellers)
   - Sortering: nyeste først, paginert med samme `getPaginationRange`-helper som resten av appen
   - Ingen eksport i første omgang (kan legges til senere)

## Ansatt-UI

I `EmployeeDashboard` når man er inne i en vakt: widgetene rendres på riktig plass mellom seksjoner/rutiner. Hver widget viser:
- Tittel
- Ett tallfelt (`inputMode="decimal"`) pr. enhet med enhetens navn som label og «°C» som suffix
- Valgfritt kommentarfelt
- «Lagre målinger»-knapp som sender én rad pr. utfylt enhet til `temperature_readings`
- Under skjemaet: siste måling pr. enhet vist som liten grå tekst («Sist: 3,2 °C kl. 08:14 av Anna») så ansatt ser at det er registrert

Widgeten «tømmer seg» etter lagring og viser en kort bekreftelse (toast). Den regnes ikke som «avkrysset» slik som en rutine — den kan brukes flere ganger i løpet av vakten hvis noen vil logge på nytt.

## Tekniske detaljer

- Norsk locale (nb-NO) og komma som desimalskille i visning; internt lagres tall som numeric.
- Filtrering i admin-loggen gjøres server-side via Supabase-spørring (`gte`/`lte` på `created_at`, `eq` på `unit_id`).
- Ingen grenseverdier / varsler i denne omgangen — kun råloggen.
- Realtime-abonnement på `temperature_readings` er ikke nødvendig i første omgang.

## Rekkefølge for implementasjon

1. Migrasjon: fire nye tabeller + RLS + GRANTs.
2. Admin: enhet-manager (CRUD).
3. Admin: widget-oppretting inne i vakt.
4. Ansatt: widget-rendering + innsending i vakt.
5. Admin: temperaturlogg-fane med filtre og paginering.
