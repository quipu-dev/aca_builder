import { create } from 'zustand';

export interface WorkspaceItem {
  id: string;
  name: string;
  root?: string | null;
  library_paths: string[];
  manifest_paths: string[];
  post_process_hook?: string | null;
  is_default: boolean;
  is_active: boolean;
}

interface WorkspaceState {
  workspaces: WorkspaceItem[];
  activeWorkspaceId: string;
  defaultWorkspaceId: string;
  loading: boolean;

  fetchWorkspaces: () => Promise<void>;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  createWorkspace: (params: {
    id: string;
    name: string;
    root?: string;
    post_process_hook?: string;
    set_default?: boolean;
  }) => Promise<void>;
  deleteWorkspace: (workspaceId: string) => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  activeWorkspaceId: '',
  defaultWorkspaceId: '',
  loading: false,

  fetchWorkspaces: async () => {
    set({ loading: true });
    try {
      const res = await fetch('/api/workspaces');
      if (!res.ok) throw new Error('获取工作区列表失败');
      const data = await res.json();
      set({
        workspaces: data.workspaces || [],
        activeWorkspaceId: data.active_workspace || '',
        defaultWorkspaceId: data.default_workspace || '',
      });
    } catch (e) {
      console.error(e);
    } finally {
      set({ loading: false });
    }
  },

  switchWorkspace: async (workspaceId: string) => {
    try {
      const res = await fetch('/api/workspaces/active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: workspaceId }),
      });
      if (res.ok) {
        set({ activeWorkspaceId: workspaceId });
        await get().fetchWorkspaces();
      }
    } catch (e) {
      console.error('切换工作区失败', e);
    }
  },

  createWorkspace: async (params) => {
    const res = await fetch('/api/workspaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.detail || '创建工作区失败');
    }
    await get().fetchWorkspaces();
  },

  deleteWorkspace: async (workspaceId: string) => {
    const res = await fetch(`/api/workspaces/${encodeURIComponent(workspaceId)}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.detail || '删除工作区失败');
    }
    await get().fetchWorkspaces();
  },
}));
