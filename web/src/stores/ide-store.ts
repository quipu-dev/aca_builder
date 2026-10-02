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

  openTab: (
    tab: IdeTab,
    options?:
      | 'primary'
      | 'secondary'
      | { newTab?: boolean; splitSide?: 'primary' | 'secondary' }
      | boolean,
  ) => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  setSplitTab: (tabId: string | null) => void;
  toggleSplit: () => void;
  setTabDirty: (tabId: string, isDirty: boolean) => void;
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

  openTab: (tab, options = 'primary') => {
    const { tabs, activeTabId } = get();
    let newTab = false;
    let splitSide: 'primary' | 'secondary' = 'primary';

    if (typeof options === 'boolean') {
      newTab = options;
    } else if (typeof options === 'string') {
      splitSide = options;
    } else if (options && typeof options === 'object') {
      newTab = !!options.newTab;
      splitSide = options.splitSide || 'primary';
    }

    // 1. 若目标 Tab 已经打开，直接激活跳转
    const existingIndex = tabs.findIndex((t) => t.id === tab.id);
    if (existingIndex !== -1) {
      if (splitSide === 'secondary') {
        set({ splitTabId: tab.id, isSplitActive: true });
      } else {
        set({ activeTabId: tab.id });
      }
      return;
    }

    // 2. 副屏分屏打开模式
    if (splitSide === 'secondary') {
      set({
        tabs: [...tabs, tab],
        splitTabId: tab.id,
        isSplitActive: true,
      });
      return;
    }

    // 3. 主视口默认模式：就地替换 vs 新建标签页
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

  closeTab: (tabId) => {
    const { tabs, activeTabId, splitTabId } = get();
    const target = tabs.find((t) => t.id === tabId);
    if (!target || !target.closable) return;

    const remaining = tabs.filter((t) => t.id !== tabId);
    let nextActiveId = activeTabId;
    let nextSplitId = splitTabId;

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
        splitTabId: null,
        isSplitActive: false,
      });
      return;
    }

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
