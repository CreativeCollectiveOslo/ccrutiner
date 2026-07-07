import { useStore } from "@/contexts/StoreContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Store as StoreIcon, Check } from "lucide-react";

export function StoreBar() {
  const { activeStore, availableStores, canSwitchStore, setActiveStore } = useStore();

  if (!activeStore) return null;
  if (!canSwitchStore) return null;


  return (
    <div className="border-b bg-card/30">
      <div className="container mx-auto px-4 py-2 flex items-center justify-between max-w-6xl">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <StoreIcon className="h-3.5 w-3.5" />
          <span>Aktiv butikk:</span>
        </div>
        {canSwitchStore ? (
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1.5 text-sm font-medium hover:text-primary transition-colors">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: activeStore.color_code }}
              />
              {activeStore.name}
              <ChevronDown className="h-3.5 w-3.5" />
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
        ) : (
          <div className="flex items-center gap-1.5 text-sm font-medium">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: activeStore.color_code }}
            />
            {activeStore.name}
          </div>
        )}
      </div>
    </div>
  );
}
