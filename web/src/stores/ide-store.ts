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
  id: string;
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

export interface WorkspaceTabState {
  tabs: IdeTab[];
  activeTabId: string;
  navigationHistory: HistoryEntry[];
  historyIndex: number;
  tabSnapshots: Record<string, unknown>;
  explorerExpanded: Record<string, boolean>;
}

interface IdeState {
  // 当前工作区下的直接映射字段
  currentWorkspace: string;
  setCurrentWorkspace: (wsId: string) => void;

  tabs: IdeTab[];
  activeTabId: string;

  sidebarWidth: number;
  setSidebarWidth: (width: number) => void;

  explorerExpanded: Record<string, boolean>;
  setExplorerExpanded: (path: string, expanded: boolean) => void;
  toggleExplorerExpanded: (path: string) => void;

  navigationHistory: HistoryEntry[];
  historyIndex: number;

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
  replaceTab: (oldTabId: string, newTab: IdeTab) => void;
  closeTab: (tabId: string) => void;
  pinTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  setTabDirty: (tabId: string, isDirty: boolean) => void;

  goBack: () => void;
  goForward: () => void;

  // 跨工作区多状态快照持久池
  workspaceStates: Record<string, WorkspaceTabState>;
}

const INITIAL_EMPTY_TAB: IdeTab = {
  id: 'empty:home',
  type: 'empty',
  title: '开始',
  closable: false,
};

const createDefaultWorkspaceState = (): WorkspaceTabState => ({
  tabs: [INITIAL_EMPTY_TAB],
  activeTabId: INITIAL_EMPTY_TAB.id,
  navigationHistory: [{ tab: INITIAL_EMPTY_TAB }],
  historyIndex: 0,
  tabSnapshots: {},
  explorerExpanded: {},
});

export const useIdeStore = create<IdeState>()(
  persist(
    (set, get) => ({
      currentWorkspace: 'default',
      tabs: [INITIAL_EMPTY_TAB],
      activeTabId: INITIAL_EMPTY_TAB.id,

      navigationHistory: [{ tab: INITIAL_EMPTY_TAB }],
      historyIndex: 0,

      tabSnapshots: {},
      explorerExpanded: {},
      workspaceStates: {},

      setCurrentWorkspace: (wsId: string) => {
        const {
          currentWorkspace,
          tabs,
          activeTabId,
          navigationHistory,
          historyIndex,
          tabSnapshots,
          explorerExpanded,
          workspaceStates,
        } = get();
        if (currentWorkspace === wsId) return;

        // 1. 保存当前工作区状态
        const updatedWorkspaces = {
          ...workspaceStates,
          [currentWorkspace]: {
            tabs,
            activeTabId,
            navigationHistory,
            historyIndex,
            tabSnapshots,
            explorerExpanded,
          },
        };

        // 2. 加载目标工作区状态（如无则新建）
        const targetState = updatedWorkspaces[wsId] || createDefaultWorkspaceState();

        set({
          currentWorkspace: wsId,
          tabs: targetState.tabs,
          activeTabId: targetState.activeTabId,
          navigationHistory: targetState.navigationHistory,
          historyIndex: targetState.historyIndex,
          tabSnapshots: targetState.tabSnapshots,
          explorerExpanded: targetState.explorerExpanded,
          workspaceStates: updatedWorkspaces,
        });
      },

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

      replaceTab: (oldTabId, newTab) => {
        const { tabs, navigationHistory } = get();
        const tabIndex = tabs.findIndex((t) => t.id === oldTabId);
        const updatedTabs = [...tabs];
        if (tabIndex !== -1) {
          updatedTabs[tabIndex] = newTab;
        } else {
          updatedTabs.push(newTab);
        }
        const updatedHistory = navigationHistory.map((entry) =>
          entry.tab.id === oldTabId ? { tab: newTab } : entry,
        );
        set({
          tabs: updatedTabs,
          activeTabId: newTab.id,
          navigationHistory: updatedHistory,
        });
      },

      openTab: (tab, options = false) => {
        const { tabs, navigationHistory, historyIndex } = get();
        const newTab = typeof options === 'boolean' ? options : !!options?.newTab;
        const fromHistory = typeof options === 'object' && !!options?.fromHistory;
        const isPreview =
          typeof options === 'object' && options?.isPreview !== undefined
            ? options.isPreview
            : (tab.isPreview ?? false);

        const tabToOpen: IdeTab = { ...tab, isPreview };

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

        const existingIndex = tabs.findIndex((t) => t.id === tabToOpen.id);
        if (existingIndex !== -1) {
          if (!isPreview && tabs[existingIndex].isPreview) {
            const updated = [...tabs];
            updated[existingIndex] = { ...updated[existingIndex], isPreview: false };
            set({ tabs: updated, activeTabId: tabToOpen.id });
          } else {
            set({ activeTabId: tabToOpen.id });
          }
          return;
        }

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
                  isPreview: isDirty ? false : t.isPreview,
                }
              : t,
          ),
        })),
    }),
    {
      name: 'aca-studio-ide-vault-v2',
      partialize: (state) => ({
        currentWorkspace: state.currentWorkspace,
        tabs: state.tabs,
        activeTabId: state.activeTabId,
        tabSnapshots: state.tabSnapshots,
        sidebarOpen: state.sidebarOpen,
        sidebarWidth: state.sidebarWidth,
        preferences: state.preferences,
        explorerExpanded: state.explorerExpanded,
        workspaceStates: state.workspaceStates,
      }),
    },
  ),
);
