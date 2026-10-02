import {
  Background,
  BackgroundVariant,
  Controls,
  type Edge,
  type Node,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from '@xyflow/react';
import { useEffect } from 'react';
import '@xyflow/react/dist/style.css';
import { AtomNode, LookupNode, ManifestNode } from './CustomNodes';

const nodeTypes = {
  manifestNode: ManifestNode,
  lookupNode: LookupNode,
  atomNode: AtomNode,
};

function autoLayout(nodes: Node[], edges: Edge[]): Node[] {
  if (nodes.length === 0) return [];

  // 1. 构建有向邻接图和入度表
  const adj = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  for (const n of nodes) {
    adj.set(n.id, []);
    inDegree.set(n.id, 0);
  }

  for (const e of edges) {
    if (adj.has(e.source) && inDegree.has(e.target)) {
      adj.get(e.source)?.push(e.target);
      inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
    }
  }

  // 2. 拓扑最长路径 (Longest Path) 计算每个节点的深度 Rank
  const rank = new Map<string, number>();
  const queue: string[] = [];

  // 入度为 0 的节点作为初始源点 (如 Manifest、Kernel)
  for (const [id, deg] of inDegree.entries()) {
    if (deg === 0) {
      rank.set(id, 0);
      queue.push(id);
    }
  }

  if (queue.length === 0 && nodes.length > 0) {
    rank.set(nodes[0].id, 0);
    queue.push(nodes[0].id);
  }

  while (queue.length > 0) {
    const u = queue.shift();
    if (!u) continue;
    const currRank = rank.get(u) || 0;

    for (const v of adj.get(u) || []) {
      const nextRank = currRank + 1;
      // 保持最长路径特性：如果存在更深依赖链，后推列位以确保连线严格自左向右单向流动
      const targetRank = rank.get(v);
      if (targetRank === undefined || targetRank < nextRank) {
        rank.set(v, nextRank);
        queue.push(v);
      }
    }
  }

  // 处理未连接的游离节点
  for (const n of nodes) {
    if (!rank.has(n.id)) {
      rank.set(n.id, 0);
    }
  }

  // 3. 按 rank 分层并计算网格坐标
  const layers = new Map<number, Node[]>();
  for (const node of nodes) {
    const r = rank.get(node.id) ?? 0;
    if (!layers.has(r)) layers.set(r, []);
    layers.get(r)?.push(node);
  }

  const COLUMN_WIDTH = 340;
  const ROW_HEIGHT = 85;
  const X_OFFSET = 50;
  const Y_OFFSET = 40;

  const layoutedNodes: Node[] = [];
  const sortedRanks = Array.from(layers.keys()).sort((a, b) => a - b);

  for (const r of sortedRanks) {
    const colNodes = layers.get(r) || [];
    colNodes.forEach((node, idx) => {
      layoutedNodes.push({
        ...node,
        position: {
          x: X_OFFSET + r * COLUMN_WIDTH,
          y: Y_OFFSET + idx * ROW_HEIGHT,
        },
      });
    });
  }

  return layoutedNodes;
}

export function TopologyGraph({ manifest }: { manifest: string }) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    if (!manifest) return;
    fetch(`/api/graph?manifest=${encodeURIComponent(manifest)}`)
      .then((res) => res.json())
      .then((data: { nodes: Node[]; edges: Edge[] }) => {
        const layoutedNodes = autoLayout(data.nodes || [], data.edges || []);
        setNodes(layoutedNodes);
        setEdges(data.edges || []);
      })
      .catch((err) => {
        console.error('获取拓扑数据失败:', err);
      });
  }, [manifest, setNodes, setEdges]);

  if (!manifest) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-slate-500 font-mono">
        请在左侧选择清单以查看其依赖拓扑图
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-slate-950">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.2}
        maxZoom={1.5}
        colorMode="dark"
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#334155" />
        <Controls />
      </ReactFlow>
    </div>
  );
}
