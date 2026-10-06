import { ConfirmIconButton } from '@/components/ui/confirm-button';
import { useIdeStore } from '@/stores/ide-store';
import { type PathTreeNode, PathTrie } from '@/utils/trie';
import {
  ChevronDown,
  ChevronRight,
  FilePlus2,
  Folder,
  FolderOpen,
  FolderPlus,
  Layers,
} from 'lucide-react';
import type React from 'react';
import { useMemo, useState } from 'react';

export interface ManifestItemObj {
  name: string;
  type?: 'file' | 'directory';
  workspace?: string;
  workspace_path?: string;
}

export type ManifestTreeNode = PathTreeNode<ManifestItemObj>;

export interface ManifestExplorerProps {
  manifests: ManifestItemObj[];
  activeManifestName?: string;
  onSelectManifest: (manifestName: string, e?: React.MouseEvent) => void;
  onDeleteManifest: (manifestName: string, e: React.MouseEvent) => void;
  onCreateInFolder?: (folderPath: string) => void;
  onCreateSubFolder?: (parentPath: string) => void;
  onDeleteFolder?: (folderPath: string, e: React.MouseEvent) => void;
  onMoveItem?: (srcPath: string, destFolder: string, isFolder: boolean) => void;
}

function buildTree(items: ManifestItemObj[]): ManifestTreeNode[] {
  const trie = new PathTrie<ManifestItemObj>();
  for (const item of items) {
    trie.insert(item.name, item.type === 'directory', item);
  }
  return trie.toHierarchy();
}

