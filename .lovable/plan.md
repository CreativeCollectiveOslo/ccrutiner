
## Mål
Erstatte det frittstående temperatur-systemet med:
1. En «Logger»-fane hos admin som administrerer **målepunkter** (f.eks. «Kjøleskapet under kaffemaskinen»).
2. Loggføring som en **rutine-type** inne i vaktene — ansatte krysser av en logg-rutine ved å angi en temperatur.

## Admin — «Logger»-fanen (erstatter «Temperatur»)

Ett nivå, en liste med målepunkter per butikk:

- **Opprett målepunkt** — kun navn.
- **Åpne målepunkt** viser detaljvisning med:
  - Redigerbart navn (lagres inline).
  - Alle målinger (nyeste først, paginert) med temperatur, dato/tid, hvem som logget, evt. notat, og hvilken rutine/vakt den kom fra.
  - Filtre: fra/til dato.
  - Knapp **«Eksporter CSV»** — laster ned filtrerte målinger (`dato, temperatur_c, målepunkt, bruker, vakt, rutine, notat`).
  - Knapp **«Slett målepunkt»** med bekreftelse (målinger beholdes historisk, men målepunktet fjernes fra valglisten i rutiner).

«Skjemaer»-underfanen og widget-visningen i vaktene fjernes helt.

## Admin — Rutiner: ny oppgavetype

I «Ny rutine»- og «Rediger rutine»-dialogen (i `SectionManager.tsx`):

- Nytt felt **«Type oppgave»** øverst: `Vanlig` (default) eller `Loggføring`.
- Hvis `Loggføring` velges: vis en **«Målepunkt»**-dropdown med alle målepunkter i butikken (påkrevd). Beskrivelse/bilder/prioritet fungerer som før.
- Hvis `Vanlig`: skjul målepunkt-feltet.

Rutinekortet i admin-listen får en liten badge «Loggføring · {målepunkt}» når type er loggføring.

## Ansatt — kryss av loggføring med temperatur

I `EmployeeDashboard.tsx` render av rutiner:

- Vanlige rutiner: uendret checkbox-oppførsel.
- Loggførings-rutiner: checkboxen åpner en liten popover/dialog:
  - Tallfelt for temperatur (desimal, `°C`, samme validering som dagens widget).
  - Valgfritt notat-felt.
  - «Lagre»-knapp → lagrer i `temperature_readings` (med `routine_id`, `unit_id`, `store_id`, `user_id`) **og** markerer rutinen som fullført via samme `task_completions`-flyt som i dag.
  - Angre-fjerning: hvis avkrysset og ansatt fjerner haken, slettes både `task_completions`-raden og siste tilhørende måling for den vaktforekomsten (samme dag) — bekreftelse først.
- Siste registrerte verdi vises som liten tekst under tittelen (à la dagens widget).

`TemperatureShiftWidgets`-blokken nederst i vaktvisningen fjernes.

## Tekniske detaljer

Migration:
- `ALTER TABLE public.routines ADD COLUMN task_type text NOT NULL DEFAULT 'vanlig' CHECK (task_type IN ('vanlig','loggforing'));`
- `ALTER TABLE public.routines ADD COLUMN measurement_point_id uuid REFERENCES public.temperature_units(id) ON DELETE SET NULL;`
- `ALTER TABLE public.temperature_readings ADD COLUMN routine_id uuid REFERENCES public.routines(id) ON DELETE SET NULL;`
- Behold `temperature_units` (nå semantisk «målepunkter») og `temperature_readings`. Drop `temperature_widgets` og `temperature_widget_units` (ingen live data brukes utenfor admin-oppsett).
- Ingen RLS-endringer nødvendig — eksisterende `store_id`-scopede policyer dekker de nye kolonnene.

Filer:
- `src/components/TemperatureManager.tsx` → forenkles kraftig til én liste + detaljvisning + CSV-eksport (bygget med `Blob` + `URL.createObjectURL`, ingen ny avhengighet). Fanen døpes om til «Logger».
- `src/pages/AdminDashboard.tsx` → rename tab label `Temperatur` → `Logger`.
- `src/components/SectionManager.tsx` → utvide new/edit-rutine-dialogene med type + målepunkt-dropdown; hente målepunkter for butikken.
- `src/pages/EmployeeDashboard.tsx` → grener render/toggle-logikk på `task_type`; ny liten `LogReadingDialog`-komponent inline eller i `src/components/LogReadingDialog.tsx`.
- Slett `src/components/TemperatureShiftWidgets.tsx` og `src/components/TemperatureWidget.tsx` og fjern referanser.
- Regenererte Supabase-typer plukker opp nye kolonner automatisk etter migrasjonen.

CSV-format (UTF-8, `;`-separator, norske desimaler `,`):
```text
dato;temperatur_c;målepunkt;bruker;vakt;rutine;notat
```

## Migrering av eksisterende data
Ingen produksjonsdata i `temperature_widgets` er avhengig av å bevares (kun oppsett). Eksisterende `temperature_readings` beholdes og vises automatisk under sitt målepunkt — `routine_id` blir bare `NULL` for gamle rader.
