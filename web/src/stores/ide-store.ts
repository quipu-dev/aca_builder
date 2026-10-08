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

export interface TabLocation {
  type: TabType;
  title: string;
  atomId?: string;
  manifestName?: string;
  lookupKey?: string;
  workspacePath?: string;
}

export interface IdeTab extends TabLocation {
  id: string; // 唯一的标签页容器实例 ID
  closable: boolean;
  isDirty?: boolean;
  isPreview?: boolean;
  history: TabLocation[];
  historyIndex: number;
}

interface IdePreferences {
  defaultRightPanel: 'prompt' | 'graph';
}

export interface WorkspaceTabState {
  tabs: IdeTab[];
  activeTabId: string;
  explorerExpanded: Record<string, boolean>;
}

export interface OpenTabOptions {
  newTab?: boolean;
  isPreview?: boolean;
}

interface IdeState {
  currentWorkspace: string;
  setCurrentWorkspace: (wsId: string) => void;

  tabs: IdeTab[];
  activeTabId: string;

  sidebarWidth: number;
  setSidebarWidth: (width: number) => void;

  explorerExpanded: Record<string, boolean>;
  setExplorerExpanded: (path: string, expanded: boolean) => void;
  toggleExplorerExpanded: (path: string) => void;

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
    location: TabLocation & { id?: string; closable?: boolean },
    options?: OpenTabOptions,
  ) => void;
  replaceTab: (tabId: string, location: TabLocation) => void;
  closeTab: (tabId: string) => void;
  pinTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  setTabDirty: (tabId: string, isDirty: boolean) => void;

  goBack: () => void;
  goForward: () => void;

  workspaceStates: Record<string, WorkspaceTabState>;
}

const createUniqueTabId = (prefix = 'tab') =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

const createDefaultEmptyTab = (): IdeTab => {
  const initialLoc: TabLocation = {
    type: 'empty',
    title: '新标签页',
  };
  const newTabId = createUniqueTabId();
  return {
    id: newTabId,
    closable: true,
    ...initialLoc,
    history: [initialLoc],
    historyIndex: 0,
  };
};

const createDefaultWorkspaceState = (): WorkspaceTabState => {
  const emptyTab = createDefaultEmptyTab();
  return {
    tabs: [emptyTab],
    activeTabId: emptyTab.id,
    explorerExpanded: {},
  };
};

