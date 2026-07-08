## Mål
Sørge for at installerte PWA-er (mobil + hjemskjerm) alltid henter siste versjon av appen kort tid etter publisering, slik at ingen ser gammelt innhold slik som Info-fanen nå.

## Hvorfor det skjer i dag
- `vite-plugin-pwa` er konfigurert med `registerType: "autoUpdate"`, men uten en kontrollert wrapper og uten `injectRegister: null`. Plugin-en registrerer service worker overalt (også i Lovable-preview via iframe når publisert), og HTML serveres via `navigateFallback` mot precachen — som i praksis blir "cache-first" for `index.html`.
- Resultat: telefonen holder på gammel `index.html` + gamle JS-chunks helt til brukeren manuelt lukker/tømmer appen.

## Endringer

### 1. `vite.config.ts` — trygg SW-konfig
- Legg til `injectRegister: null` og `devOptions: { enabled: false }`.
- Behold `registerType: "autoUpdate"`.
- I `workbox`:
  - Fjern `navigateFallback` mot `/index.html` fra precache.
  - Legg til `runtimeCaching`-regel for navigasjoner (`request.mode === "navigate"`) med **NetworkFirst**, kort `networkTimeoutSeconds`, egen cache `html-cache`.
  - Legg til `navigateFallbackDenylist` for `/~oauth`.
  - Behold øvrige regler (fonts, bilder, Supabase API).

### 2. Ny fil `src/pwa/registerSW.ts` — guarded wrapper
Én modul som er eneste sted SW-en registreres. Nekter registrering og avregistrerer eksisterende `/sw.js` når:
- `!import.meta.env.PROD`
- appen kjører i iframe
- hostname starter med `id-preview--` eller `preview--`
- hostname er/ender på `lovableproject.com`, `lovableproject-dev.com`, `beta.lovable.dev`
- URL har `?sw=off`

Ellers: bruk `registerSW` fra `virtual:pwa-register` med:
- `immediate: true`
- `onNeedRefresh`: kall `updateSW(true)` automatisk (auto-reload — brukeren har allerede sagt at det er greit).
- `onRegisteredSW`: `setInterval` hver 60 sek → `registration.update()` slik at åpne PWA-er oppdager ny versjon raskt uten at brukeren må lukke appen.

### 3. `src/main.tsx`
Importer og kall wrapperen én gang ved app-oppstart. Ingen andre steder skal registrere SW.

### 4. Rydd bort utilsiktet auto-inject
Ingen andre filer registrerer SW i dag, så ingenting å fjerne — men bekrefter at `injectRegister: null` gjør at plugin-en ikke sniker inn en registrering i `index.html`.

## Etter deploy
- Nåværende installerte PWA-er bruker gammel SW som allerede har `autoUpdate`. Ved neste åpning henter den ny `/sw.js`, som deretter tar over og auto-reloader vinduet. Fra da av vil `NetworkFirst` + 60-sek update-polling holde alle klienter ferske innen ~1 minutt etter hver publisering.
- Brukeren trenger ikke gjøre noe manuelt neste gang.

## Teknisk merknad
- Vi kaster ikke gammel SW via kill-switch — den nåværende er ikke "ødelagt", bare feilkonfigurert. `autoUpdate` + NetworkFirst på HTML er nok til å konvergere.
- Ingen endringer på Info-fane eller annen forretningslogikk.
