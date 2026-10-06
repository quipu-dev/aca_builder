export interface PathTreeNode<T = unknown> {
  name: string;
  path: string;
  isFolder: boolean;
  data?: T;
  children: PathTreeNode<T>[];
}

interface InternalTrieNode<T> {
  name: string;
  path: string;
  isFolder: boolean;
  data?: T;
  children: Map<string, InternalTrieNode<T>>;
}

export class PathTrie<T = unknown> {
  private root: InternalTrieNode<T> = {
    name: '',
    path: '',
    isFolder: true,
    children: new Map(),
  };

  insert(pathStr: string, isExplicitDir = false, data?: T): void {
    const parts = pathStr.split('/').filter(Boolean);
    let curr = this.root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLeaf = i === parts.length - 1;
      const subPath = parts.slice(0, i + 1).join('/');
      const isFolder = !isLeaf || isExplicitDir;

      let nextNode = curr.children.get(part);
      if (!nextNode) {
        nextNode = {
          name: part,
          path: isLeaf && !isExplicitDir ? pathStr : subPath,
          isFolder,
          data: isLeaf ? data : undefined,
          children: new Map(),
        };
        curr.children.set(part, nextNode);
      } else if (isFolder) {
        nextNode.isFolder = true;
      }
      curr = nextNode;
    }
  }

  toHierarchy(): PathTreeNode<T>[] {
    const formatNode = (node: InternalTrieNode<T>): PathTreeNode<T>[] => {
      const list: PathTreeNode<T>[] = [];
      for (const child of node.children.values()) {
        list.push({
          name: child.name,
          path: child.path,
          isFolder: child.isFolder,
          data: child.data,
          children: formatNode(child),
        });
      }
      return list.sort((a, b) => {
        if (a.isFolder && !b.isFolder) return -1;
        if (!a.isFolder && b.isFolder) return 1;
        return a.name.localeCompare(b.name);
      });
    };

    return formatNode(this.root);
  }
}
