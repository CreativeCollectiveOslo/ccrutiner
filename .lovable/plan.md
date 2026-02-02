

# Oprydning af vagt-header + Søgedialog padding-fix

## Oversigt
Denne plan rydder op i layoutet af vagt-headeren og fikser padding-problemet i søgedialogen på mobil.

---

## 1. Vagt-header oprydning

### Nuværende problemer
- Alle elementer er stablet lodret uden visuel gruppering
- Ingen klar prioritet mellem elementer
- Wake lock og "Fjern alle afkrydsninger" føles tilfældigt placeret
- "Fjern alle afkrydsninger"-knappen er for fremtrædende med rød styling

### Forslag til nyt layout

**Prioriteret struktur:**
1. **Primært**: Vagtens navn (stor, tydelig)
2. **Sekundært**: Fremdriftsindikator (kompakt, under navn)
3. **Tertiært**: Værktøjer (wake lock + fjern afkrydsninger) grupperet i et diskret område

**Visuelt layout:**

```text
┌─────────────────────────────────────────────────┐
│  ← Tilbake                                      │
├─────────────────────────────────────────────────┤
│                                                 │
│  Åbne vagt                                      │  ← Stor titel
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 2/10            │  ← Progress bar + tal
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ 📱 Hold skjerm våken  [○]    [Nulstil]  │   │  ← Værktøjslinje
│  └─────────────────────────────────────────┘   │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Tekniske ændringer

**Ny struktur for vagt-header (linjer 672-714):**

```typescript
<div className="space-y-4">
  {/* Title and progress */}
  <div>
    <h2 className="text-2xl font-semibold">{selectedShift.name}</h2>
    <div className="mt-2 flex items-center gap-3">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${routines.length > 0 ? (completions.size / routines.length) * 100 : 0}%` }}
        />
      </div>
      <span className="text-sm text-muted-foreground whitespace-nowrap">
        {completions.size} / {routines.length}
      </span>
    </div>
  </div>

  {/* Tools row - subtle, grouped together */}
  <div className="flex items-center justify-between gap-4 py-2 px-3 bg-muted/50 rounded-lg">
    {wakeLockSupported && (
      <div className="flex items-center gap-2">
        <Smartphone className="h-4 w-4 text-muted-foreground" />
        <label htmlFor="wake-lock" className="text-sm text-muted-foreground cursor-pointer">
          Hold skjerm våken
        </label>
        <Switch
          id="wake-lock"
          checked={wakeLockActive}
          onCheckedChange={toggleWakeLock}
        />
      </div>
    )}
    
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
          <Trash2 className="h-4 w-4 mr-1" />
          <span className="hidden sm:inline">Nulstil</span>
        </Button>
      </AlertDialogTrigger>
      {/* ... AlertDialog content unchanged */}
    </AlertDialog>
  </div>
</div>
```

### Forbedringer
- **Progress bar**: Visuel indikator i stedet for kun tekst
- **Værktøjslinje**: Wake lock og nulstil er samlet i en diskret container
- **Nulstil-knap**: Mindre fremtrædende (ghost variant), kun rød ved hover
- **Responsivt**: "Nulstil" tekst skjult på små skærme, kun ikon vises

---

## 2. Søgedialog padding-fix

### Nuværende problem
- `DialogContent` har `mx-4` for margin, men dialogen kan stadig ramme højre kant
- Der mangler ensartet padding inde i headeren

### Løsning

Opdater styling i `SearchDialog.tsx`:

```typescript
// Nuværende:
<DialogContent className="sm:max-w-md mx-4 sm:mx-0 p-0 gap-0 [&>button:last-child]:hidden">

// Ændres til:
<DialogContent className="sm:max-w-md w-[calc(100%-2rem)] mx-auto sm:mx-0 p-0 gap-0 [&>button:last-child]:hidden">
```

Alternativt, hvis problemet er inde i headeren:

```typescript
// Nuværende:
<DialogHeader className="p-4 pb-2">

// Tjek at padding er ensartet - evt. ændre til:
<DialogHeader className="px-4 pt-4 pb-2">
```

---

## Filer der ændres

| Fil | Ændringer |
|-----|-----------|
| `src/pages/EmployeeDashboard.tsx` | Refaktor vagt-header med progress bar og værktøjslinje |
| `src/components/SearchDialog.tsx` | Fix padding på mobil |

---

## Sammenfatning af forbedringer

### Vagt-header
- Tydeligere visuel hierarki med stor titel øverst
- Progress bar giver bedre overblik end kun tal
- Værktøjer samlet i diskret container
- "Fjern alle afkrydsninger" mindre aggressiv styling

### Søgedialog
- Ensartet luft på begge sider af dialogen på mobil

