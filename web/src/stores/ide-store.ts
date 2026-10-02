import { create } from 'zustand';

export type TabType = 'atom' | 'manifest' | 'lookup' | 'composer' | 'graph' | 'preview' | 'empty';

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

export interface HistoryEntry {
  tab: IdeTab;
}

interface IdeState {
  tabs: IdeTab[];
  activeTabId: string;

  // 视口导航历史栈
  navigationHistory: HistoryEntry[];
  historyIndex: number;

  // 视口状态外置快照池 (零 DOM 膨胀的状态持久化)
  tabSnapshots: Record<string, unknown>;
  saveSnapshot: (tabId: string, snapshot: unknown) => void;
  getSnapshot: <T = unknown>(tabId: string) => T | undefined;
  clearSnapshot: (tabId: string) => void;

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

  openTab: (tab: IdeTab, options?: boolean | { newTab?: boolean; fromHistory?: boolean }) => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  setTabDirty: (tabId: string, isDirty: boolean) => void;

  goBack: () => void;
  goForward: () => void;
}

const INITIAL_EMPTY_TAB: IdeTab = {
  id: 'empty:home',
  type: 'empty',
  title: '开始',
  closable: false,
};

export const useIdeStore = create<IdeState>((set, get) => ({
  tabs: [INITIAL_EMPTY_TAB],
  activeTabId: INITIAL_EMPTY_TAB.id,

  navigationHistory: [{ tab: INITIAL_EMPTY_TAB }],
  historyIndex: 0,

  tabSnapshots: {},
  saveSnapshot: (tabId, snapshot) =>
    set((state) => ({
      tabSnapshots: {
        ...state.tabSnapshots,
        [tabId]: snapshot,
      },
    })),
  getSnapshot: <T>(tabId: string) => get().tabSnapshots[tabId] as T | undefined,
  clearSnapshot: (tabId) =>
    set((state) => {
      const rest = { ...state.tabSnapshots };
      delete rest[tabId];
      return { tabSnapshots: rest };
    }),

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

  openTab: (tab, options = false) => {
    const { tabs, activeTabId, navigationHistory, historyIndex } = get();
    const newTab = typeof options === 'boolean' ? options : !!options?.newTab;
    const fromHistory = typeof options === 'object' && !!options?.fromHistory;

    // 历史栈压入逻辑：非后退/前进触发时更新历史
    if (!fromHistory) {
      const currentEntry = navigationHistory[historyIndex];
      // 避免重复入栈同一个目标
      if (!currentEntry || currentEntry.tab.id !== tab.id) {
        const truncated = navigationHistory.slice(0, historyIndex + 1);
        const updatedHistory = [...truncated, { tab }];
        set({
          navigationHistory: updatedHistory,
          historyIndex: updatedHistory.length - 1,
        });
      }
    }

    // 1. 若目标 Tab 已经打开，直接激活跳转
    const existingIndex = tabs.findIndex((t) => t.id === tab.id);
    if (existingIndex !== -1) {
      set({ activeTabId: tab.id });
      return;
    }

    // 2. 主视口默认模式：就地替换 vs 新建标签页
    const currentActiveTab = tabs.find((t) => t.id === activeTabId);
    // 可就地替换条件：未按 Ctrl 且 当前 Tab 未被编辑修改
    const canReplaceCurrent = !newTab && currentActiveTab && !currentActiveTab.isDirty;

    if (canReplaceCurrent) {
      const currentIndex = tabs.findIndex((t) => t.id === activeTabId);
      const updatedTabs = [...tabs];
      updatedTabs[currentIndex] = tab;
      set({
        tabs: updatedTabs,
        activeTabId: tab.id,
      });
    } else {
      // 过滤掉不可关闭且未使用的初始空白欢迎页（若存在）
      const cleanTabs =
        tabs.length === 1 && tabs[0].type === 'empty' && !tabs[0].isDirty ? [] : tabs;
      set({
        tabs: [...cleanTabs, tab],
        activeTabId: tab.id,
      });
    }
  },

  goBack: () => {
    const { historyIndex, navigationHistory } = get();
    if (historyIndex <= 0) return;
    const nextIndex = historyIndex - 1;
    const targetTab = navigationHistory[nextIndex].tab;
    set({ historyIndex: nextIndex });
    get().openTab(targetTab, { fromHistory: true });
  },

  goForward: () => {
    const { historyIndex, navigationHistory } = get();
    if (historyIndex >= navigationHistory.length - 1) return;
    const nextIndex = historyIndex + 1;
    const targetTab = navigationHistory[nextIndex].tab;
    set({ historyIndex: nextIndex });
    get().openTab(targetTab, { fromHistory: true });
  },

  closeTab: (tabId) => {
    const { tabs, activeTabId } = get();
    const target = tabs.find((t) => t.id === tabId);
    if (!target || !target.closable) return;

    const remaining = tabs.filter((t) => t.id !== tabId);
    let nextActiveId = activeTabId;

    if (remaining.length === 0) {
      const emptyTab: IdeTab = {
        id: 'empty:home',
        type: 'empty',
        title: '开始',
        closable: false,
      };
      set({
        tabs: [emptyTab],
        activeTabId: emptyTab.id,
      });
      return;
    }

    if (activeTabId === tabId) {
      const closedIndex = tabs.findIndex((t) => t.id === tabId);
      const nextTab = remaining[Math.max(0, closedIndex - 1)];
      nextActiveId = nextTab ? nextTab.id : (remaining[0]?.id ?? '');
    }

    set({
      tabs: remaining,
      activeTabId: nextActiveId,
    });
  },

  setActiveTab: (tabId) => set({ activeTabId: tabId }),

  setTabDirty: (tabId, isDirty) =>
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === tabId ? { ...t, isDirty } : t)),
    })),
}));
