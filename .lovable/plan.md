## Mål
Kopiere alt innhold fra vaktene **"Tips til introduksjon til kunder"** og **"Info"** (Oslo-butikken) inn i Info-fanen, slik at samme innhold blir tilgjengelig som info-bank uten avkrysning.

## Hva som finnes i dag
- Vakten **"Info"**: 6 seksjoner, 23 rutiner (med beskrivelser/bilder).
- Vakten **"Tips til introduksjon til kunder"**: 0 seksjoner, 15 rutiner (ligger direkte under vakten uten seksjon).

## Plan
Én database-migrasjon som kopierer data. Ingenting slettes — originalvaktene forblir uendret.

1. **Opprett to nye info-kategorier** i Oslo-butikken:
   - "Info" — farge `#f73b3b`, ikon `Briefcase` (samme som vakten).
   - "Tips til introduksjon til kunder" — farge `#3bf4f7`, ikon `Sun`.
2. **Kopier seksjoner** fra vakten "Info" til den nye "Info"-kategorien (samme navn og rekkefølge).
3. **Kopier rutiner som info-elementer** (`shift_info`):
   - Rutiner fra "Info" → knyttes til tilhørende ny seksjon i "Info"-kategorien.
   - Rutiner fra "Tips til introduksjon til kunder" → legges direkte under kategorien (uten seksjon, siden vakten ikke har seksjoner).
   - Tittel, beskrivelse, bilder (`image_urls`) og rekkefølge (`order_index`) beholdes.

## Etterpå
Bekreft i Info-fanen at begge kategoriene vises med korrekt innhold. Originalvaktene i Vakter-fanen røres ikke — si fra hvis du vil at jeg fjerner dem etterpå.
