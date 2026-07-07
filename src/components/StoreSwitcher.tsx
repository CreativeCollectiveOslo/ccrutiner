import { useStore } from "@/contexts/StoreContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown, Store as StoreIcon, Check } from "lucide-react";

export function StoreSwitcher() {
  const { activeStore, availableStores, canSwitchStore, setActiveStore } = useStore();

  if (!activeStore) return null;

  if (!canSwitchStore) {
    return (
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <StoreIcon className="h-3.5 w-3.5" />
        <span>{activeStore.name}</span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 gap-1.5">
          <StoreIcon className="h-3.5 w-3.5" />
          <span className="text-sm">{activeStore.name}</span>
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {availableStores.map((store) => (
          <DropdownMenuItem
            key={store.id}
            onClick={() => setActiveStore(store.id)}
            className="gap-2"
          >
            <div
              className="h-2.5 w-2.5 rounded-full shrink-0"
              style={{ backgroundColor: store.color_code }}
            />
            <span className="flex-1">{store.name}</span>
            {store.id === activeStore.id && <Check className="h-3.5 w-3.5" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
