import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';

const COLLAPSED_KEY = 'sidebar_collapsed';
const EXPANDED_GROUPS_KEY = 'sidebar_expanded_groups';

const defaultExpandedGroups: Record<string, boolean> = {
  Overview: true,
  Hotel: true,
  Restaurant: true,
  Finance: true,
  Settings: false,
  Business: true,
  Platform: true,
};

interface SidebarContextValue {
  collapsed: boolean;
  toggleCollapsed: () => void;
  setCollapsed: (value: boolean) => void;
  expandedGroups: Record<string, boolean>;
  toggleGroup: (group: string) => void;
  onClose?: () => void;
}

const SidebarContext = createContext<SidebarContextValue | undefined>(undefined);

function readBool(key: string, fallback: boolean): boolean {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : raw === 'true';
  } catch {
    return fallback;
  }
}

function readGroups(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(EXPANDED_GROUPS_KEY);
    if (!raw) return defaultExpandedGroups;
    return { ...defaultExpandedGroups, ...JSON.parse(raw) };
  } catch {
    return defaultExpandedGroups;
  }
}

export function SidebarProvider({ children, onClose }: { children: ReactNode; onClose?: () => void }) {
  const [collapsed, setCollapsedState] = useState<boolean>(() => readBool(COLLAPSED_KEY, false));
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => readGroups());

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSED_KEY, String(collapsed));
    } catch {
      /* ignore */
    }
  }, [collapsed]);

  useEffect(() => {
    try {
      localStorage.setItem(EXPANDED_GROUPS_KEY, JSON.stringify(expandedGroups));
    } catch {
      /* ignore */
    }
  }, [expandedGroups]);

  const setCollapsed = useCallback((value: boolean) => setCollapsedState(value), []);
  const toggleCollapsed = useCallback(() => setCollapsedState((c) => !c), []);
  const toggleGroup = useCallback((group: string) => {
    setExpandedGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  }, []);

  const value = useMemo<SidebarContextValue>(
    () => ({ collapsed, toggleCollapsed, setCollapsed, expandedGroups, toggleGroup, onClose }),
    [collapsed, toggleCollapsed, setCollapsed, expandedGroups, toggleGroup, onClose]
  );

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error('useSidebar must be used within a SidebarProvider');
  return ctx;
}
