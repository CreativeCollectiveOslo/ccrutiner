

# Justering af værktøjslinjen i vagt-visning

## Hvad der ændres

### Nuværende layout:
```
📱 Hold skjerm våken [○]     [↺] Nulstil
```

### Nyt layout:
```
[○] Hold skærmen vågen  |  ↺ Nulstil
```

---

## Ændringer

1. **Fjern telefonikon** - Smartphone-ikonet fjernes
2. **Switch først** - Switchen flyttes til venstre for teksten
3. **Tekst altid synlig på nulstil** - Fjern `hidden sm:inline` så "Nulstil" altid vises
4. **Lodret separator** - Tilføj en `Separator` komponent med `orientation="vertical"` mellem de to funktioner

---

## Teknisk implementation

**Fil: `src/pages/EmployeeDashboard.tsx`**

Linjer 690-727 opdateres:

```typescript
<div className="flex items-center justify-between gap-4 py-2 px-3 bg-muted/50 rounded-lg">
  {wakeLockSupported && (
    <>
      <div className="flex items-center gap-2">
        <Switch
          id="wake-lock"
          checked={wakeLockActive}
          onCheckedChange={toggleWakeLock}
        />
        <label htmlFor="wake-lock" className="text-sm text-muted-foreground cursor-pointer">
          Hold skærmen vågen
        </label>
      </div>
      
      <Separator orientation="vertical" className="h-6 bg-border" />
    </>
  )}
  
  <AlertDialog>
    <AlertDialogTrigger asChild>
      <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive ml-auto">
        <RotateCcw className="h-4 w-4 mr-2" />
        Nulstil
      </Button>
    </AlertDialogTrigger>
    {/* ... resten af AlertDialog uændret */}
  </AlertDialogContent>
  </AlertDialog>
</div>
```

**Import tilføjes:**
```typescript
import { Separator } from "@/components/ui/separator";
```

---

## Visuelt resultat

```
┌─────────────────────────────────────────────────┐
│  [○] Hold skærmen vågen  │  ↺ Nulstil           │
└─────────────────────────────────────────────────┘
```

- Switch til venstre
- Tekst "Hold skærmen vågen" til højre for switch
- Lodret separator (|) mellem de to funktioner
- "Nulstil" med ikon og tekst altid synlig

---

## Fil der ændres

| Fil | Ændring |
|-----|---------|
| `src/pages/EmployeeDashboard.tsx` | Omstrukturér værktøjslinje, tilføj Separator import |