function ManifestTreeItem({
  node,
  depth,
  activeManifestName,
  onToggleFolder,
  isExpanded,
  onSelectManifest,
  onDeleteManifest,
  onCreateInFolder,
  onCreateSubFolder,
  onDeleteFolder,
  onMoveItem,
}: {
  node: ManifestTreeNode;
  depth: number;
  activeManifestName?: string;
  onToggleFolder: (path: string) => void;
  isExpanded: boolean;
  onSelectManifest: (manifestName: string, e?: React.MouseEvent) => void;
  onDeleteManifest: (manifestName: string, e: React.MouseEvent) => void;
  onCreateInFolder?: (folderPath: string) => void;
  onCreateSubFolder?: (parentPath: string) => void;
  onDeleteFolder?: (folderPath: string, e: React.MouseEvent) => void;
  onMoveItem?: (srcPath: string, destFolder: string, isFolder: boolean) => void;
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const isActive = !node.isFolder && activeManifestName === node.path;
  const paddingLeft = `${depth * 14 + 6}px`;

  // 拖拽起始
  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    e.dataTransfer.setData(
      'application/aca-manifest-item',
      JSON.stringify({ path: node.path, isFolder: node.isFolder }),
    );
    e.dataTransfer.effectAllowed = 'move';
  };

  // 目标文件夹接受拖放
  const handleDragOver = (e: React.DragEvent) => {
    if (!node.isFolder) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!node.isFolder) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    if (!node.isFolder) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    try {
      const raw = e.dataTransfer.getData('application/aca-manifest-item');
      if (!raw) return;
      const data = JSON.parse(raw) as { path: string; isFolder: boolean };
      onMoveItem?.(data.path, node.path, data.isFolder);
    } catch {
      // 忽略拖拽数据解析异常
    }
  };

  if (node.isFolder) {
    return (
      <div
        className="space-y-0.5 mb-1 group/folder"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div
          draggable
          onDragStart={handleDragStart}
          style={{ paddingLeft }}
          className={`w-full flex items-center justify-between py-1 pr-1.5 rounded text-xs font-mono transition-colors ${
            isDragOver
              ? 'bg-indigo-600/30 border border-indigo-500 text-indigo-100 ring-1 ring-indigo-500/50'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
          }`}
        >
          <button
            type="button"
            onClick={() => onToggleFolder(node.path)}
            className="flex items-center gap-1.5 flex-1 min-w-0 text-left cursor-pointer truncate"
            title={`${node.path} (可拖拽此目录)`}
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
            <span className="font-semibold truncate text-[11px] text-slate-300">{node.name}</span>
          </button>

          <div className="opacity-0 group-hover/folder:opacity-100 flex items-center gap-1 transition-opacity shrink-0">
            {onCreateInFolder && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCreateInFolder(node.path);
                }}
                className="p-1 text-slate-400 hover:text-indigo-300 hover:bg-slate-800/80 rounded cursor-pointer transition-colors"
                title={`在 ${node.path}/ 中新建清单`}
              >
                <FilePlus2 className="h-3.5 w-3.5" />
              </button>
            )}
            {onCreateSubFolder && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCreateSubFolder(node.path);
                }}
                className="p-1 text-slate-400 hover:text-indigo-300 hover:bg-slate-800/80 rounded cursor-pointer transition-colors"
                title={`在 ${node.path}/ 中新建子目录`}
              >
                <FolderPlus className="h-3.5 w-3.5" />
              </button>
            )}
            {onDeleteFolder && (
              <ConfirmIconButton
                onConfirm={(e) => onDeleteFolder(node.path, e)}
                title={`删除目录 ${node.path} 及其全部文件 (Shift+点击快速删除)`}
                confirmTitle="删目录?"
                iconClassName="h-3 w-3"
              />
            )}
          </div>
        </div>

        {isExpanded && (
          <div className="space-y-0.5 border-l border-slate-800/60 ml-3 pl-1">
            {node.children.length === 0 ? (
              <div
                style={{ paddingLeft: `${(depth + 1) * 14 + 6}px` }}
                className="py-1 text-[10px] text-slate-600 italic"
              >
                (空目录 - 可拖拽文件至此)
              </div>
            ) : (
              node.children.map((child) => {
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
                    onCreateInFolder={onCreateInFolder}
                    onCreateSubFolder={onCreateSubFolder}
                    onDeleteFolder={onDeleteFolder}
                    onMoveItem={onMoveItem}
                  />
                );
              })
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      style={{ paddingLeft }}
      className={`group w-full flex items-center justify-between py-1 pr-1.5 rounded text-xs font-mono transition-colors cursor-grab active:cursor-grabbing ${
        isActive
          ? 'bg-indigo-600/30 text-indigo-200 border border-indigo-500/50'
          : 'text-slate-300 hover:bg-slate-800/60 border border-transparent'
      }`}
    >
      <button
        type="button"
        onClick={(e) => onSelectManifest(node.path, e)}
        className="flex items-center gap-1.5 flex-1 min-w-0 text-left hover:text-white cursor-pointer"
        title={`${node.path} (可拖拽至目标目录)`}
      >
        <Layers className="h-3.5 w-3.5 text-indigo-400/80 shrink-0" />
        <span className="truncate">{node.name}</span>
      </button>
      <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 shrink-0">
        <ConfirmIconButton
          onConfirm={(e) => onDeleteManifest(node.path, e)}
          title="删除清单 (Shift+点击快速删除)"
        />
      </div>
    </div>
  );
}

export function ManifestExplorer({
  manifests,
  activeManifestName,
  onSelectManifest,
  onDeleteManifest,
  onCreateInFolder,
  onCreateSubFolder,
  onDeleteFolder,
  onMoveItem,
}: ManifestExplorerProps) {
  const explorerExpanded = useIdeStore((state) => state.explorerExpanded);
  const toggleExplorerExpanded = useIdeStore((state) => state.toggleExplorerExpanded);
  const [isRootDragOver, setIsRootDragOver] = useState(false);

  const tree = useMemo(() => buildTree(manifests), [manifests]);

  const handleRootDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!isRootDragOver) setIsRootDragOver(true);
  };

  const handleRootDragLeave = () => {
    setIsRootDragOver(false);
  };

  const handleRootDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsRootDragOver(false);
    try {
      const raw = e.dataTransfer.getData('application/aca-manifest-item');
      if (!raw) return;
      const data = JSON.parse(raw) as { path: string; isFolder: boolean };
      // 放置在根目录（destFolder 为空字符串）
      onMoveItem?.(data.path, '', data.isFolder);
    } catch {
      // 忽略拖放错误
    }
  };

  if (manifests.length === 0) {
    return (
      <div
        onDragOver={handleRootDragOver}
        onDragLeave={handleRootDragLeave}
        onDrop={handleRootDrop}
        className={`py-8 text-center text-xs font-mono rounded border border-dashed transition-colors ${
          isRootDragOver
            ? 'border-indigo-500 bg-indigo-950/30 text-indigo-300'
            : 'border-slate-800 text-slate-500'
        }`}
      >
        暂无清单蓝图 (可拖拽文件至此)
      </div>
    );
  }

  return (
    <div
      onDragOver={handleRootDragOver}
      onDragLeave={handleRootDragLeave}
      onDrop={handleRootDrop}
      className={`space-y-0.5 min-h-[140px] rounded p-1 transition-colors ${
        isRootDragOver ? 'bg-indigo-950/20 ring-1 ring-indigo-500/40' : ''
      }`}
    >
      {tree.map((node) => {
        const isExpanded = explorerExpanded[node.path] === true;
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
            onCreateInFolder={onCreateInFolder}
            onCreateSubFolder={onCreateSubFolder}
            onDeleteFolder={onDeleteFolder}
            onMoveItem={onMoveItem}
          />
        );
      })}
    </div>
  );
}
