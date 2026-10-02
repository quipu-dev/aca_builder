import { ChevronDown, ChevronRight, Folder, FolderOpen, Layers, Trash2 } from 'lucide-react';
import type React from 'react';
import { useMemo, useState } from 'react';

export interface ManifestExplorerProps {
  manifests: string[];
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

function buildTree(paths: string[]): ManifestTreeNode[] {
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

  for (const p of paths) {
    const parts = p.split('/').filter(Boolean);
    let curr = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLeaf = i === parts.length - 1;
      const subPath = parts.slice(0, i + 1).join('/');

      let nextNode = curr.children.get(part);
      if (!nextNode) {
        nextNode = {
          name: part,
          path: subPath,
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
  expandedFolders,
  onToggleFolder,
  onSelectManifest,
  onDeleteManifest,
}: {
  node: ManifestTreeNode;
  depth: number;
  activeManifestName?: string;
  expandedFolders: Record<string, boolean>;
  onToggleFolder: (path: string) => void;
  onSelectManifest: (manifestName: string, e?: React.MouseEvent) => void;
  onDeleteManifest: (manifestName: string, e: React.MouseEvent) => void;
}) {
  const isExpanded = Boolean(expandedFolders[node.path]);
  const isActive = !node.isFolder && activeManifestName === node.path;
  const paddingLeft = `${depth * 14 + 6}px`;

  if (node.isFolder) {
    return (
      <div className="space-y-0.5">
        <button
          type="button"
          onClick={() => onToggleFolder(node.path)}
          style={{ paddingLeft }}
          className="w-full flex items-center gap-1.5 py-1 pr-2 rounded text-xs font-mono text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors group cursor-pointer text-left"
          title={node.path}
        >
          {isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          )}
          {isExpanded ? (
            <FolderOpen className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
          ) : (
            <Folder className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
          )}
          <span className="font-medium truncate">{node.name}</span>
          <span className="text-[10px] text-slate-500 ml-auto opacity-0 group-hover:opacity-100">
            {node.children.length}
          </span>
        </button>

        {isExpanded && (
          <div className="space-y-0.5">
            {node.children.map((child) => (
              <ManifestTreeItem
                key={child.path}
                node={child}
                depth={depth + 1}
                activeManifestName={activeManifestName}
                expandedFolders={expandedFolders}
                onToggleFolder={onToggleFolder}
                onSelectManifest={onSelectManifest}
                onDeleteManifest={onDeleteManifest}
              />
            ))}
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
        title={`${node.path} (点击在当前标签页打开，按住 Ctrl 点击新建标签页)`}
      >
        <Layers className="h-3.5 w-3.5 text-indigo-400/80 shrink-0" />
        <span className="truncate">{node.name}</span>
      </button>
      <button
        type="button"
        onClick={(e) => onDeleteManifest(node.path, e)}
        className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 transition-opacity p-0.5 rounded shrink-0 cursor-pointer"
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
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

  const tree = useMemo(() => buildTree(manifests), [manifests]);

  const toggleFolder = (folderPath: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderPath]: !prev[folderPath],
    }));
  };

  if (manifests.length === 0) {
    return <div className="py-6 text-center text-xs font-mono text-slate-500">暂无清单蓝图</div>;
  }

  return (
    <div className="space-y-0.5">
      {tree.map((node) => (
        <ManifestTreeItem
          key={node.path}
          node={node}
          depth={0}
          activeManifestName={activeManifestName}
          expandedFolders={expandedFolders}
          onToggleFolder={toggleFolder}
          onSelectManifest={onSelectManifest}
          onDeleteManifest={onDeleteManifest}
        />
      ))}
    </div>
  );
}
