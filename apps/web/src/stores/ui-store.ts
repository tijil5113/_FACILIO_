import { create } from "zustand";

interface UiNotice {
  message: string;
}

interface UiState {
  mobileNavOpen: boolean;
  commandPaletteOpen: boolean;
  helpOpen: boolean;
  contextTitle: string | null;
  notice: UiNotice | null;
  liveMessage: string;
  openMobileNav: () => void;
  closeMobileNav: () => void;
  toggleMobileNav: () => void;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  toggleCommandPalette: () => void;
  openHelp: () => void;
  closeHelp: () => void;
  toggleHelp: () => void;
  setContextTitle: (title: string | null) => void;
  showNotice: (message: string) => void;
  clearNotice: () => void;
  announce: (message: string) => void;
}

export const useUiStore = create<UiState>((set) => ({
  mobileNavOpen: false,
  commandPaletteOpen: false,
  helpOpen: false,
  contextTitle: null,
  notice: null,
  liveMessage: "",
  openMobileNav: () => {
    set({ mobileNavOpen: true, commandPaletteOpen: false, helpOpen: false });
  },
  closeMobileNav: () => {
    set({ mobileNavOpen: false });
  },
  toggleMobileNav: () => {
    set((state) => ({
      mobileNavOpen: !state.mobileNavOpen,
      commandPaletteOpen: false,
      helpOpen: false,
    }));
  },
  openCommandPalette: () => {
    set({ commandPaletteOpen: true, mobileNavOpen: false, helpOpen: false });
  },
  closeCommandPalette: () => {
    set({ commandPaletteOpen: false });
  },
  toggleCommandPalette: () => {
    set((state) => ({
      commandPaletteOpen: !state.commandPaletteOpen,
      mobileNavOpen: false,
      helpOpen: false,
    }));
  },
  openHelp: () => {
    set({ helpOpen: true, commandPaletteOpen: false, mobileNavOpen: false });
  },
  closeHelp: () => {
    set({ helpOpen: false });
  },
  toggleHelp: () => {
    set((state) => ({
      helpOpen: !state.helpOpen,
      commandPaletteOpen: false,
      mobileNavOpen: false,
    }));
  },
  setContextTitle: (contextTitle) => {
    set({ contextTitle });
  },
  showNotice: (message) => {
    set({ notice: { message } });
  },
  clearNotice: () => {
    set({ notice: null });
  },
  announce: (liveMessage) => {
    set({ liveMessage });
  },
}));

export function resetUiStore(): void {
  useUiStore.setState({
    mobileNavOpen: false,
    commandPaletteOpen: false,
    helpOpen: false,
    contextTitle: null,
    notice: null,
    liveMessage: "",
  });
}
