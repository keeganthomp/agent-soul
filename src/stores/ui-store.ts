import { create } from "zustand";

interface UiStore {
  sidebarOpen: boolean;
  theme: "dark" | "light";
  activityFeedOpen: boolean;
  toggleSidebar: () => void;
  toggleTheme: () => void;
  toggleActivityFeed: () => void;
}

export const useUiStore = create<UiStore>((set) => ({
  sidebarOpen: true,
  theme: "dark",
  activityFeedOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  toggleTheme: () =>
    set((s) => ({ theme: s.theme === "dark" ? "light" : "dark" })),
  toggleActivityFeed: () =>
    set((s) => ({ activityFeedOpen: !s.activityFeedOpen })),
}));
