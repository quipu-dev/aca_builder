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
import { AlertTriangle, CheckCircle, Cpu, Loader2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import '@xyflow/react/dist/style.css';
import { AtomNode, LookupNode, ManifestNode } from './CustomNodes';

const nodeTypes = {
  manifestNode: ManifestNode,
  lookupNode: LookupNode,
  atomNode: AtomNode,
};

interface LayoutResult {
  nodes: Node[];
  hasCycle: boolean;
  cycleNodes: string[];
}

function autoLayoutSafe(nodes: Node[], edges: Edge[]): LayoutResult {
  if (nodes.length === 0) return { nodes: [], hasCycle: false, cycleNodes: [] };

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

  const rank = new Map<string, number>();
  const queue: string[] = [];
  const nodeVisitCount = new Map<string, number>();

  // 入度为 0 的节点作为初始源点 (如 Manifest)
  for (const [id, deg] of inDegree.entries()) {
    if (deg === 0) {
      rank.set(id, 0);
      queue.push(id);
      nodeVisitCount.set(id, 1);
    }
  }

  if (queue.length === 0 && nodes.length > 0) {
    rank.set(nodes[0].id, 0);
    queue.push(nodes[0].id);
    nodeVisitCount.set(nodes[0].id, 1);
  }

  let hasCycle = false;
  const cycleNodesSet = new Set<string>();
  const maxAllowedDepth = nodes.length; // 任何 DAG 的深度不可能超过总节点数
  let steps = 0;
  const MAX_STEPS = nodes.length * 5;

  while (queue.length > 0 && steps < MAX_STEPS) {
    steps++;
    const u = queue.shift();
    if (!u) continue;
    const currRank = rank.get(u) || 0;

    for (const v of adj.get(u) || []) {
      const nextRank = currRank + 1;

      // 环路死循环熔断保护：深度超过节点总数说明已陷入循环回路
      if (nextRank >= maxAllowedDepth) {
        hasCycle = true;
        cycleNodesSet.add(v);
        continue;
      }

      const targetRank = rank.get(v);
      if (targetRank === undefined || targetRank < nextRank) {
        rank.set(v, nextRank);
        const count = (nodeVisitCount.get(v) || 0) + 1;
        nodeVisitCount.set(v, count);

        // 如果单个节点被回推入队次数过多，熔断以保护浏览器主线程
        if (count < 4) {
          queue.push(v);
        } else {
          hasCycle = true;
          cycleNodesSet.add(v);
        }
      }
    }
  }

  // 处理未连通或孤立节点
  for (const n of nodes) {
    if (!rank.has(n.id)) {
      rank.set(n.id, 0);
    }
  }

  const layers = new Map<number, Node[]>();
  for (const node of nodes) {
    const r = rank.get(node.id) ?? 0;
    if (!layers.has(r)) layers.set(r, []);
    layers.get(r)?.push(node);
  }

  const COLUMN_WIDTH = 340;
  const ROW_HEIGHT = 90;
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

  return {
    nodes: layoutedNodes,
    hasCycle,
    cycleNodes: Array.from(cycleNodesSet),
  };
}

export interface LookupAdhocParam {
  key: string;
  selectors: Array<Record<string, unknown>>;
  package?: string;
  pillar?: string;
}

export const TopologyGraph = React.memo(function TopologyGraph({
  manifest,
  imports,
  overrides,
  lookupAdhoc,
  onSelectAtom,
}: {
  manifest?: string;
  imports?: Array<{ lookup: string }>;
  overrides?: Record<string, unknown>;
  lookupAdhoc?: LookupAdhocParam;
  onSelectAtom?: (atomId: string) => void;
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [telemetry, setTelemetry] = useState<{
    nodeCount: number;
    edgeCount: number;
    layoutMs: number;
    hasCycle: boolean;
  } | null>(null);

  useEffect(() => {
    let isCancelled = false;

    // 设立 200ms 防抖，当用户连续拖拽增删或快速输入覆盖选择器时避免密集运算
    const timer = setTimeout(() => {
      setLoading(true);
      setErrorMsg('');

      const fetchPromise =
        lookupAdhoc !== undefined
          ? fetch('/api/lookups/graph-adhoc', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(lookupAdhoc),
            })
          : imports !== undefined
            ? fetch('/api/graph/adhoc', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  name: manifest || 'draft',
                  imports: imports,
                  overrides: overrides && Object.keys(overrides).length > 0 ? overrides : undefined,
                }),
              })
            : manifest
              ? fetch(`/api/graph?manifest=${encodeURIComponent(manifest)}`)
              : null;

      if (!fetchPromise) {
        setLoading(false);
        return;
      }

      fetchPromise
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP 状态码 ${res.status}: 获取拓扑失败`);
          return res.json();
        })
        .then((data: { nodes: Node[]; edges: Edge[] }) => {
          if (isCancelled) return;
          const tFetch = performance.now();

          // 执行防死循环布局
          const layoutRes = autoLayoutSafe(data.nodes || [], data.edges || []);
          const tLayout = performance.now();
          const layoutDuration = tLayout - tFetch;

          const connectedNodes = layoutRes.nodes.map((n) => {
            if (n.type === 'atomNode') {
              return {
                ...n,
                data: {
                  ...n.data,
                  onEdit: onSelectAtom,
                },
              };
            }
            return n;
          });

          setNodes(connectedNodes);
          setEdges(data.edges || []);
          setTelemetry({
            nodeCount: connectedNodes.length,
            edgeCount: (data.edges || []).length,
            layoutMs: Math.round(layoutDuration),
            hasCycle: layoutRes.hasCycle,
          });
        })
        .catch((err) => {
          if (isCancelled) return;
          setErrorMsg(err.message || '加载拓扑图异常');
        })
        .finally(() => {
          if (!isCancelled) setLoading(false);
        });
    }, 200);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [manifest, imports, overrides, lookupAdhoc, onSelectAtom, setNodes, setEdges]);

  if (!manifest && (!imports || imports.length === 0) && !lookupAdhoc) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-slate-500 font-mono">
        请选择或添加组件以呈现拓扑关系
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-slate-950 relative overflow-hidden">
      {/* 顶部遥测与健康状态监视条 */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-2 bg-slate-900/90 border border-slate-800 backdrop-blur px-3 py-1.5 rounded-md font-mono text-[11px] shadow-lg">
        {loading ? (
          <span className="flex items-center gap-1.5 text-indigo-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> 计算依赖拓扑...
          </span>
        ) : errorMsg ? (
          <span className="flex items-center gap-1 text-rose-400">
            <AlertTriangle className="h-3.5 w-3.5" /> {errorMsg}
          </span>
        ) : telemetry ? (
          <div className="flex items-center gap-3 text-slate-300">
            <span className="flex items-center gap-1 text-slate-400">
              <Cpu className="h-3.5 w-3.5 text-indigo-400" />
              节点: <strong className="text-slate-100">{telemetry.nodeCount}</strong>
            </span>
            <span>
              边: <strong className="text-slate-100">{telemetry.edgeCount}</strong>
            </span>
            <span className="text-slate-500">{telemetry.layoutMs}ms</span>
            {telemetry.hasCycle ? (
              <span className="flex items-center gap-1 text-amber-400 bg-amber-950/60 border border-amber-800/80 px-1.5 py-0.2 rounded font-bold">
                <AlertTriangle className="h-3 w-3" /> 检测到循环依赖
              </span>
            ) : (
              <span className="flex items-center gap-1 text-emerald-400">
                <CheckCircle className="h-3 w-3" /> DAG 良好
              </span>
            )}
          </div>
        ) : null}
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.15}
        maxZoom={1.5}
        colorMode="dark"
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#334155" />
        <Controls />
      </ReactFlow>
    </div>
  );
});
