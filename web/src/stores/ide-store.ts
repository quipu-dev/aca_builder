import { create } from 'zustand';

export type TabType = 'atom' | 'manifest' | 'lookup' | 'composer' | 'graph' | 'preview';

export interface IdeTab {
  id: string; // 唯一键，例如 'atom:d1-profile', 'manifest:test_pkg/agent', 'lookup:pkg_a::d1l-api'
  type: TabType;
  title: string;
  closable: boolean;
  atomId?: string;
  manifestName?: string;
  lookupKey?: string;
  isDirty?: boolean;
}

interface IdeState {
  tabs: IdeTab[];
  activeTabId: string;
  splitTabId: string | null; // 右侧分屏中显示的 Tab ID，若为 null 则单视口
  isSplitActive: boolean;

  sidebarOpen: boolean;
  activeSidebarView: 'explorer' | 'search';
  bottomPanelOpen: boolean;
  activeBottomTab: 'problems' | 'output';

  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setActiveSidebarView: (view: 'explorer' | 'search') => void;

  setBottomPanelOpen: (open: boolean) => void;
  toggleBottomPanel: () => void;
  setActiveBottomTab: (tab: 'problems' | 'output') => void;

  openTab: (tab: IdeTab, splitSide?: 'primary' | 'secondary') => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  setSplitTab: (tabId: string | null) => void;
  toggleSplit: () => void;
  setTabDirty: (tabId: string, isDirty: boolean) => void;
}

export const useIdeStore = create<IdeState>((set, get) => ({
  tabs: [],
  activeTabId: '',
  splitTabId: null,
  isSplitActive: false,

  sidebarOpen: true,
  activeSidebarView: 'explorer',
  bottomPanelOpen: false,
  activeBottomTab: 'problems',

  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setActiveSidebarView: (view) => set({ activeSidebarView: view, sidebarOpen: true }),

  setBottomPanelOpen: (open) => set({ bottomPanelOpen: open }),
  toggleBottomPanel: () => set((state) => ({ bottomPanelOpen: !state.bottomPanelOpen })),
  setActiveBottomTab: (tab) => set({ activeBottomTab: tab, bottomPanelOpen: true }),

  openTab: (tab, splitSide = 'primary') => {
    const { tabs } = get();
    const existing = tabs.find((t) => t.id === tab.id);
    const updatedTabs = existing ? tabs : [...tabs, tab];

    if (splitSide === 'secondary') {
      set({
        tabs: updatedTabs,
        splitTabId: tab.id,
        isSplitActive: true,
      });
    } else {
      set({
        tabs: updatedTabs,
        activeTabId: tab.id,
      });
    }
  },

  closeTab: (tabId) => {
    const { tabs, activeTabId, splitTabId } = get();
    const target = tabs.find((t) => t.id === tabId);
    if (!target || !target.closable) return;

    const remaining = tabs.filter((t) => t.id !== tabId);
    let nextActiveId = activeTabId;
    let nextSplitId = splitTabId;

    if (activeTabId === tabId) {
      const closedIndex = tabs.findIndex((t) => t.id === tabId);
      const nextTab = remaining[Math.max(0, closedIndex - 1)];
      nextActiveId = nextTab ? nextTab.id : (remaining[0]?.id ?? '');
    }

    if (splitTabId === tabId) {
      nextSplitId = null;
    }

    set({
      tabs: remaining,
      activeTabId: nextActiveId,
      splitTabId: nextSplitId,
      isSplitActive: nextSplitId !== null,
    });
  },

  setActiveTab: (tabId) => set({ activeTabId: tabId }),

  setSplitTab: (tabId) =>
    set({
      splitTabId: tabId,
      isSplitActive: tabId !== null,
    }),

  toggleSplit: () => {
    const { isSplitActive, tabs, activeTabId } = get();
    if (isSplitActive) {
      set({ isSplitActive: false, splitTabId: null });
    } else {
      // 开启分屏：选取一个非当前的 Tab 或当前 Tab 复制
      const otherTab = tabs.find((t) => t.id !== activeTabId) || tabs[0];
      set({
        isSplitActive: true,
        splitTabId: otherTab ? otherTab.id : activeTabId,
      });
    }
  },

  setTabDirty: (tabId, isDirty) =>
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === tabId ? { ...t, isDirty } : t)),
    })),
}));
