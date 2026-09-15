import { create } from "zustand";

import {
  applyDocumentPreferences,
  defaultPreferences,
  readStoredPreferences,
  writeStoredPreferences,
  type MotionPreference,
  type StoredPreferences,
  type ThemePreference,
} from "@/lib/preferences";

interface PreferencesState extends StoredPreferences {
  setTheme: (theme: ThemePreference) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  setMotion: (motion: MotionPreference) => void;
}

function persist(state: PreferencesState): void {
  const stored: StoredPreferences = {
    theme: state.theme,
    sidebarCollapsed: state.sidebarCollapsed,
    motion: state.motion,
  };
  writeStoredPreferences(stored);
  applyDocumentPreferences(stored);
}

const initial =
  typeof window === "undefined" ? defaultPreferences : readStoredPreferences();

export const usePreferencesStore = create<PreferencesState>((set, get) => ({
  ...initial,
  setTheme: (theme) => {
    set({ theme });
    persist(get());
  },
  setSidebarCollapsed: (sidebarCollapsed) => {
    set({ sidebarCollapsed });
    persist(get());
  },
  toggleSidebar: () => {
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
    persist(get());
  },
  setMotion: (motion) => {
    set({ motion });
    persist(get());
  },
}));

export function resetPreferencesStore(): void {
  writeStoredPreferences(defaultPreferences);
  applyDocumentPreferences(defaultPreferences);
  usePreferencesStore.setState({
    ...defaultPreferences,
  });
}
