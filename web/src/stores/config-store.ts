import { create } from 'zustand';

export interface SystemConfig {
  library_paths: string[];
  manifest_paths: string[];
  post_process_hook?: string;
}

interface ConfigState {
  config: SystemConfig | null;
  loading: boolean;
  fetchConfig: () => Promise<void>;
  updateConfig: (newConfig: Partial<SystemConfig>) => Promise<void>;
}

export const useConfigStore = create<ConfigState>((set) => ({
  config: null,
  loading: false,
  fetchConfig: async () => {
    set({ loading: true });
    try {
      const res = await fetch('/api/system/config');
      const data = await res.json();
      set({ config: data });
    } catch (err) {
      console.error('获取系统配置失败', err);
    } finally {
      set({ loading: false });
    }
  },
  updateConfig: async (newConfig) => {
    const res = await fetch('/api/system/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newConfig),
    });
    if (res.ok) {
      set((state) => ({
        config: state.config ? { ...state.config, ...newConfig } : (newConfig as SystemConfig),
      }));
    } else {
      throw new Error('更新配置失败');
    }
  },
}));