export const useIdeStore = create<IdeState>()(
  persist(
    (set, get) => ({
      currentWorkspace: 'default',
      tabs: [createDefaultEmptyTab()],
      activeTabId: 'empty:home',

      explorerExpanded: {},
      workspaceStates: {},

      setCurrentWorkspace: (wsId: string) => {
        const { currentWorkspace, tabs, activeTabId, explorerExpanded, workspaceStates } = get();
        if (currentWorkspace === wsId) return;

        const updatedWorkspaces = {
          ...workspaceStates,
          [currentWorkspace]: {
            tabs,
            activeTabId,
            explorerExpanded,
          },
        };

        const targetState = updatedWorkspaces[wsId] || createDefaultWorkspaceState();

        set({
          currentWorkspace: wsId,
          tabs: targetState.tabs,
          activeTabId: targetState.activeTabId,
          explorerExpanded: targetState.explorerExpanded,
          workspaceStates: updatedWorkspaces,
        });
      },

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

      replaceTab: (tabId, location) => {
        set((state) => {
          const updatedTabs = state.tabs.map((t) => {
            if (t.id !== tabId) return t;
            const updatedHistory = [...t.history];
            updatedHistory[t.historyIndex] = { ...location };
            return {
              ...t,
              ...location,
              history: updatedHistory,
            };
          });
          return { tabs: updatedTabs };
        });
      },

      openTab: (location, options) => {
        const { tabs, activeTabId } = get();
        const wantsNewTab = Boolean(options?.newTab);
        const isPreview = options?.isPreview ?? false;

        const locSnapshot: TabLocation = {
          type: location.type,
          title: location.title,
          atomId: location.atomId,
          manifestName: location.manifestName,
          lookupKey: location.lookupKey,
          workspacePath: location.workspacePath,
        };

        // 1. 如果显式要求新建 Tab (点击 + 号、快捷键 Ctrl+T、或 Ctrl/Cmd 点击文件)
        // 优先无条件新建并追加，绝不拦截
        if (wantsNewTab) {
          const newTabId = createUniqueTabId();
          const newTab: IdeTab = {
            id: newTabId,
            closable: location.closable ?? true,
            ...locSnapshot,
            isDirty: false,
            isPreview,
            history: [locSnapshot],
            historyIndex: 0,
          };
          set({
            tabs: [...tabs, newTab],
            activeTabId: newTabId,
          });
          return;
        }

        // 2. 如果非显式新建，且当前仅有一个未编辑的空白页、点击的是具体业务资源时，就地复用它
        if (
          tabs.length === 1 &&
          tabs[0].type === 'empty' &&
          !tabs[0].isDirty &&
          locSnapshot.type !== 'empty'
        ) {
          const currentTabId = tabs[0].id;
          const updatedTab: IdeTab = {
            ...tabs[0],
            ...locSnapshot,
            isDirty: false,
            isPreview,
            history: [locSnapshot],
            historyIndex: 0,
          };
          set({
            tabs: [updatedTab],
            activeTabId: currentTabId,
          });
          return;
        }

        // 3. 默认行为：在当前活动标签页 (activeTab) 内部进行就地导航与历史入栈 (Chrome 式)
        const currentActive = tabs.find((t) => t.id === activeTabId);

        if (!currentActive) {
          const newTabId = createUniqueTabId();
          const fallbackTab: IdeTab = {
            id: newTabId,
            closable: location.closable ?? true,
            ...locSnapshot,
            isDirty: false,
            isPreview,
            history: [locSnapshot],
            historyIndex: 0,
          };
          set({
            tabs: [...tabs, fallbackTab],
            activeTabId: newTabId,
          });
          return;
        }

        // 检查当前 Tab 是否已经正显示此资源
        const isSameResource =
          currentActive.type === locSnapshot.type &&
          currentActive.atomId === locSnapshot.atomId &&
          currentActive.manifestName === locSnapshot.manifestName &&
          currentActive.lookupKey === locSnapshot.lookupKey;

        if (isSameResource) {
          if (!isPreview && currentActive.isPreview) {
            set({
              tabs: tabs.map((t) => (t.id === currentActive.id ? { ...t, isPreview: false } : t)),
            });
          }
          return;
        }

        // 截断当前 Tab 自身历史栈并推入新航点
        const truncatedHistory = currentActive.history.slice(0, currentActive.historyIndex + 1);
        const nextHistory = [...truncatedHistory, locSnapshot];
        const nextIndex = nextHistory.length - 1;

        const updatedTabs = tabs.map((t) => {
          if (t.id !== currentActive.id) return t;
          return {
            ...t,
            closable: true,
            ...locSnapshot,
            isDirty: false,
            isPreview,
            history: nextHistory,
            historyIndex: nextIndex,
          };
        });

        set({
          tabs: updatedTabs,
          activeTabId: currentActive.id,
        });
      },

      goBack: () => {
        set((state) => {
          const activeTab = state.tabs.find((t) => t.id === state.activeTabId);
          if (!activeTab || activeTab.historyIndex <= 0) return state;

          const prevIndex = activeTab.historyIndex - 1;
          const prevLoc = activeTab.history[prevIndex];

          const updatedTabs = state.tabs.map((t) => {
            if (t.id !== activeTab.id) return t;
            return {
              ...t,
              ...prevLoc,
              isDirty: false,
              historyIndex: prevIndex,
            };
          });

          return { tabs: updatedTabs };
        });
      },

      goForward: () => {
        set((state) => {
          const activeTab = state.tabs.find((t) => t.id === state.activeTabId);
          if (!activeTab || activeTab.historyIndex >= activeTab.history.length - 1) return state;

          const nextIndex = activeTab.historyIndex + 1;
          const nextLoc = activeTab.history[nextIndex];

          const updatedTabs = state.tabs.map((t) => {
            if (t.id !== activeTab.id) return t;
            return {
              ...t,
              ...nextLoc,
              isDirty: false,
              historyIndex: nextIndex,
            };
          });

          return { tabs: updatedTabs };
        });
      },

      closeTab: (tabId) => {
        const { tabs, activeTabId } = get();
        const target = tabs.find((t) => t.id === tabId);
        if (!target || !target.closable) return;

        const remaining = tabs.filter((t) => t.id !== tabId);
        let nextActiveId = activeTabId;

        if (remaining.length === 0) {
          const emptyTab = createDefaultEmptyTab();
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
      name: 'aca-studio-ide-vault-v3',
      partialize: (state) => ({
        currentWorkspace: state.currentWorkspace,
        tabs: state.tabs,
        activeTabId: state.activeTabId,
        sidebarOpen: state.sidebarOpen,
        sidebarWidth: state.sidebarWidth,
        preferences: state.preferences,
        explorerExpanded: state.explorerExpanded,
        workspaceStates: state.workspaceStates,
      }),
    },
  ),
);
