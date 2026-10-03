import dagre from '@dagrejs/dagre';
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

function getDagreLayoutedElements(nodes: Node[], edges: Edge[], direction = 'LR') {
  if (nodes.length === 0) return { nodes: [], edges: [] };

  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: 35,
    ranksep: 70,
    marginx: 40,
    marginy: 40,
  });

  for (const node of nodes) {
    const width = node.type === 'manifestNode' ? 220 : node.type === 'lookupNode' ? 240 : 220;
    const height = node.type === 'manifestNode' ? 95 : node.type === 'lookupNode' ? 85 : 80;
    dagreGraph.setNode(node.id, { width, height });
  }

  for (const edge of edges) {
    dagreGraph.setEdge(edge.source, edge.target);
  }

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPos = dagreGraph.node(node.id);
    const width = node.type === 'manifestNode' ? 220 : node.type === 'lookupNode' ? 240 : 220;
    const height = node.type === 'manifestNode' ? 95 : node.type === 'lookupNode' ? 85 : 80;

    return {
      ...node,
      position: {
        x: nodeWithPos.x - width / 2,
        y: nodeWithPos.y - height / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
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
  onSelectLookup,
}: {
  manifest?: string;
  imports?: Array<{ lookup: string }>;
  overrides?: Record<string, unknown>;
  lookupAdhoc?: LookupAdhocParam;
  onSelectAtom?: (atomId: string) => void;
  onSelectLookup?: (lookupKey: string) => void;
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [telemetry, setTelemetry] = useState<{
    nodeCount: number;
    edgeCount: number;
    layoutMs: number;
  } | null>(null);

  useEffect(() => {
    let isCancelled = false;

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

          const layoutRes = getDagreLayoutedElements(data.nodes || [], data.edges || []);
          const layoutDuration = performance.now() - tFetch;

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
            if (n.type === 'lookupNode') {
              return {
                ...n,
                data: {
                  ...n.data,
                  onEdit: onSelectLookup,
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
  }, [manifest, imports, overrides, lookupAdhoc, onSelectAtom, onSelectLookup, setNodes, setEdges]);

  if (!manifest && (!imports || imports.length === 0) && !lookupAdhoc) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-slate-500 font-mono">
        请选择或添加组件以呈现拓扑关系
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-slate-950 relative overflow-hidden">
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
            <span className="flex items-center gap-1 text-emerald-400">
              <CheckCircle className="h-3 w-3" /> DAG 良好
            </span>
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
