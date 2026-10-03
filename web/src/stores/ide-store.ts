import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type TabType =
  | 'atom'
  | 'manifest'
  | 'lookup'
  | 'composer'
  | 'graph'
  | 'preview'
  | 'empty'
  | 'settings';

export interface IdeTab {
  id: string; // 唯一键，例如 'atom:d1-profile', 'manifest:test_pkg/agent', 'lookup:pkg_a::d1l-api'
  type: TabType;
  title: string;
  closable: boolean;
  atomId?: string;
  manifestName?: string;
  lookupKey?: string;
  workspacePath?: string;
  isDirty?: boolean;
  isPreview?: boolean;
}

export interface HistoryEntry {
  tab: IdeTab;
}

interface IdePreferences {
  defaultRightPanel: 'prompt' | 'graph';
}

interface IdeState {
  tabs: IdeTab[];
  activeTabId: string;

  // 侧边栏宽度状态
  sidebarWidth: number;
  setSidebarWidth: (width: number) => void;

  // 资源管理器文件夹折叠状态持久化
  explorerExpanded: Record<string, boolean>;
  setExplorerExpanded: (path: string, expanded: boolean) => void;
  toggleExplorerExpanded: (path: string) => void;

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

  preferences: IdePreferences;
  updatePreferences: (prefs: Partial<IdePreferences>) => void;

  openTab: (
    tab: IdeTab,
    options?: boolean | { newTab?: boolean; fromHistory?: boolean; isPreview?: boolean },
  ) => void;
  closeTab: (tabId: string) => void;
  pinTab: (tabId: string) => void;
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

export const useIdeStore = create<IdeState>()(
  persist(
    (set, get) => ({
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
      sidebarWidth: 288,
      setSidebarWidth: (width) => set({ sidebarWidth: width }),
      activeSidebarView: 'explorer',
      bottomPanelOpen: false,
      activeBottomTab: 'problems',

      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setActiveSidebarView: (view) => set({ activeSidebarView: view, sidebarOpen: true }),

      setBottomPanelOpen: (open) => set({ bottomPanelOpen: open }),
      toggleBottomPanel: () => set((state) => ({ bottomPanelOpen: !state.bottomPanelOpen })),
      setActiveBottomTab: (tab) => set({ activeBottomTab: tab, bottomPanelOpen: true }),

      preferences: { defaultRightPanel: 'graph' },
      updatePreferences: (prefs) =>
        set((state) => ({ preferences: { ...state.preferences, ...prefs } })),

      explorerExpanded: {},
      setExplorerExpanded: (path, expanded) =>
        set((state) => ({
          explorerExpanded: { ...state.explorerExpanded, [path]: expanded },
        })),
      toggleExplorerExpanded: (path) =>
        set((state) => ({
          explorerExpanded: {
            ...state.explorerExpanded,
            [path]: !state.explorerExpanded[path],
          },
        })),

      pinTab: (tabId) =>
        set((state) => ({
          tabs: state.tabs.map((t) => (t.id === tabId ? { ...t, isPreview: false } : t)),
        })),

      openTab: (tab, options = false) => {
        const { tabs, navigationHistory, historyIndex } = get();
        const newTab = typeof options === 'boolean' ? options : !!options?.newTab;
        const fromHistory = typeof options === 'object' && !!options?.fromHistory;
        const isPreview =
          typeof options === 'object' && options?.isPreview !== undefined
            ? options.isPreview
            : (tab.isPreview ?? false);

        const tabToOpen: IdeTab = { ...tab, isPreview };

        // 历史栈压入逻辑：非后退/前进触发时更新历史
        if (!fromHistory) {
          const currentEntry = navigationHistory[historyIndex];
          if (!currentEntry || currentEntry.tab.id !== tabToOpen.id) {
            const truncated = navigationHistory.slice(0, historyIndex + 1);
            const updatedHistory = [...truncated, { tab: tabToOpen }];
            set({
              navigationHistory: updatedHistory,
              historyIndex: updatedHistory.length - 1,
            });
          }
        }

        // 1. 若目标 Tab 已经打开
        const existingIndex = tabs.findIndex((t) => t.id === tabToOpen.id);
        if (existingIndex !== -1) {
          // 如果是以非预览方式重新打开已经处于预览态的 tab，自动转为固定态
          if (!isPreview && tabs[existingIndex].isPreview) {
            const updated = [...tabs];
            updated[existingIndex] = { ...updated[existingIndex], isPreview: false };
            set({ tabs: updated, activeTabId: tabToOpen.id });
          } else {
            set({ activeTabId: tabToOpen.id });
          }
          return;
        }

        // 2. 寻找是否有可以被就地替换的 preview 标签页 (且未被编辑)
        const previewIndex = tabs.findIndex((t) => t.isPreview && !t.isDirty);

        if (!newTab && isPreview && previewIndex !== -1) {
          const updatedTabs = [...tabs];
          updatedTabs[previewIndex] = tabToOpen;
          set({
            tabs: updatedTabs,
            activeTabId: tabToOpen.id,
          });
          return;
        }

        // 3. 过滤掉未使用的初始空白欢迎页（若存在）
        const cleanTabs =
          tabs.length === 1 && tabs[0].type === 'empty' && !tabs[0].isDirty ? [] : tabs;

        set({
          tabs: [...cleanTabs, tabToOpen],
          activeTabId: tabToOpen.id,
        });
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
          tabs: state.tabs.map((t) =>
            t.id === tabId
              ? {
                  ...t,
                  isDirty,
                  // 一旦发生编辑修改，自动固定标签页
                  isPreview: isDirty ? false : t.isPreview,
                }
              : t,
          ),
        })),
    }),
    {
      name: 'aca-studio-ide-v1',
      partialize: (state) => ({
        tabs: state.tabs,
        activeTabId: state.activeTabId,
        tabSnapshots: state.tabSnapshots,
        sidebarOpen: state.sidebarOpen,
        sidebarWidth: state.sidebarWidth,
        preferences: state.preferences,
        explorerExpanded: state.explorerExpanded,
      }),
    },
  ),
);
