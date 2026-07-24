import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";

export interface Store {
  id: string;
  name: string;
  slug: string;
  color_code: string;
}

interface StoreContextType {
  activeStore: Store | null;
  availableStores: Store[];
  isSuperAdmin: boolean;
  isAdmin: boolean;
  canSwitchStore: boolean;
  setActiveStore: (id: string) => void;
  refreshStores: () => Promise<void>;
  loading: boolean;
  /** Increments each time the user explicitly switches to a different store.
   *  Subscribe with useEffect to reset local UI state (selected items, pagination, etc.). */
  storeSwitchKey: number;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);
const ACTIVE_STORE_KEY = "active_store_id";

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [availableStores, setAvailableStores] = useState<Store[]>([]);
  const [activeStore, setActiveStoreState] = useState<Store | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadForUser = useCallback(async () => {
    if (!user) {
      setAvailableStores([]);
      setActiveStoreState(null);
      setIsSuperAdmin(false);
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const roleSet = new Set((roles || []).map((r: any) => r.role));
    const superA = roleSet.has("super_admin");
    const adminA = roleSet.has("admin") || superA;
    setIsSuperAdmin(superA);
    setIsAdmin(adminA);

    let stores: Store[] = [];
    if (adminA) {
      const { data } = await supabase
        .from("stores")
        .select("id, name, slug, color_code")
        .order("name");
      stores = data || [];
    } else {
      const { data } = await supabase
        .from("store_members")
        .select("stores(id, name, slug, color_code)")
        .eq("user_id", user.id);
      stores = ((data || []) as any[])
        .map((r) => r.stores)
        .filter(Boolean)
        .sort((a, b) => a.name.localeCompare(b.name));
    }

    setAvailableStores(stores);

    const stored = localStorage.getItem(ACTIVE_STORE_KEY);
    const active =
      stores.find((s) => s.id === stored) || stores[0] || null;
    setActiveStoreState(active);
    if (active) localStorage.setItem(ACTIVE_STORE_KEY, active.id);

    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      loadForUser();
    }
  }, [authLoading, loadForUser]);

  const setActiveStore = (id: string) => {
    const store = availableStores.find((s) => s.id === id);
    if (store) {
      setActiveStoreState(store);
      localStorage.setItem(ACTIVE_STORE_KEY, store.id);
    }
  };

  return (
    <StoreContext.Provider
      value={{
        activeStore,
        availableStores,
        isSuperAdmin,
        isAdmin,
        canSwitchStore: availableStores.length > 1,
        setActiveStore,
        refreshStores: loadForUser,
        loading,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
