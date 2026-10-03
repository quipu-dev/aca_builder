import { useIdeStore } from '@/stores/ide-store';
import { ChevronDown, ChevronRight, Folder, FolderOpen, Layers, Trash2 } from 'lucide-react';
import type React from 'react';
import { useMemo } from 'react';

export interface ManifestItemObj {
  name: string;
  workspace?: string;
  workspace_path?: string;
}

export interface ManifestExplorerProps {
  manifests: Array<string | ManifestItemObj>;
  activeManifestName?: string;
  onSelectManifest: (manifestName: string, e?: React.MouseEvent) => void;
  onDeleteManifest: (manifestName: string, e: React.MouseEvent) => void;
}

interface ManifestTreeNode {
  name: string;
  path: string;
  isFolder: boolean;
  children: ManifestTreeNode[];
}

function buildTree(items: Array<string | ManifestItemObj>): ManifestTreeNode[] {
  interface TempNode {
    name: string;
    path: string;
    isFolder: boolean;
    children: Map<string, TempNode>;
  }

  const root: TempNode = {
    name: '',
    path: '',
    isFolder: true,
    children: new Map(),
  };

  for (const item of items) {
    const p = typeof item === 'string' ? item : item.name;
    const wsPath =
      typeof item === 'string'
        ? '默认工作区'
        : item.workspace_path || item.workspace || '默认工作区';

    // 1. 顶层根节点为 workspace_path (全长路径名)
    let wsNode = root.children.get(wsPath);
    if (!wsNode) {
      wsNode = {
        name: wsPath,
        path: wsPath,
        isFolder: true,
        children: new Map(),
      };
      root.children.set(wsPath, wsNode);
    }

    const parts = p.split('/').filter(Boolean);
    let curr = wsNode;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLeaf = i === parts.length - 1;
      const subPath = `${wsPath}::${parts.slice(0, i + 1).join('/')}`;

      let nextNode = curr.children.get(part);
      if (!nextNode) {
        nextNode = {
          name: part,
          path: isLeaf ? p : subPath,
          isFolder: !isLeaf,
          children: new Map(),
        };
        curr.children.set(part, nextNode);
      } else if (!isLeaf) {
        nextNode.isFolder = true;
      }
      curr = nextNode;
    }
  }

  function toSortedNodes(node: TempNode): ManifestTreeNode[] {
    const list: ManifestTreeNode[] = [];
    for (const child of node.children.values()) {
      list.push({
        name: child.name,
        path: child.path,
        isFolder: child.isFolder,
        children: toSortedNodes(child),
      });
    }

    return list.sort((a, b) => {
      if (a.isFolder && !b.isFolder) return -1;
      if (!a.isFolder && b.isFolder) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  return toSortedNodes(root);
}

function ManifestTreeItem({
  node,
  depth,
  activeManifestName,
  onToggleFolder,
  isExpanded,
  onSelectManifest,
  onDeleteManifest,
}: {
  node: ManifestTreeNode;
  depth: number;
  activeManifestName?: string;
  onToggleFolder: (path: string) => void;
  isExpanded: boolean;
  onSelectManifest: (manifestName: string, e?: React.MouseEvent) => void;
  onDeleteManifest: (manifestName: string, e: React.MouseEvent) => void;
}) {
  const isActive = !node.isFolder && activeManifestName === node.path;
  const paddingLeft = `${depth * 14 + 6}px`;

  if (node.isFolder) {
    return (
      <div className="space-y-0.5 mb-1">
        <button
          type="button"
          onClick={() => onToggleFolder(node.path)}
          style={{ paddingLeft }}
          className="w-full flex items-center gap-1.5 py-1 pr-2 rounded text-xs font-mono text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 transition-colors group cursor-pointer text-left"
          title={node.name}
        >
          {isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-slate-500 shrink-0" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-slate-500 shrink-0" />
          )}
          {isExpanded ? (
            <FolderOpen className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
          ) : (
            <Folder className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
          )}
          <span className="font-semibold truncate text-[11px] text-slate-300" title={node.name}>
            {node.name}
          </span>
        </button>

        {isExpanded && (
          <div className="space-y-0.5 border-l border-slate-800/60 ml-3 pl-1">
            {node.children.map((child) => {
              const childExpanded = useIdeStore.getState().explorerExpanded[child.path] === true;
              return (
                <ManifestTreeItem
                  key={child.path}
                  node={child}
                  depth={depth + 1}
                  activeManifestName={activeManifestName}
                  isExpanded={childExpanded}
                  onToggleFolder={onToggleFolder}
                  onSelectManifest={onSelectManifest}
                  onDeleteManifest={onDeleteManifest}
                />
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      style={{ paddingLeft }}
      className={`group w-full flex items-center justify-between py-1 pr-1.5 rounded text-xs font-mono transition-colors ${
        isActive
          ? 'bg-indigo-600/30 text-indigo-200 border border-indigo-500/50'
          : 'text-slate-300 hover:bg-slate-800/60'
      }`}
    >
      <button
        type="button"
        onClick={(e) => onSelectManifest(node.path, e)}
        className="flex items-center gap-1.5 flex-1 min-w-0 text-left hover:text-white cursor-pointer"
        title={node.path}
      >
        <Layers className="h-3.5 w-3.5 text-indigo-400/80 shrink-0" />
        <span className="truncate">{node.name}</span>
      </button>
      <button
        type="button"
        onClick={(e) => onDeleteManifest(node.path, e)}
        className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 transition-opacity p-0.5 rounded shrink-0 cursor-pointer ml-1"
        title="删除清单"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function ManifestExplorer({
  manifests,
  activeManifestName,
  onSelectManifest,
  onDeleteManifest,
}: ManifestExplorerProps) {
  const explorerExpanded = useIdeStore((state) => state.explorerExpanded);
  const toggleExplorerExpanded = useIdeStore((state) => state.toggleExplorerExpanded);

  const tree = useMemo(() => buildTree(manifests), [manifests]);

  if (manifests.length === 0) {
    return <div className="py-6 text-center text-xs font-mono text-slate-500">暂无清单蓝图</div>;
  }

  return (
    <div className="space-y-0.5">
      {tree.map((node) => {
        const isExpanded = explorerExpanded[node.path] === true; // 默认折叠 (false)
        return (
          <ManifestTreeItem
            key={node.path}
            node={node}
            depth={0}
            activeManifestName={activeManifestName}
            isExpanded={isExpanded}
            onToggleFolder={toggleExplorerExpanded}
            onSelectManifest={onSelectManifest}
            onDeleteManifest={onDeleteManifest}
          />
        );
      })}
    </div>
  );
}
