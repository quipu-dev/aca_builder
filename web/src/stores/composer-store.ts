import { create } from 'zustand';

export interface ImportItem {
  id: string;
  lookup: string;
  pillar?: string;
  description?: string;
}

interface ComposerState {
  manifestName: string;
  version: string;
  description: string;
  items: ImportItem[];

  setManifestName: (name: string) => void;
  setVersion: (version: string) => void;
  setDescription: (desc: string) => void;
  addItem: (item: Omit<ImportItem, 'id'>) => void;
  removeItem: (id: string) => void;
  moveItem: (index: number, direction: 'up' | 'down') => void;
  clearItems: () => void;
  loadFromManifest: (name: string, imports: Array<{ lookup?: string }>) => void;
  loadManifestData: (manifest: {
    name: string;
    version?: string;
    description?: string;
    imports?: Array<{ lookup?: string }>;
  }) => void;
  resetNewManifest: () => void;
}

export const useComposerStore = create<ComposerState>((set) => ({
  manifestName: 'custom_agent',
  version: '1.0.0',
  description: 'Composed via ACA Studio',
  items: [],

  setManifestName: (name) => set({ manifestName: name }),
  setVersion: (version) => set({ version }),
  setDescription: (description) => set({ description }),

  addItem: (item) =>
    set((state) => {
      // 避免重复添加完全相同的 lookup
      if (state.items.some((i) => i.lookup === item.lookup)) {
        return state;
      }
      const newItem: ImportItem = {
        ...item,
        id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      };
      return { items: [...state.items, newItem] };
    }),

  removeItem: (id) =>
    set((state) => ({
      items: state.items.filter((i) => i.id !== id),
    })),

  moveItem: (index, direction) =>
    set((state) => {
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= state.items.length) {
        return state;
      }
      const newItems = [...state.items];
      const temp = newItems[index];
      newItems[index] = newItems[targetIndex];
      newItems[targetIndex] = temp;
      return { items: newItems };
    }),

  clearItems: () => set({ items: [] }),

  loadFromManifest: (name, imports) =>
    set({
      manifestName: name,
      items: (imports || [])
        .filter((imp) => !!imp.lookup)
        .map((imp) => ({
          id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          lookup: imp.lookup as string,
        })),
    }),

  loadManifestData: (manifest) =>
    set({
      manifestName: manifest.name,
      version: manifest.version || '1.0.0',
      description: manifest.description || '',
      items: (manifest.imports || [])
        .filter((imp) => !!imp.lookup)
        .map((imp) => ({
          id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          lookup: imp.lookup as string,
        })),
    }),

  resetNewManifest: () =>
    set({
      manifestName: 'new_agent',
      version: '1.0.0',
      description: '',
      items: [],
    }),
}));
