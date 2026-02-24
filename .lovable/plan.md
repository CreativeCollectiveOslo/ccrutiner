

# Bedre overblik i Admin Dashboard - Rutinesiden

## Problemanalyse

Rutinesiden har flere UX-problemer:

1. **Flad informationsstruktur** - Vagt-header, sektioner og rutinekort bruger alle lignende styling (samme font-størrelse, samme spacing), så intet skiller sig ud
2. **For mange synlige handlingsknapper** - Hver sektion viser 5 knapper (op, ned, ny rutine, rediger, slet) og hvert rutinekort viser 3 knapper - alt sammen synligt hele tiden
3. **Ingen visuel gruppering** - Sektioner og usorterede rutiner flyder sammen uden tydelig adskillelse
4. **Manglende hierarki** - "Usorterede rutiner" og navngivne sektioner ser ens ud

## UX-principper der anvendes

- **Miller's Law** (begrans synlig kompleksitet): Skjul sekundare handlinger bag en menu-knap i stedet for at vise alle knapper
- **Law of Proximity** (Gestalt): Grupper sektionsheader og rutinekort tettere sammen, med mere luft _mellem_ sektioner
- **Visual Hierarchy**: Brug font-storrelse, farve og spacing til at skabe tydelige niveauer
- **Law of Common Region**: Giv sektioner en tydelig visuel ramme (baggrund) som adskiller dem
- **Aesthetic-Usability Effect**: Et renere interface foler sig lettere at bruge

## Foreslaaede aendringer

### 1. Rens op i handlingsknapper (Miller's Law)

**Sektionsheader**: Erstat de 5 separate knapper (op, ned, rediger, slet, ny rutine) med:
- En "Ny Rutine" knap (primaer handling, altid synlig)
- En "..." dropdown-menu med: Rediger, Flyt op, Flyt ned, Slet (sekundaere handlinger)

**Rutinekort**: Erstat de 3 synlige knapper (flyt, rediger, slet) med:
- En "..." dropdown-menu der vises ved hover/klik

### 2. Tydeligere visuelt hierarki

| Element | Nu | Forslag |
|---------|-----|---------|
| Vagt-header (i SectionManager) | `text-xl` | `text-lg font-semibold` - behov ikke vaere storst da vakten allerede er valgt i karrusellen |
| Sektionsheader | `font-medium` med FolderOpen-ikon | `text-xs font-semibold uppercase tracking-wider text-muted-foreground` som label-stil, med tydelig baggrund |
| Rutinekort | Card med `p-4` | Simplere, uden fuld Card-ramme - brug en lettere border-bottom stil |

### 3. Sektioner som tydelige grupper (Law of Common Region + Proximity)

- Hver sektion faar en subtil `bg-muted/30` baggrund med `rounded-lg` og intern padding
- Mere spacing mellem sektioner (`space-y-8` i stedet for `space-y-6`)
- Sektionsheaderen faar en `border-b` for at adskille den fra rutinerne under den
- "Usorterede rutiner" sektionen faar samme visuelle behandling som navngivne sektioner

### 4. Renere rutinekort

- Fjern Card-wrapperen og brug en simplere `border-b` mellem rutiner for at reducere visuel stoj
- Handlingsknapper gemmes i en DropdownMenu (tre-prikker ikon) der kun vises ved hover

---

## Teknisk plan

### Fil 1: `src/components/SectionManager.tsx`

1. **Import** `DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger` fra Radix og `MoreHorizontal` fra lucide
2. **Sektionsheader** (linje 551-606): Erstat knap-raekken med:
   - Venstre: `text-xs font-semibold uppercase tracking-wider text-muted-foreground` label + Badge med antal
   - Hoejre: "Ny Rutine" knap (sm) + DropdownMenu med Rediger/Flyt op/Flyt ned/Slet
3. **Sektions-wrapper** (linje 549): Aendre fra `Card` til en `div` med `bg-muted/30 rounded-lg p-4`
4. **Rutinekort** (`renderRoutineCard`, linje 423-476): Erstat de 3 synlige knapper med en DropdownMenu (MoreHorizontal-ikon). Fjern Card-wrapper og brug `border-b last:border-b-0 py-3` i stedet
5. **Usorterede rutiner** (linje 521-543): Giv samme visuelle stil som navngivne sektioner (baggrund, padding, header-stil)
6. **Spacing**: Aendre `space-y-6` til `space-y-8` paa ydre container for mere luft mellem sektioner
7. **Vagt-header** (linje 481-487): Aendre `text-xl` til `text-lg font-semibold`

### Fil 2: `src/pages/AdminDashboard.tsx`

Ingen aendringer noevendige - karrusellen og overordnet layout er allerede godt.

### Ingen database-aendringer

Alle aendringer er rent visuelle/UI.

